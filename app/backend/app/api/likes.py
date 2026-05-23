from fastapi import APIRouter, Depends

from app.api.deps import get_store, require_user
from app.services.display import trip_card_display

router = APIRouter()


@router.get("/trip-plans")
async def liked_trip_plans(store=Depends(get_store), user=Depends(require_user)):
    likes = await store.list_docs("likes", user_id=user["id"])
    cards = []
    for like in likes:
        plan = await store.find_one("tripPlans", id=like["trip_plan_id"])
        if plan and plan.get("status") == "accepted" and plan.get("visibility") == "public":
            cards.append(await trip_card_display(store, plan, viewer_id=user["id"]))
    return {"items": cards}
