import re
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import get_settings_from_app, get_store, require_user
from app.services.recommendations import RecommendationService

router = APIRouter()
PLACE_PHOTO_RESOURCE_RE = re.compile(r"^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$")


def build_place_photo_media_url(provider_photo_name: str) -> str | None:
    if not PLACE_PHOTO_RESOURCE_RE.fullmatch(provider_photo_name):
        return None
    parts = provider_photo_name.split("/")
    encoded = "/".join(quote(part, safe="") for part in parts)
    return f"https://places.googleapis.com/v1/{encoded}/media"


def get_recommendation_service(store=Depends(get_store), settings=Depends(get_settings_from_app)):
    return RecommendationService(store=store, settings=settings)


@router.get("/recommendation-runs/{run_id}")
async def get_recommendation_run(
    run_id: str,
    service: RecommendationService = Depends(get_recommendation_service),
    user=Depends(require_user),
):
    return await service.get_run(run_id, user)


@router.get("/place-photos/{photo_id}")
async def get_place_photo_descriptor(
    photo_id: str,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
    user=Depends(require_user),
):
    enrichments = await store.list_docs("placeEnrichments")
    for enrichment in enrichments:
        for photo in enrichment.get("photo_snaps", []):
            if photo.get("photo_id") == photo_id:
                provider_photo_name = photo.get("provider_photo_name")
                descriptor = {
                    "photo": {
                        "id": photo_id,
                        "provider": "google_places",
                        "attribution": photo.get("attribution"),
                        "width_px": photo.get("width_px"),
                        "height_px": photo.get("height_px"),
                    }
                }
                if settings.use_google_places and settings.google_places_api_key and provider_photo_name:
                    media_url = build_place_photo_media_url(provider_photo_name)
                    if not media_url:
                        return descriptor
                    try:
                        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.ai_provider_timeout_seconds)) as client:
                            media = await client.get(
                                media_url,
                                headers={"X-Goog-Api-Key": settings.google_places_api_key},
                                params={
                                    "maxWidthPx": 1200,
                                    "maxHeightPx": 900,
                                },
                                follow_redirects=True,
                            )
                            media.raise_for_status()
                            return Response(
                                content=media.content,
                                media_type=media.headers.get("content-type") or "image/jpeg",
                            )
                    except httpx.HTTPError as exc:
                        raise HTTPException(status_code=502, detail="Place photo could not be fetched") from exc
                return descriptor
    raise HTTPException(status_code=404, detail="Place photo not found")
