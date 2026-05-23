from fastapi import APIRouter, Depends

from app.api.auth import public_user
from app.api.deps import get_store, require_user
from app.services.display import format_joined_label, my_trip_display

router = APIRouter()


@router.get("/summary")
async def account_summary(store=Depends(get_store), user=Depends(require_user)):
    owned_plans = await store.list_docs("tripPlans", owner_id=user["id"])
    collections = await store.list_docs("collections", owner_id=user["id"])
    likes = await store.list_docs("likes", user_id=user["id"])
    recent_owned = sorted(
        owned_plans,
        key=lambda plan: plan.get("updated_at") or plan.get("created_at"),
        reverse=True,
    )[:3]
    owner_name = user.get("display_name", "You")
    return {
        "user": {
            **public_user(user),
            "avatar_url": f"https://api.dicebear.com/7.x/notionists/svg?seed={owner_name}",
            "joined_label": format_joined_label(user.get("created_at")),
            "bio": user.get("bio") or "Planning memorable trips across Indonesia.",
        },
        "stats": {
            "owned_trips": len(owned_plans),
            "joined_trips": 0,
            "collections": len(collections),
            "liked_trips": len(likes),
        },
        "recent_owned_trips": [
            await my_trip_display(plan, owner_name=owner_name, joined_as="owner")
            for plan in recent_owned
        ],
        "joined_trips": [],
    }
