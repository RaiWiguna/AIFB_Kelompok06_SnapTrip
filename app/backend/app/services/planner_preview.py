from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.categories import validate_categories
from app.services.trip_detail import (
    destination_from_recommendation,
    format_idr,
    synthesize_budget_categories,
    synthesize_budget_daily,
    synthesize_gallery,
    synthesize_itinerary,
    synthesize_memo,
)


async def planner_preview_display(store, session_id: str, user: dict[str, Any]) -> dict[str, Any]:
    session = await store.find_one("tripCreationSessions", id=session_id)
    if not session or session.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Trip creation session not found")

    selected_ids = list(session.get("selected_recommendation_ids") or [])
    if not selected_ids:
        raise HTTPException(status_code=422, detail="Select destinations before opening the planner preview")

    selected_items = []
    for item_id in selected_ids:
        item = await store.find_one("recommendationItems", id=item_id)
        if not item or item.get("owner_id") != user["id"] or item.get("session_id") != session_id:
            raise HTTPException(status_code=422, detail="Selected recommendations are no longer available")
        selected_items.append(item)
    selected_items = sorted(selected_items, key=lambda item: item.get("rank", 999))

    categories = session_categories(session, selected_items)
    title = preview_title(selected_items)
    total = sum(((item.get("estimated_cost") or {}).get("amount_idr") or 0) for item in selected_items)
    destinations = [
        destination_from_recommendation(item, index)
        for index, item in enumerate(selected_items, start=1)
    ]
    plan = {
        "id": session_id,
        "title": title,
        "owner_id": user["id"],
        "categories": categories,
        "duration_days": max(len(destinations), 1),
        "estimated_budget_idr": total or None,
    }

    memo = synthesize_memo(plan, destinations)
    return {
        "session_id": session_id,
        "title": title,
        "status": "planner_preview",
        "categories": categories,
        "source": "selected_recommendations",
        "documents": {
            "persisted": False,
            "schema_versions": [],
            "note": "Preview data is deterministic and is not a saved planner document.",
        },
        "destinations": destinations,
        "memo": memo,
        "itinerary": synthesize_itinerary(destinations),
        "budget": {
            "categories": synthesize_budget_categories(plan, selected_items, destinations),
            "daily": synthesize_budget_daily(selected_items, destinations),
            "total_amount": format_idr(total or None),
            "total_label": f"per person - {max(len(destinations), 1)} days",
        },
        "gallery": synthesize_gallery(plan, destinations),
        "acceptance": {
            "enabled": False,
            "reason": "Trip acceptance, invites, and participants are implemented in the later planner flow.",
        },
    }


def session_categories(session: dict[str, Any], selected_items: list[dict[str, Any]]) -> list[str]:
    try:
        return validate_categories(list(session.get("confirmed_categories") or []))
    except ValueError:
        categories = []
        for item in selected_items:
            for category in item.get("categories", []):
                if category not in categories:
                    categories.append(category)
        return validate_categories(categories)


def preview_title(selected_items: list[dict[str, Any]]) -> str:
    first = selected_items[0].get("name") or "Selected destination"
    remaining = len(selected_items) - 1
    if remaining <= 0:
        return f"{first} planner preview"
    return f"{first} + {remaining} stop{'s' if remaining > 1 else ''} planner preview"
