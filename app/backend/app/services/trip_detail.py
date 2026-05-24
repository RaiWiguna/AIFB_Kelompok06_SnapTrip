from __future__ import annotations

from typing import Any

from app.core.categories import CANONICAL_CATEGORIES
from app.services.display import image_url, owner_display, trip_card_display

STATIC_FALLBACKS = [
    "/landing/diamond-beach.png",
    "/landing/bali-coastal-pano.png",
    "/landing/bromo-tengger.png",
    "/landing/bali-woman-temple.png",
]

STATIC_PINS = [
    {"x": 38, "y": 32},
    {"x": 46, "y": 26},
    {"x": 60, "y": 70},
    {"x": 70, "y": 30},
    {"x": 28, "y": 68},
    {"x": 50, "y": 58},
    {"x": 58, "y": 44},
    {"x": 42, "y": 52},
]

BUDGET_CATEGORY_IDS = ("accommodation", "transport", "meals", "activities", "other")
CATEGORY_LABELS = {category["id"]: category["label"] for category in CANONICAL_CATEGORIES}


async def trip_detail_display(
    store,
    plan: dict[str, Any],
    *,
    viewer_id: str | None = None,
) -> dict[str, Any]:
    card = await trip_card_display(store, plan, viewer_id=viewer_id)
    selected_items = await selected_recommendation_items(store, plan)
    if selected_items:
        destinations = [destination_from_recommendation(item, index) for index, item in enumerate(selected_items, 1)]
    else:
        destinations = await fallback_destinations(store, plan)

    itinerary = plan.get("itinerary") or synthesize_itinerary(destinations)
    budget_categories = plan.get("budget_categories") or synthesize_budget_categories(plan, selected_items, destinations)
    budget_daily = plan.get("budget_daily") or synthesize_budget_daily(selected_items, destinations)
    memo = plan.get("memo") or synthesize_memo(plan, destinations)
    gallery = plan.get("gallery") or synthesize_gallery(plan, destinations)
    owner = await owner_display(store, plan["owner_id"])
    participants = await trip_participants(store, plan, owner)

    return {
        "trip_plan": {
            **card,
            "description": plan.get("description") or summary_description(plan, destinations),
            "duration_nights": max((card["duration_days"] or 1) - 1, 0),
            "travelers": plan.get("travelers") or "2 - 8",
            "views": plan.get("views", 0),
            "comments": plan.get("comments", 0),
            "last_updated": plan.get("last_updated_label") or "Updated recently",
            "owner_bio": plan.get("owner_bio") or "Planning memorable trips across Indonesia.",
            "owner_stats": plan.get(
                "owner_stats",
                {"trips": 1, "followers": "New", "response_rate": "96%"},
            ),
            "budget_total": plan.get("budget_total_label") or format_idr(plan.get("estimated_budget_idr")),
            "visibility": plan.get("visibility", "private"),
            "status": plan.get("status", "draft"),
            "planner_session_id": plan.get("planner_session_id"),
            "owner_display": owner,
        },
        "gallery": gallery,
        "destinations": destinations,
        "memo": memo,
        "itinerary": itinerary,
        "budget": {
            "categories": budget_categories,
            "daily": budget_daily,
            "total_amount": plan.get("budget_total_label") or format_idr(plan.get("estimated_budget_idr")),
            "total_label": f"per person - {card['duration_days']} days",
        },
        "participants": participants,
    }


async def selected_recommendation_items(store, plan: dict[str, Any]) -> list[dict[str, Any]]:
    ids = list(plan.get("selected_recommendation_ids") or plan.get("recommendation_item_ids") or [])
    session_id = plan.get("trip_creation_session_id")
    if not ids and session_id:
        session = await store.find_one("tripCreationSessions", id=session_id, owner_id=plan["owner_id"])
        ids = list((session or {}).get("selected_recommendation_ids") or [])
    items = []
    for item_id in ids:
        item = await store.find_one("recommendationItems", id=item_id)
        if item and item.get("owner_id") == plan["owner_id"]:
            items.append(item)
    return sorted(items, key=lambda item: item.get("rank", 999))


