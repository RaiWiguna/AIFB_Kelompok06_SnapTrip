from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

PUBLIC_IMAGE_FALLBACKS = {
    "pantai": "/landing/diamond-beach.png",
    "gunung": "/landing/bromo-tengger.png",
    "air_terjun": "/landing/bali-coastal-pano.png",
    "wisata_tradisional": "/landing/bali-woman-temple.png",
}
DEFAULT_IMAGE_FALLBACK = "/placeholder.jpg"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "collection"


def collection_slug(collection: dict[str, Any]) -> str:
    existing = collection.get("slug")
    if existing:
        return existing
    suffix = collection["id"].replace("col_", "")[:8]
    return f"{slugify(collection.get('name', 'collection'))}-{suffix}"


def image_url(image_id: str | None, categories: list[str] | None = None) -> str:
    if image_id:
        return f"/api/images/{image_id}"
    for category in categories or []:
        fallback = PUBLIC_IMAGE_FALLBACKS.get(category)
        if fallback:
            return fallback
    return DEFAULT_IMAGE_FALLBACK


def format_updated_label(value: Any) -> str:
    if not isinstance(value, datetime):
        return "Updated recently"
    current = datetime.now(UTC)
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    days = max((current - value).days, 0)
    if days == 0:
        return "Updated today"
    if days == 1:
        return "Updated yesterday"
    if days < 7:
        return f"Updated {days} days ago"
    weeks = days // 7
    if weeks == 1:
        return "Updated 1 week ago"
    return f"Updated {weeks} weeks ago"


def format_joined_label(value: Any) -> str:
    if isinstance(value, datetime):
        return f"Joined {value.strftime('%b %Y')}"
    return "Joined recently"


async def owner_display(store, owner_id: str) -> dict[str, Any]:
    owner = await store.find_one("users", id=owner_id)
    name = owner.get("display_name", "SnapTrip traveler") if owner else "SnapTrip traveler"
    return {
        "id": owner_id,
        "name": name,
        "avatar_url": f"https://api.dicebear.com/7.x/notionists/svg?seed={name}",
        "verified": bool(owner),
    }


async def trip_card_display(
    store,
    plan: dict[str, Any],
    *,
    viewer_id: str | None = None,
) -> dict[str, Any]:
    likes = await store.list_docs("likes", trip_plan_id=plan["id"])
    saves = await store.list_docs("collectionItems", trip_plan_id=plan["id"])
    viewer_like = None
    if viewer_id:
        viewer_like = await store.find_one("likes", user_id=viewer_id, trip_plan_id=plan["id"])
    categories = plan.get("categories", [])
    return {
        "id": plan["id"],
        "title": plan.get("title", "Untitled trip"),
        "owner_id": plan["owner_id"],
        "owner_display": await owner_display(store, plan["owner_id"]),
        "categories": categories,
        "cover_image_id": plan.get("cover_image_id"),
        "source_image_id": plan.get("cover_image_id"),
        "cover_url": image_url(plan.get("cover_image_id"), categories),
        "region": plan.get("region") or plan.get("destination_region") or "Indonesia",
        "duration_days": plan.get("duration_days") or plan.get("days") or 1,
        "estimated_budget_idr": plan.get("estimated_budget_idr"),
        "like_count": len(likes),
        "save_count": len(saves),
        "editor_pick": bool(plan.get("editor_pick")),
        "viewer": {"liked": bool(viewer_like)},
    }


async def visible_public_trip_cards(
    store,
    plans: list[dict[str, Any]],
    *,
    viewer_id: str | None = None,
) -> list[dict[str, Any]]:
    cards = []
    for plan in plans:
        if plan.get("status") == "accepted" and plan.get("visibility") == "public":
            cards.append(await trip_card_display(store, plan, viewer_id=viewer_id))
    return cards


async def collection_card_display(store, collection: dict[str, Any]) -> dict[str, Any]:
    items = await store.list_docs("collectionItems", collection_id=collection["id"])
    plans = []
    categories: list[str] = []
    for item in items:
        plan = await store.find_one("tripPlans", id=item["trip_plan_id"])
        if plan and plan.get("status") == "accepted" and plan.get("visibility") == "public":
            plans.append(plan)
            categories.extend(plan.get("categories", []))
    cover_grid = [image_url(plan.get("cover_image_id"), plan.get("categories", [])) for plan in plans[:4]]
    while len(cover_grid) < 4:
        cover_grid.append(image_url(None, categories))
    return {
        "id": collection["id"],
        "slug": collection_slug(collection),
        "name": collection.get("name", "Untitled collection"),
        "description": collection.get("description") or "Saved public trips for future planning.",
        "count": len(items),
        "cover_url": cover_grid[0] if cover_grid else image_url(None, categories),
        "cover_grid_urls": cover_grid,
        "visibility": collection.get("visibility", "private"),
        "updated_label": format_updated_label(collection.get("updated_at")),
    }


async def collection_detail_display(
    store,
    collection: dict[str, Any],
    *,
    viewer_id: str,
) -> dict[str, Any]:
    card = await collection_card_display(store, collection)
    items = await store.list_docs("collectionItems", collection_id=collection["id"])
    plans = []
    for item in items:
        plan = await store.find_one("tripPlans", id=item["trip_plan_id"])
        if plan and plan.get("status") == "accepted" and plan.get("visibility") == "public":
            plans.append(plan)
    trip_cards = [await trip_card_display(store, plan, viewer_id=viewer_id) for plan in plans]
    category_ids = sorted({category for plan in plans for category in plan.get("categories", [])})
    detail = {
        **card,
        "title": card["name"],
        "region": collection.get("region") or "Indonesia",
        "category_ids": category_ids,
        "saves_label": str(sum(trip["save_count"] for trip in trip_cards)),
        "trip_ids": [trip["id"] for trip in trip_cards],
        "trips": trip_cards,
    }
    return detail


async def find_collection_by_slug_or_id(store, owner_id: str, slug_or_id: str) -> dict[str, Any] | None:
    direct = await store.find_one("collections", id=slug_or_id, owner_id=owner_id)
    if direct:
        return direct
    collections = await store.list_docs("collections", owner_id=owner_id)
    for collection in collections:
        if collection_slug(collection) == slug_or_id:
            return collection
    return None


async def my_trip_display(plan: dict[str, Any], *, owner_name: str, joined_as: str = "owner") -> dict[str, Any]:
    categories = plan.get("categories", [])
    return {
        "id": plan["id"],
        "title": plan.get("title", "Untitled trip"),
        "cover_url": image_url(plan.get("cover_image_id"), categories),
        "categories": categories,
        "days": plan.get("duration_days") or 1,
        "estimated_budget_idr": plan.get("estimated_budget_idr"),
        "visibility": plan.get("visibility", "private"),
        "status": plan.get("status", "draft"),
        "updated_label": format_updated_label(plan.get("updated_at")),
        "participants": plan.get("participant_count", 1),
        "owner_name": owner_name,
        "joined_as": joined_as,
    }
