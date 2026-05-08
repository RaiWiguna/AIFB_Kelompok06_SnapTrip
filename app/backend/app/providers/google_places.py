from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.ids import new_id

PLACES_FIELD_MASK = ",".join(
    [
        "id",
        "name",
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "regularOpeningHours",
        "currentOpeningHours",
        "businessStatus",
        "priceLevel",
        "photos",
        "googleMapsUri",
        "attributions",
    ]
)

TEXT_SEARCH_FIELD_MASK = ",".join(f"places.{field}" for field in PLACES_FIELD_MASK.split(","))


class GooglePlacesProvider:
    def __init__(self, settings):
        self.settings = settings

    async def enrich_seed(self, seed: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.use_google_places or not self.settings.google_places_api_key:
            return fallback_enrichment(seed, ["places_unavailable"])

        headers = {
            "X-Goog-Api-Key": self.settings.google_places_api_key,
            "Content-Type": "application/json",
        }
        timeout = httpx.Timeout(self.settings.ai_provider_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                if seed.get("google_place_id"):
                    response = await client.get(
                        f"https://places.googleapis.com/v1/places/{seed['google_place_id']}",
                        headers={**headers, "X-Goog-FieldMask": PLACES_FIELD_MASK},
                    )
                    response.raise_for_status()
                    return normalize_place(seed, response.json())

                response = await client.post(
                    "https://places.googleapis.com/v1/places:searchText",
                    headers={**headers, "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK},
                    json={
                        "textQuery": seed["search_query"],
                        "languageCode": "id",
                        "regionCode": "ID",
                    },
                )
                response.raise_for_status()
                places = response.json().get("places", [])
                if not places:
                    return fallback_enrichment(seed, ["places_unavailable"])
                return normalize_place(seed, places[0])
            except (httpx.HTTPError, TimeoutError):
                return fallback_enrichment(seed, ["places_unavailable"])


def fallback_enrichment(seed: dict[str, Any], warnings: list[str]) -> dict[str, Any]:
    return {
        "id": new_id("plc"),
        "seed_id": seed["id"],
        "provider": "curated_seed",
        "provider_place_id": None,
        "display_name": seed["name"],
        "formatted_address": seed.get("region"),
        "location": {"lat": None, "lng": None},
        "rating": None,
        "google_maps_uri": None,
        "opening_hours": {"status": "unavailable", "summary": "Jam buka belum tersedia."},
        "price_level": "PRICE_LEVEL_UNSPECIFIED",
        "business_status": "UNKNOWN",
        "photo_snaps": [],
        "warnings": warnings,
        "fetched_at": datetime.now(UTC),
    }


def normalize_place(seed: dict[str, Any], place: dict[str, Any]) -> dict[str, Any]:
    business_status = place.get("businessStatus") or "UNKNOWN"
    opening_hours = normalize_opening_hours(place, business_status)
    photos = normalize_photos(place.get("photos", []))
    warnings = []
    if opening_hours["status"] == "unavailable":
        warnings.append("missing_opening_hours")
    if not photos:
        warnings.append("missing_photos")
    if business_status == "CLOSED_TEMPORARILY":
        warnings.append("temporarily_closed")
    if business_status == "CLOSED_PERMANENTLY":
        warnings.append("permanently_closed")

    location = place.get("location") or {}
    return {
        "id": new_id("plc"),
        "seed_id": seed["id"],
        "provider": "google_places",
        "provider_place_id": place.get("id"),
        "provider_resource_name": place.get("name"),
        "display_name": (place.get("displayName") or {}).get("text") or seed["name"],
        "formatted_address": place.get("formattedAddress"),
        "location": {"lat": location.get("latitude"), "lng": location.get("longitude")},
        "rating": place.get("rating"),
        "google_maps_uri": place.get("googleMapsUri"),
        "opening_hours": opening_hours,
        "price_level": place.get("priceLevel") or "PRICE_LEVEL_UNSPECIFIED",
        "business_status": business_status,
        "photo_snaps": photos,
        "attributions": place.get("attributions", []),
        "warnings": warnings,
        "fetched_at": datetime.now(UTC),
    }


def normalize_opening_hours(place: dict[str, Any], business_status: str) -> dict[str, str]:
    if business_status == "CLOSED_TEMPORARILY":
        return {"status": "temporarily_closed", "summary": "Tempat ini sementara tutup menurut Google Places."}
    if business_status == "CLOSED_PERMANENTLY":
        return {"status": "permanently_closed", "summary": "Tempat ini tutup permanen menurut Google Places."}
    hours = place.get("currentOpeningHours") or place.get("regularOpeningHours") or {}
    descriptions = hours.get("weekdayDescriptions") or []
    if descriptions:
        return {"status": "available", "summary": "; ".join(descriptions[:3])}
    periods = hours.get("periods") or []
    if periods and len(periods) == 1 and not periods[0].get("close"):
        return {"status": "always_open", "summary": "Buka 24 jam menurut Google Places."}
    return {"status": "unavailable", "summary": "Jam buka belum tersedia."}


def normalize_photos(photos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    snaps = []
    for photo in photos[:5]:
        resource_name = photo.get("name")
        if not resource_name:
            continue
        attributions = photo.get("authorAttributions") or []
        attribution = None
        if attributions:
            attribution = attributions[0].get("displayName") or attributions[0].get("uri")
        snaps.append(
            {
                "photo_id": stable_photo_id(resource_name),
                "provider_photo_name": resource_name,
                "width_px": photo.get("widthPx"),
                "height_px": photo.get("heightPx"),
                "attribution": attribution,
            }
        )
    return snaps


def stable_photo_id(resource_name: str) -> str:
    digest = hashlib.sha256(resource_name.encode("utf-8")).hexdigest()[:20]
    return f"pho_{digest}"
