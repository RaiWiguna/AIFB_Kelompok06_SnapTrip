from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import Response

from app.api.deps import get_store, optional_user

router = APIRouter()


@router.get("/{image_id}")
async def get_image(image_id: str, store=Depends(get_store), user=Depends(optional_user)):
    image = await store.find_one("uploadedImages", id=image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    owner_can_read = bool(user and image["owner_id"] == user["id"])
    public_cover = False
    plans = await store.list_docs("tripPlans", cover_image_id=image_id)
    for plan in plans:
        if plan.get("status") == "accepted" and plan.get("visibility") == "public":
            public_cover = True
            break
    if not owner_can_read and not public_cover:
        raise HTTPException(status_code=404, detail="Image not found")
    data = await store.get_image_bytes(image_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=data, media_type=image.get("content_type") or "application/octet-stream")
