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
        "userRatingCount",
        "editorialSummary",
        "generativeSummary",
        "websiteUri",
        "reviews",
        "types",
        "primaryTypeDisplayName",
        "regularOpeningHours",
        "currentOpeningHours",
        "businessStatus",
        "priceLevel",
        "photos",
        "googleMapsUri",
        "attributions",
    ]
)

TEXT_SEARCH_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.name",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.primaryTypeDisplayName",
    ]
)


class GooglePlacesProvider:
    def __init__(self, settings):
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self.settings.use_google_places and self.settings.google_places_api_key)

    def _headers(self, field_mask: str) -> dict[str, str]:
        return {
            "X-Goog-Api-Key": self.settings.google_places_api_key,
            "X-Goog-FieldMask": field_mask,
            "Content-Type": "application/json",
        }

    async def search_text(self, query: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        timeout = httpx.Timeout(self.settings.ai_provider_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://places.googleapis.com/v1/places:searchText",
                headers=self._headers(TEXT_SEARCH_FIELD_MASK),
                json={
                    "textQuery": query,
                    "languageCode": "id",
                    "regionCode": "ID",
                },
            )
            response.raise_for_status()
            places = response.json().get("places", [])
            return places[0] if places else None

    async def get_place_details(self, place_id: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        timeout = httpx.Timeout(self.settings.ai_provider_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"https://places.googleapis.com/v1/places/{place_id}",
                headers=self._headers(PLACES_FIELD_MASK),
            )
            response.raise_for_status()
            return response.json()

    async def enrich_seed(self, seed: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.use_google_places or not self.settings.google_places_api_key:
            return fallback_enrichment(seed, ["places_unavailable"])

        warnings = []
        if seed.get("google_place_id"):
            try:
                details = await self.get_place_details(seed["google_place_id"])
                if details:
                    return normalize_place(seed, details)
                warnings.append("places_id_lookup_failed")
            except (httpx.HTTPError, TimeoutError):
                warnings.append("places_id_lookup_failed")

        try:
            place = await self.search_text(seed["search_query"])
            if not place:
                return fallback_enrichment(seed, warnings + ["places_unavailable"])
            details = await self.get_place_details(place["id"])
            return normalize_place(seed, details or place, warnings=warnings + ["places_text_search_fallback"])
        except (httpx.HTTPError, TimeoutError):
            return fallback_enrichment(seed, warnings + ["places_unavailable"])

    async def enrich_suggested_place(
        self,
        *,
        candidate_id: str,
        name: str,
        search_query: str | None = None,
        region: str | None = None,
        categories: list[str] | None = None,
    ) -> dict[str, Any]:
        seed = {
            "id": candidate_id,
            "name": name,
            "region": region or "Indonesia",
            "categories": categories or [],
            "search_query": search_query or f"{name} {region or 'Indonesia'}",
        }
        if not self.enabled:
            return fallback_enrichment(seed, ["places_unavailable"])
        try:
            place = await self.search_text(seed["search_query"])
            if not place:
                return fallback_enrichment(seed, ["places_unavailable"])
            details = await self.get_place_details(place["id"])
            return normalize_place(seed, details or place, warnings=["places_text_search_grounding"])
        except (httpx.HTTPError, TimeoutError):
            return fallback_enrichment(seed, ["places_unavailable"])


def fallback_enrichment(seed: dict[str, Any], warnings: list[str]) -> dict[str, Any]:
    return {
        "id": new_id("plc"),
        "seed_id": seed["id"],
        "provider": "curated_seed",
        "provider_place_id": None,
        "display_name": seed["name"],
        "primary_type_display_name": None,
        "formatted_address": seed.get("region"),
        "location": {"lat": None, "lng": None},
        "rating": None,
        "user_rating_count": None,
        "website_uri": None,
        "google_maps_uri": None,
        "opening_hours": {"status": "unavailable", "summary": "Jam buka belum tersedia."},
        "regular_opening_hours": None,
        "current_opening_hours": None,
        "price_level": "PRICE_LEVEL_UNSPECIFIED",
        "business_status": "UNKNOWN",
        "types": [],
        "editorial_summary": None,
        "generative_summary": None,
        "reviews": [],
        "photo_snaps": [],
        "warnings": warnings,
        "fetched_at": datetime.now(UTC),
    }


def normalize_place(seed: dict[str, Any], place: dict[str, Any], warnings: list[str] | None = None) -> dict[str, Any]:
    business_status = place.get("businessStatus") or "UNKNOWN"
    opening_hours = normalize_opening_hours(place, business_status)
    photos = normalize_photos(place.get("photos", []))
    normalized_warnings = list(warnings or [])
    if opening_hours["status"] == "unavailable":
        normalized_warnings.append("missing_opening_hours")
    if not photos:
        normalized_warnings.append("missing_photos")
    if business_status == "CLOSED_TEMPORARILY":
        normalized_warnings.append("temporarily_closed")
    if business_status == "CLOSED_PERMANENTLY":
        normalized_warnings.append("permanently_closed")

    location = place.get("location") or {}
    primary_type = place.get("primaryTypeDisplayName") or {}
    return {
        "id": new_id("plc"),
        "seed_id": seed["id"],
        "provider": "google_places",
        "provider_place_id": place.get("id"),
        "provider_resource_name": place.get("name"),
        "display_name": (place.get("displayName") or {}).get("text") or seed["name"],
        "primary_type_display_name": primary_type.get("text"),
        "formatted_address": place.get("formattedAddress"),
        "location": {"lat": location.get("latitude"), "lng": location.get("longitude")},
        "rating": place.get("rating"),
        "user_rating_count": place.get("userRatingCount"),
        "website_uri": place.get("websiteUri"),
        "google_maps_uri": place.get("googleMapsUri"),
        "opening_hours": opening_hours,
        "regular_opening_hours": place.get("regularOpeningHours"),
        "current_opening_hours": place.get("currentOpeningHours"),
        "price_level": place.get("priceLevel") or "PRICE_LEVEL_UNSPECIFIED",
        "business_status": business_status,
        "types": place.get("types") or [],
        "editorial_summary": normalize_localized_text(place.get("editorialSummary")),
        "generative_summary": normalize_localized_text(place.get("generativeSummary")),
        "reviews": normalize_reviews(place.get("reviews", [])),
        "photo_snaps": photos,
        "attributions": place.get("attributions", []),
        "warnings": normalized_warnings,
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


def normalize_reviews(reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for review in reviews[:5]:
        text = normalize_localized_text(review.get("text"))
        original_text = normalize_localized_text(review.get("originalText"))
        normalized.append(
            {
                "rating": review.get("rating"),
                "relative_publish_time_description": review.get("relativePublishTimeDescription"),
                "publish_time": review.get("publishTime"),
                "text": text or original_text,
                "author_name": (review.get("authorAttribution") or {}).get("displayName"),
            }
        )
    return normalized


def normalize_localized_text(value: dict[str, Any] | None) -> str | None:
    if not value:
        return None
    return value.get("text")


def stable_photo_id(resource_name: str) -> str:
    digest = hashlib.sha256(resource_name.encode("utf-8")).hexdigest()[:20]
    return f"pho_{digest}"
