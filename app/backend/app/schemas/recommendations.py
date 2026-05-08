from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.categories import CATEGORY_IDS

CategoryId = Literal["pantai", "gunung", "air_terjun", "wisata_tradisional"]


class WarningCode(StrEnum):
    missing_opening_hours = "missing_opening_hours"
    estimated_cost = "estimated_cost"
    missing_photos = "missing_photos"
    places_unavailable = "places_unavailable"
    places_partial_match = "places_partial_match"
    temporarily_closed = "temporarily_closed"
    permanently_closed = "permanently_closed"
    provider_fallback = "provider_fallback"


class OpeningHoursStatus(StrEnum):
    available = "available"
    unavailable = "unavailable"
    always_open = "always_open"
    temporarily_closed = "temporarily_closed"
    permanently_closed = "permanently_closed"


class ConfidenceLevel(StrEnum):
    high = "high"
    medium = "medium"
    low = "low"


class SourceType(StrEnum):
    curated_seed = "curated_seed"
    google_places = "google_places"
    gemini = "gemini"
    deterministic_fallback = "deterministic_fallback"


class RecommendationLocation(BaseModel):
    address: str | None = Field(default=None, description="Human-readable address when available.")
    lat: float | None = Field(default=None, description="Latitude from Google Places when available.")
    lng: float | None = Field(default=None, description="Longitude from Google Places when available.")
    google_maps_uri: str | None = Field(default=None, description="Google Maps URL when available.")


class OpeningHoursSummary(BaseModel):
    status: OpeningHoursStatus = Field(description="Availability status for opening-hours data.")
    summary: str = Field(description="Short user-facing opening-hours summary in Bahasa Indonesia.")


class EstimatedCost(BaseModel):
    amount_idr: int | None = Field(default=None, ge=0, description="Estimated cost in Indonesian rupiah.")
    label: str = Field(description="User-facing estimated cost label.")
    source: SourceType = Field(description="Source used for the cost estimate.")
    is_estimate: bool = Field(default=True, description="Must be true because costs can change.")


class ImageSnap(BaseModel):
    photo_id: str = Field(description="Backend-safe SnapTrip photo identifier.")
    url: str | None = Field(default=None, description="Backend-controlled URL for the UI to load the image.")
    attribution: str | None = Field(default=None, description="Required photo attribution when available.")


class RecommendationWarning(BaseModel):
    code: WarningCode = Field(description="Machine-readable warning code.")
    message: str = Field(description="Short user-facing warning message in Bahasa Indonesia.")


class SourceNote(BaseModel):
    source: SourceType = Field(description="Source used for this recommendation detail.")
    note: str = Field(description="Short source note safe for UI display.")


class RecommendationItemOutputV1(BaseModel):
    seed_id: str = Field(description="Curated destination seed ID. Preserve exactly.")
    place_enrichment_id: str = Field(description="Normalized Places enrichment ID. Preserve exactly.")
    rank: int = Field(ge=1, description="1-based card order.")
    name: str = Field(min_length=1, description="Destination name.")
    categories: list[CategoryId] = Field(min_length=1, description="Canonical SnapTrip category IDs.")
    region: str = Field(min_length=1, description="Destination region in Indonesia.")
    short_summary: str = Field(min_length=1, description="Concise card summary in Bahasa Indonesia.")
    description: str = Field(min_length=1, description="Polished destination description in Bahasa Indonesia.")
    match_reason: str = Field(min_length=1, description="Why this fits the user's confirmed categories.")
    opening_hours_summary: OpeningHoursSummary
    estimated_cost: EstimatedCost
    location: RecommendationLocation
    image_snaps: list[ImageSnap] = Field(default_factory=list, max_length=5)
    warnings: list[RecommendationWarning] = Field(default_factory=list)
    source_notes: list[SourceNote] = Field(default_factory=list)
    confidence: ConfidenceLevel = Field(description="Confidence in the recommendation card quality.")

    @field_validator("categories")
    @classmethod
    def categories_are_canonical(cls, value: list[str]) -> list[str]:
        unknown = [category for category in value if category not in CATEGORY_IDS]
        if unknown:
            raise ValueError(f"Unknown category id: {', '.join(unknown)}")
        return value


class RecommendationRunOutputV1(BaseModel):
    schema_version: Literal["destination_recommendation.v1"] = "destination_recommendation.v1"
    summary: str = Field(min_length=1, description="Short run summary in Bahasa Indonesia.")
    items: list[RecommendationItemOutputV1] = Field(min_length=1, description="Destination cards for UI.")


class SelectedRecommendationsRequest(BaseModel):
    recommendation_item_ids: list[str] = Field(min_length=1)
