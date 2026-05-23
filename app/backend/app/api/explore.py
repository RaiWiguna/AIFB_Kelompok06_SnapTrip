from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_store, optional_user
from app.core.categories import CATEGORY_IDS
from app.services.display import trip_card_display

router = APIRouter()


@router.get("")
async def explore(
    category: list[str] = Query(default=[]),
    limit: int = Query(default=20, ge=1, le=50),
    store=Depends(get_store),
    user=Depends(optional_user),
):
    for item in category:
        if item not in CATEGORY_IDS:
            raise HTTPException(status_code=422, detail=f"Unknown category id: {item}")
    plans = await store.list_docs("tripPlans")
    visible = []
    for plan in plans:
        if plan.get("status") != "accepted" or plan.get("visibility") != "public":
            continue
        if category and not set(category).intersection(set(plan.get("categories", []))):
            continue
        visible.append(await trip_card_display(store, plan, viewer_id=user["id"] if user else None))
    return {"items": visible[:limit], "next_cursor": None}
