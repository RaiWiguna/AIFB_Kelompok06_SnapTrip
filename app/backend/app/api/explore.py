from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_store, optional_user
from app.core.categories import CATEGORY_IDS

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
        likes = await store.list_docs("likes", trip_plan_id=plan["id"])
        saves = await store.list_docs("collectionItems", trip_plan_id=plan["id"])
        viewer_like = None
        if user:
            viewer_like = await store.find_one("likes", user_id=user["id"], trip_plan_id=plan["id"])
        visible.append(
            {
                "id": plan["id"],
                "title": plan["title"],
                "owner_id": plan["owner_id"],
                "categories": plan.get("categories", []),
                "cover_image_id": plan.get("cover_image_id"),
                "duration_days": plan.get("duration_days"),
                "estimated_budget_idr": plan.get("estimated_budget_idr"),
                "like_count": len(likes),
                "save_count": len(saves),
                "viewer": {"liked": bool(viewer_like)} if user else {"liked": False},
            }
        )
    return {"items": visible[:limit], "next_cursor": None}
