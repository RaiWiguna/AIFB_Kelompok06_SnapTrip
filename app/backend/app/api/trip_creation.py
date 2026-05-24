from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.api.deps import get_settings_from_app, get_store, require_user
from app.core.categories import validate_categories
from app.core.ids import new_id
from app.schemas.api import ConfirmCategoriesRequest, TripCreationSessionCreateRequest
from app.schemas.recommendations import SelectedRecommendationsRequest
from app.services.classifier import (
    ClassifierError,
    InvalidClassifierImageError,
    aggregate_predictions,
    get_classifier,
)
from app.services.recommendations import RecommendationService

router = APIRouter()


def validate_image_bytes(data: bytes) -> None:
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
    except (SyntaxError, UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=422, detail="Image file is invalid or corrupted") from exc


async def get_owned_session(session_id: str, store, user):
    session = await store.find_one("tripCreationSessions", id=session_id)
    if not session or session["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Trip creation session not found")
    return session


def image_display(image: dict[str, Any], source: str) -> dict[str, Any]:
    return {
        "id": image["id"],
        "filename": image.get("filename") or image["id"],
        "content_type": image.get("content_type"),
        "size_bytes": image.get("size_bytes", 0),
        "url": f"/api/images/{image['id']}",
        "source": source,
    }


async def image_is_public_cover(store, image_id: str) -> bool:
    plans = await store.list_docs("tripPlans", cover_image_id=image_id)
    return any(plan.get("status") == "accepted" and plan.get("visibility") == "public" for plan in plans)


