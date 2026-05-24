from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_store, optional_user, require_user
from app.core.ids import new_id
from app.schemas.planner import Visibility
from app.services.trip_detail import trip_detail_display

router = APIRouter()


class TripVisibilityRequest(BaseModel):
    visibility: Visibility


async def can_read_trip(store, plan: dict, user: dict | None) -> bool:
    if plan.get("status") == "accepted" and plan.get("visibility") == "public":
        return True
    if user and plan.get("owner_id") == user["id"]:
        return True
    if user and plan.get("visibility") == "invite_only":
        participant = await store.find_one(
            "tripParticipants",
            trip_plan_id=plan["id"],
            user_id=user["id"],
            status="active",
        )
        if participant:
            return True
    return False


@router.get("/{trip_plan_id}")
async def get_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(optional_user)):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    if not await can_read_trip(store, plan, user):
        raise HTTPException(status_code=403, detail="You cannot access this Trip Plan")
    return {"trip_plan": plan}


@router.get("/{trip_plan_id}/detail")
async def get_trip_plan_detail(
    trip_plan_id: str,
    store=Depends(get_store),
    user=Depends(optional_user),
):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    if not await can_read_trip(store, plan, user):
        raise HTTPException(status_code=403, detail="You cannot access this Trip Plan")
    return {
        "detail": await trip_detail_display(
            store,
            plan,
            viewer_id=user["id"] if user else None,
        )
    }


@router.post("/{trip_plan_id}/like")
async def like_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(require_user)):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan or not await can_read_trip(store, plan, user):
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    existing = await store.find_one("likes", user_id=user["id"], trip_plan_id=trip_plan_id)
    if existing:
        return {"liked": True, "like": existing}
    like = await store.save_doc(
        "likes", {"id": new_id("like"), "user_id": user["id"], "trip_plan_id": trip_plan_id}
    )
    return {"liked": True, "like": like}


@router.patch("/{trip_plan_id}/visibility")
async def update_trip_visibility(
    trip_plan_id: str,
    payload: TripVisibilityRequest,
    store=Depends(get_store),
    user=Depends(require_user),
):
    plan = await store.find_one("tripPlans", id=trip_plan_id)
    if not plan or plan.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Trip Plan not found")
    if plan.get("status") != "accepted":
        raise HTTPException(status_code=422, detail="Only accepted Trip Plans can be published")
    updated = await store.update_doc("tripPlans", trip_plan_id, {"visibility": payload.visibility})
    return {"trip_plan": updated}


@router.delete("/{trip_plan_id}/like")
async def unlike_trip_plan(trip_plan_id: str, store=Depends(get_store), user=Depends(require_user)):
    existing = await store.find_one("likes", user_id=user["id"], trip_plan_id=trip_plan_id)
    if existing:
        await store.delete_doc("likes", existing["id"])
    return {"liked": False}
