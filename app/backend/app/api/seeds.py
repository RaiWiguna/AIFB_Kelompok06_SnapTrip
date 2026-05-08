from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_store
from app.core.categories import CATEGORY_IDS

router = APIRouter()


@router.get("")
async def destination_seeds(category: list[str] = Query(default=[]), store=Depends(get_store)):
    for item in category:
        if item not in CATEGORY_IDS:
            raise HTTPException(status_code=422, detail=f"Unknown category id: {item}")
    seeds = await store.list_docs("destinationSeeds")
    if category:
        seeds = [
            seed for seed in seeds if set(category).intersection(set(seed.get("categories", [])))
        ]
    return {"seeds": seeds}
