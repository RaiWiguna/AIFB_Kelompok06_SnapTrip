from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from pprint import pformat
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings  # noqa: E402
from app.db.seeds import DESTINATION_SEEDS  # noqa: E402
from app.providers.google_places import PLACES_FIELD_MASK, GooglePlacesProvider  # noqa: E402

SEEDS_PATH = BACKEND_ROOT / "app" / "db" / "seeds.py"


async def main() -> None:
    parser = argparse.ArgumentParser(description="Audit SnapTrip destination seeds against Google Places.")
    parser.add_argument("mode", choices=["text-search", "details", "audit", "write-seeds"])
    parser.add_argument("--query", help="Text query for text-search mode.")
    parser.add_argument("--place-id", help="Place ID for details mode.")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    settings = Settings()
    provider = GooglePlacesProvider(settings)
    if not provider.enabled:
        raise SystemExit("Google Places is disabled or GOOGLE_PLACES_API_KEY is missing.")

    if args.mode == "text-search":
        if not args.query:
            raise SystemExit("--query is required for text-search mode.")
        result = await provider.search_text(args.query)
        print_json(result, args.pretty)
        return

    if args.mode == "details":
        if not args.place_id:
            raise SystemExit("--place-id is required for details mode.")
        result = await provider.get_place_details(args.place_id)
        print_json({"field_mask": PLACES_FIELD_MASK, "place": result}, args.pretty)
        return

    if args.mode == "write-seeds":
        seeds = await grounded_seeds(provider)
        SEEDS_PATH.write_text(format_seeds(seeds), encoding="utf-8")
        print_json({"written": str(SEEDS_PATH), "count": len(seeds)}, args.pretty)
        return

    rows = []
    for seed in DESTINATION_SEEDS:
        details = await provider.get_place_details(seed["google_place_id"])
        rows.append(audit_seed(seed, details or {}))
    print_json(rows, args.pretty)


async def grounded_seeds(provider: GooglePlacesProvider) -> list[dict[str, Any]]:
    seeds = []
    for seed in DESTINATION_SEEDS:
        updated = dict(seed)
        place = await provider.search_text(seed["search_query"])
        if place and place.get("id"):
            details = await provider.get_place_details(place["id"])
            updated["google_place_id"] = (details or place).get("id") or updated["google_place_id"]
        seeds.append(updated)
    return seeds


def format_seeds(seeds: list[dict[str, Any]]) -> str:
    formatted = pformat(tuple(seeds), width=100, sort_dicts=False)
    return f"DESTINATION_SEEDS: tuple[dict, ...] = {formatted}\n"


def audit_seed(seed: dict[str, Any], details: dict[str, Any]) -> dict[str, Any]:
    return {
        "seed_id": seed["id"],
        "category": seed["categories"][0],
        "name": seed["name"],
        "google_place_id": seed["google_place_id"],
        "display_name": (details.get("displayName") or {}).get("text"),
        "rating": details.get("rating"),
        "user_rating_count": details.get("userRatingCount"),
        "has_gmaps_uri": bool(details.get("googleMapsUri")),
        "has_website_uri": bool(details.get("websiteUri")),
        "photos_count": len(details.get("photos") or []),
        "reviews_count": len(details.get("reviews") or []),
        "has_editorial_summary": bool(details.get("editorialSummary")),
        "has_generative_summary": bool(details.get("generativeSummary")),
        "has_regular_hours": bool(details.get("regularOpeningHours")),
        "has_current_hours": bool(details.get("currentOpeningHours")),
        "primary_type": (details.get("primaryTypeDisplayName") or {}).get("text"),
    }


def print_json(value: Any, pretty: bool) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None, default=str))


if __name__ == "__main__":
    asyncio.run(main())
