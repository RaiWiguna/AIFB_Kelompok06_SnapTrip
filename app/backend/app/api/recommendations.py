from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_settings_from_app, get_store, require_user
from app.services.recommendations import RecommendationService

router = APIRouter()


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
async def get_place_photo_descriptor(photo_id: str, store=Depends(get_store), user=Depends(require_user)):
    enrichments = await store.list_docs("placeEnrichments")
    for enrichment in enrichments:
        for photo in enrichment.get("photo_snaps", []):
            if photo.get("photo_id") == photo_id:
                return {
                    "photo": {
                        "id": photo_id,
                        "provider": "google_places",
                        "attribution": photo.get("attribution"),
                        "width_px": photo.get("width_px"),
                        "height_px": photo.get("height_px"),
                    }
                }
    raise HTTPException(status_code=404, detail="Place photo not found")