async def fallback_destinations(store, plan: dict[str, Any]) -> list[dict[str, Any]]:
    categories = plan.get("categories") or []
    seeds = await store.list_docs("destinationSeeds")
    matched = [
        seed
        for seed in seeds
        if not categories or set(seed.get("categories", [])).intersection(set(categories))
    ]
    if not matched:
        matched = [
            {
                "name": plan.get("title", "SnapTrip destination"),
                "region": plan.get("region", "Indonesia"),
                "description": plan.get("description") or "A saved SnapTrip route ready for planning.",
                "categories": categories,
                "estimated_cost_idr": plan.get("estimated_budget_idr"),
            }
        ]
    return [destination_from_seed(seed, index) for index, seed in enumerate(matched[:6], 1)]


def destination_from_recommendation(item: dict[str, Any], order: int) -> dict[str, Any]:
    location = item.get("location") or {}
    cover = fallback_cover(item.get("categories", []), order)
    snaps = item.get("image_snaps") or []
    first_snap_url = next((snap.get("url") for snap in snaps if snap.get("url") and "/api/place-photos/" not in snap.get("url")), None)
    if first_snap_url:
        cover = first_snap_url
    return {
        "order": order,
        "name": item.get("name", f"Destination {order}"),
        "region": location.get("address") or item.get("region", "Indonesia"),
        "address": location.get("address"),
        "cover": cover,
        "blurb": item.get("description") or item.get("short_summary") or "Recommended SnapTrip destination.",
        "highlights": destination_highlights(item),
        "pin": STATIC_PINS[(order - 1) % len(STATIC_PINS)],
        "days": [order],
        "lat": location.get("lat"),
        "lng": location.get("lng"),
        "google_maps_uri": location.get("google_maps_uri"),
        "place_enrichment_id": item.get("place_enrichment_id"),
    }


def destination_from_seed(seed: dict[str, Any], order: int) -> dict[str, Any]:
    return {
        "order": order,
        "name": seed.get("name", f"Destination {order}"),
        "region": seed.get("region", "Indonesia"),
        "address": seed.get("region"),
        "cover": fallback_cover(seed.get("categories", []), order),
        "blurb": seed.get("description") or "Curated SnapTrip destination.",
        "highlights": [CATEGORY_LABELS.get(category, category) for category in seed.get("categories", [])][:3],
        "pin": STATIC_PINS[(order - 1) % len(STATIC_PINS)],
        "days": [order],
        "lat": None,
        "lng": None,
        "google_maps_uri": None,
        "place_enrichment_id": None,
    }


def destination_highlights(item: dict[str, Any]) -> list[str]:
    labels = [CATEGORY_LABELS.get(category, category) for category in item.get("categories", [])]
    hours = (item.get("opening_hours_summary") or {}).get("summary")
    cost = (item.get("estimated_cost") or {}).get("label")
    return [value for value in [*labels, hours, cost] if value][:3] or ["Curated stop"]


def synthesize_itinerary(destinations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "day": destination["order"],
            "title": destination["name"],
            "summary": destination["blurb"][:96],
            "description": destination["blurb"],
            "cover": destination["cover"],
            "dateLabel": f"Day {destination['order']}",
            "highlights": destination["highlights"],
            "activities": [
                {
                    "time": "09:00",
                    "title": f"Explore {destination['name']}",
                    "detail": destination["blurb"],
                    "location": destination["region"],
                    "duration": "3h",
                },
                {
                    "time": "13:00",
                    "title": "Local lunch and rest",
                    "detail": "Keep a flexible break before the next stop.",
                    "location": destination["region"],
                    "duration": "1.5h",
                },
            ],
            "transport": {
                "mode": "Drive",
                "from": "Previous stop" if destination["order"] > 1 else "Start",
                "to": destination["name"],
                "durationLabel": "Flexible",
            },
            "accommodation": {
                "name": "Local stay to confirm",
                "area": destination["region"],
                "nights": 1,
            },
            "meals": {"lunch": "Local restaurant to confirm"},
            "estCost": {"value": "Budget TBD", "note": "estimate"},
        }
        for destination in destinations
    ]


