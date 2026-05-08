from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_store, optional_user, require_user
from app.core.ids import new_id

router = APIRouter()


def can_read_trip(plan: dict, user: dict | None) -> bool:
    if plan.get("status") == "accepted" and plan.get("visibility") == "public":
        return True
    if user and plan.get("owner_id") == user["id"]:
        return True
    return False


@router.get("/{trip_plan_id}")
async def get_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(optional_user)):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    if not can_read_trip(plan, user):
        raise HTTPException(status_code=403, detail="You cannot access this Trip Plan")
    return {"trip_plan": plan}


@router.post("/{trip_plan_id}/like")
async def like_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(require_user)):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan or not can_read_trip(plan, user):
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    existing = await store.find_one("likes", user_id=user["id"], trip_plan_id=trip_plan_id)
    if existing:
        return {"liked": True, "like": existing}
    like = await store.save_doc(
        "likes", {"id": new_id("like"), "user_id": user["id"], "trip_plan_id": trip_plan_id}
    )
    return {"liked": True, "like": like}


@router.delete("/{trip_plan_id}/like")
async def unlike_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(require_user)):
    existing = await store.find_one("likes", user_id=user["id"], trip_plan_id=trip_plan_id)
    if existing:
        await store.delete_doc("likes", existing["id"])
    return {"liked": False}