async def get_session_images(store, session: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    uploaded = []
    for image_id in session.get("image_ids", []):
        image = await store.find_one("uploadedImages", id=image_id)
        if image:
            uploaded.append(image_display(image, "upload"))

    source_images = []
    seen_source_ids = set()
    for ref in session.get("source_image_refs", []):
        image_id = ref.get("image_id")
        if not image_id or image_id in seen_source_ids:
            continue
        seen_source_ids.add(image_id)
        image = await store.find_one("uploadedImages", id=image_id)
        if image:
            source_images.append(image_display(image, ref.get("source") or "saved_or_liked_trip_plan"))
    return uploaded, source_images


async def latest_classification(store, session_id: str, owner_id: str) -> dict[str, Any] | None:
    results = await store.list_docs("classificationResults", session_id=session_id, owner_id=owner_id)
    if not results:
        return None
    return sorted(results, key=lambda item: item.get("updated_at") or item.get("created_at"), reverse=True)[0]


async def latest_recommendations(store, session: dict[str, Any]) -> dict[str, Any] | None:
    run = None
    latest_run_id = session.get("latest_recommendation_run_id")
    if latest_run_id:
        run = await store.find_one("recommendationRuns", id=latest_run_id, owner_id=session["owner_id"])
    if not run:
        runs = await store.list_docs("recommendationRuns", session_id=session["id"], owner_id=session["owner_id"])
        if runs:
            run = sorted(runs, key=lambda item: item.get("updated_at") or item.get("created_at"), reverse=True)[0]
    if not run:
        return None
    items = await store.list_docs("recommendationItems", run_id=run["id"], owner_id=session["owner_id"])
    return {"run": run, "items": sorted(items, key=lambda item: item["rank"])}


async def session_display(store, session: dict[str, Any]) -> dict[str, Any]:
    uploaded, source_images = await get_session_images(store, session)
    return {
        **session,
        "uploaded_images": uploaded,
        "source_images": source_images,
        "images": [*uploaded, *source_images],
        "classification": await latest_classification(store, session["id"], session["owner_id"]),
        "latest_recommendations": await latest_recommendations(store, session),
    }


@router.post("", status_code=201)
async def create_trip_session(
    payload: TripCreationSessionCreateRequest,
    store=Depends(get_store),
    user=Depends(require_user),
):
    session = await store.save_doc(
        "tripCreationSessions",
        {
            "id": new_id("tcs"),
            "owner_id": user["id"],
            "source": payload.source,
            "status": "created",
            "image_ids": [],
            "source_image_refs": [],
            "predicted_categories": [],
            "confirmed_categories": [],
            "selected_recommendation_ids": [],
        },
    )
    return {"session": await session_display(store, session)}


@router.get("/{session_id}")
async def get_trip_session(
    session_id: str,
    store=Depends(get_store),
    user=Depends(require_user),
):
    session = await get_owned_session(session_id, store, user)
    return {"session": await session_display(store, session)}


@router.post("/{session_id}/images")
async def upload_images(
    session_id: str,
    files: list[UploadFile] = File(...),
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    session = await get_owned_session(session_id, store, user)
    if len(files) < 1 or len(files) > settings.max_upload_images:
        raise HTTPException(status_code=422, detail=f"Upload between 1 and {settings.max_upload_images} images")
    total_images = (
        len(session.get("image_ids", []))
        + len(session.get("source_image_refs", []))
        + len(files)
    )
    if total_images > settings.max_upload_images:
        raise HTTPException(
            status_code=422,
            detail=f"A trip creation session can use at most {settings.max_upload_images} images",
        )
    uploaded = []
    for file in files:
        if file.content_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(status_code=422, detail="Only JPG and PNG images are supported")
        data = await file.read()
        if len(data) > settings.max_upload_image_bytes:
            raise HTTPException(status_code=413, detail="Image is too large")
        validate_image_bytes(data)
        uploaded.append(await store.save_image(user["id"], file, data))
    image_ids = [*session.get("image_ids", []), *[image["id"] for image in uploaded]]
    updated = await store.update_doc(
        "tripCreationSessions", session_id, {"image_ids": image_ids, "status": "images_uploaded"}
    )
    return {"session": updated, "images": uploaded}


@router.post("/{session_id}/source-images")
async def add_source_images(
    session_id: str,
    image_ids: list[str],
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    session = await get_owned_session(session_id, store, user)
    refs = list(session.get("source_image_refs", []))
    existing_ids = {ref.get("image_id") for ref in refs}
    for image_id in image_ids:
        image = await store.find_one("uploadedImages", id=image_id)
        if not image:
            raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")
        owner_can_use = image.get("owner_id") == user["id"]
        public_cover = await image_is_public_cover(store, image_id)
        if not owner_can_use and not public_cover:
            raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")
        if image_id not in existing_ids:
            refs.append({"image_id": image_id, "source": "saved_or_liked_trip_plan"})
            existing_ids.add(image_id)
    total_images = len(session.get("image_ids", [])) + len(refs)
    if total_images > settings.max_upload_images:
        raise HTTPException(
            status_code=422,
            detail=f"A trip creation session can use at most {settings.max_upload_images} images",
        )
    updated = await store.update_doc(
        "tripCreationSessions",
        session_id,
        {"source_image_refs": refs, "status": "images_selected"},
    )
    return {"session": await session_display(store, updated)}


@router.post("/{session_id}/classify")
async def classify_session(
    session_id: str,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    session = await get_owned_session(session_id, store, user)
    images = []
    for image_id in session.get("image_ids", []):
        image = await store.find_one("uploadedImages", id=image_id)
        if image:
            image_bytes = await store.get_image_bytes(image_id)
            if image_bytes:
                image["bytes"] = image_bytes
            images.append(image)
    for ref in session.get("source_image_refs", []):
        image_id = ref.get("image_id")
        if not image_id:
            continue
        image = await store.find_one("uploadedImages", id=image_id)
        if image:
            image_bytes = await store.get_image_bytes(image_id)
            if image_bytes:
                image["bytes"] = image_bytes
            images.append(image)
    if not images:
        raise HTTPException(status_code=422, detail="At least one uploaded image is required")
    classifier = get_classifier(settings)
    try:
        per_image = await classifier.predict(images)
        aggregated = aggregate_predictions(per_image)
    except InvalidClassifierImageError as exc:
        raise HTTPException(status_code=422, detail="Image file is invalid or corrupted") from exc
    except ClassifierError as exc:
        raise HTTPException(status_code=503, detail="Image classification is unavailable") from exc
    result = await store.save_doc(
        "classificationResults",
        {
            "id": new_id("cls"),
            "session_id": session_id,
            "owner_id": user["id"],
            "model_version": settings.classifier_model_version,
            "mode": settings.classifier_mode,
            "per_image": per_image,
            "aggregated": aggregated,
        },
    )
    await store.update_doc(
        "tripCreationSessions",
        session_id,
        {"predicted_categories": aggregated, "status": "classified"},
    )
    return {"classification": result}


@router.post("/{session_id}/confirm-categories")
async def confirm_categories(
    session_id: str,
    payload: ConfirmCategoriesRequest,
    store=Depends(get_store),
    user=Depends(require_user),
):
    await get_owned_session(session_id, store, user)
    try:
        categories = validate_categories(payload.categories)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    session = await store.update_doc(
        "tripCreationSessions",
        session_id,
        {"confirmed_categories": categories, "status": "categories_confirmed"},
    )
    return {"session": await session_display(store, session)}


@router.post("/{session_id}/recommendations")
async def generate_recommendations(
    session_id: str,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    service = RecommendationService(store=store, settings=settings)
    return await service.generate_for_session(session_id, user)


@router.get("/{session_id}/recommendations")
async def list_recommendations(
    session_id: str,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    service = RecommendationService(store=store, settings=settings)
    return {"runs": await service.list_session_runs(session_id, user)}


@router.post("/{session_id}/selected-recommendations")
async def select_recommendations(
    session_id: str,
    payload: SelectedRecommendationsRequest,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    service = RecommendationService(store=store, settings=settings)
    return await service.select_items(session_id, user, payload.recommendation_item_ids)
