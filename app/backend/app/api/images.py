from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_store, require_user

router = APIRouter()


@router.get("/{image_id}")
async def get_image_metadata(image_id: str, store=Depends(get_store), user=Depends(require_user)):
    image = await store.find_one("uploadedImages", id=image_id)
    if not image or image["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"image": image}
