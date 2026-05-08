from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_settings_from_app, get_store, require_user
from app.core.categories import validate_categories
from app.core.ids import new_id
from app.schemas.api import ConfirmCategoriesRequest, TripCreationSessionCreateRequest
from app.services.classifier import aggregate_predictions, get_classifier

router = APIRouter()


async def get_owned_session(session_id: str, store, user):
    session = await store.find_one("tripCreationSessions", id=session_id)
    if not session or session["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Trip creation session not found")
    return session


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
    return {"session": session}


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
    uploaded = []
    for file in files:
        if file.content_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(status_code=422, detail="Only JPG and PNG images are supported")
        data = await file.read()
        if len(data) > settings.max_upload_image_bytes:
            raise HTTPException(status_code=413, detail="Image is too large")
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
    user=Depends(require_user),
):
    session = await get_owned_session(session_id, store, user)
    refs = list(session.get("source_image_refs", []))
    for image_id in image_ids:
        image = await store.find_one("uploadedImages", id=image_id)
        if not image:
            raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")
        refs.append({"image_id": image_id, "source": "saved_or_liked_trip_plan"})
    updated = await store.update_doc("tripCreationSessions", session_id, {"source_image_refs": refs})
    return {"session": updated}


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
            images.append(image)
    if not images:
        raise HTTPException(status_code=422, detail="At least one uploaded image is required")
    classifier = get_classifier(settings)
    per_image = await classifier.predict(images)
    aggregated = aggregate_predictions(per_image)
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
    return {"session": session}