def synthesize_budget_categories(
    plan: dict[str, Any],
    selected_items: list[dict[str, Any]],
    destinations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    total = plan.get("estimated_budget_idr") or sum(
        ((item.get("estimated_cost") or {}).get("amount_idr") or 0) for item in selected_items
    )
    if not total:
        total = max(len(destinations), 1) * 250_000
    allocations = {
        "accommodation": 0.35,
        "transport": 0.2,
        "meals": 0.18,
        "activities": 0.2,
        "other": 0.07,
    }
    labels = {
        "accommodation": "Accommodation",
        "transport": "Transport",
        "meals": "Meals",
        "activities": "Activities & Tickets",
        "other": "Other",
    }
    return [
        {
            "id": category_id,
            "label": labels[category_id],
            "amount": format_idr(round(total * allocations[category_id])),
            "note": "(Estimated)",
            "items": [
                {
                    "label": labels[category_id],
                    "amount": format_idr(round(total * allocations[category_id])),
                    "detail": "Synthesized from selected destinations.",
                }
            ],
        }
        for category_id in BUDGET_CATEGORY_IDS
    ]


def synthesize_budget_daily(
    selected_items: list[dict[str, Any]],
    destinations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows = []
    item_by_rank = {item.get("rank"): item for item in selected_items}
    for destination in destinations:
        item = item_by_rank.get(destination["order"], {})
        amount = (item.get("estimated_cost") or {}).get("amount_idr") or 250_000
        rows.append(
            {
                "day": destination["order"],
                "title": destination["name"],
                "route": destination["blurb"][:80],
                "amounts": {
                    "accommodation": round(amount * 0.35),
                    "transport": round(amount * 0.2),
                    "meals": round(amount * 0.18),
                    "activities": round(amount * 0.2),
                    "other": round(amount * 0.07),
                },
            }
        )
    return rows


def synthesize_memo(plan: dict[str, Any], destinations: list[dict[str, Any]]) -> dict[str, Any]:
    title = plan.get("title", "SnapTrip plan")
    markdown_lines = [
        "## Why this trip",
        "",
        summary_description(plan, destinations),
        "",
        "### Selected stops",
    ]
    markdown_lines.extend(f"- **{destination['name']}** - {destination['blurb']}" for destination in destinations)
    markdown_lines.extend(
        [
            "",
            "### Planning note",
            "",
            "This read-only detail was synthesized from confirmed trip and recommendation data. Costs and hours remain estimates until the full planner documents are accepted.",
        ]
    )
    return {
        "markdown": "\n".join(markdown_lines),
        "caption": f"{title} planning notes",
        "source": "SnapTrip recommendation data",
        "items": max(len(destinations), 1),
        "tiles": [{"src": destination["cover"], "alt": destination["name"]} for destination in destinations[:4]],
    }


def synthesize_gallery(plan: dict[str, Any], destinations: list[dict[str, Any]]) -> dict[str, Any]:
    thumbs = [{"src": destination["cover"], "alt": destination["name"]} for destination in destinations[:6]]
    if plan.get("cover_image_id"):
        thumbs.insert(0, {"src": image_url(plan["cover_image_id"], plan.get("categories", [])), "alt": plan.get("title", "Trip cover")})
    while len(thumbs) < 4:
        thumbs.append({"src": STATIC_FALLBACKS[len(thumbs) % len(STATIC_FALLBACKS)], "alt": "SnapTrip destination"})
    return {"thumbs": thumbs[:6], "more": max(len(destinations) - 6, 0)}


async def trip_participants(store, plan: dict[str, Any], owner: dict[str, Any]) -> list[dict[str, Any]]:
    stored = await store.list_docs("tripParticipants", trip_plan_id=plan["id"])
    if not stored:
        stored = [{"user_id": plan["owner_id"], "role": "owner", "status": "active"}]
    rows = []
    for participant in sorted(stored, key=lambda item: 0 if item.get("role") == "owner" else 1):
        user = await store.find_one("users", id=participant["user_id"])
        name = (user or {}).get("display_name") or owner["name"]
        rows.append(
            {
                "id": participant["user_id"],
                "name": name,
                "handle": "owner" if participant.get("role") == "owner" else "viewer",
                "avatar": f"https://api.dicebear.com/7.x/notionists/svg?seed={name}",
                "role": "Owner" if participant.get("role") == "owner" else "Viewer",
                "status": participant.get("status", "active"),
                "joinedLabel": "Owner" if participant.get("role") == "owner" else "Joined",
            }
        )
    return rows


def summary_description(plan: dict[str, Any], destinations: list[dict[str, Any]]) -> str:
    if plan.get("description"):
        return plan["description"]
    names = ", ".join(destination["name"] for destination in destinations[:3])
    return f"A SnapTrip route through {names or plan.get('region', 'Indonesia')} with structured memo, itinerary, and budget previews."


def fallback_cover(categories: list[str], order: int) -> str:
    return image_url(None, categories) if categories else STATIC_FALLBACKS[(order - 1) % len(STATIC_FALLBACKS)]


def format_idr(value: int | None) -> str:
    if not value:
        return "Budget TBD"
    return f"IDR {value:,}"
