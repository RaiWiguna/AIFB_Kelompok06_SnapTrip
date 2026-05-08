from fastapi import APIRouter

from app.core.categories import CANONICAL_CATEGORIES

router = APIRouter()


@router.get("")
async def list_categories():
    return {"categories": list(CANONICAL_CATEGORIES)}
