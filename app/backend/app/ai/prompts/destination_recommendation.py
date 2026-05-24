from __future__ import annotations

import json
from typing import Any

SELECTION_SCHEMA_VERSION = "destination_seed_selection.v1"
FINALIZATION_SCHEMA_VERSION = "destination_card_finalization.v1"
RECOMMENDATION_SCHEMA_VERSION = "destination_recommendation.v2"

SYSTEM_INSTRUCTION = """You are SnapTrip's destination recommendation structuring engine.
Return only JSON matching the provided schema.
Use Bahasa Indonesia for user-facing copy.
Use only the supplied curated seed data and Google Places enrichment.
Do not invent opening hours, prices, ratings, addresses, coordinates, photos, or provider facts.
If a field is missing, mark it unavailable and add a warning.
Preserve every provided seed_id, place_enrichment_id, category id, and photo_id exactly.
Every cost is an estimate, not a guarantee."""

SELECTION_SYSTEM_INSTRUCTION = """You are SnapTrip's first-pass destination selector.
Return only JSON matching the provided schema.
Use Bahasa Indonesia for match reasons.
Pick exactly two main destinations from the supplied seed data.
Pick exactly two additional Indonesian destinations that are not in the supplied seed list.
Do not mention facts about Places data because this step only sees seed and classifier context.
Preserve seed_id values exactly."""

FINALIZATION_SYSTEM_INSTRUCTION = """You are SnapTrip's final destination card normalizer.
Return only JSON matching the provided schema.
Use Bahasa Indonesia for every user-facing field.
Use only the supplied normalized Google Places facts and preserved match reasons.
Do not invent ratings, review counts, websites, maps links, photos, place IDs, addresses, or opening hours.
Normalize address and opening hours into concise UI copy.
Summarize reviews in one short paragraph. If reviews are missing, say review data is not yet available."""


def build_context_payload(
    *,
    confirmed_categories: list[str],
    classifier_mode: str,
    classifier_model_version: str,
    candidate_destinations: list[dict[str, Any]],
    place_enrichments: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": RECOMMENDATION_SCHEMA_VERSION,
        "confirmed_categories": confirmed_categories,
        "classifier_summary": {
            "source": "mobilenetv4_medium",
            "mode": classifier_mode,
            "model_version": classifier_model_version,
        },
        "candidate_destinations": candidate_destinations,
        "place_enrichments": place_enrichments,
        "ui_requirements": {
            "max_cards": 8,
            "max_photo_snaps_per_card": 5,
            "language": "id-ID",
            "tone": "polished, practical, travel-planning",
        },
    }


def build_selection_context_payload(
    *,
    confirmed_categories: list[str],
    classifier_mode: str,
    classifier_model_version: str,
    aggregate_confidences: list[dict[str, Any]],
    per_image_confidences: list[dict[str, Any]],
    candidate_destinations: list[dict[str, Any]],
    image_count: int,
) -> dict[str, Any]:
    return {
        "schema_version": SELECTION_SCHEMA_VERSION,
        "confirmed_categories": confirmed_categories,
        "classifier_summary": {
            "source": "mobilenetv4_medium",
            "mode": classifier_mode,
            "model_version": classifier_model_version,
            "aggregate_confidences": aggregate_confidences,
            "per_image_confidences": per_image_confidences,
            "image_count": image_count,
        },
        "candidate_destinations": candidate_destinations,
        "selection_requirements": {
            "main_seed_picks": 2,
            "also_like_picks": 2,
            "language": "id-ID",
        },
    }


def build_finalization_context_payload(
    *,
    confirmed_categories: list[str],
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": FINALIZATION_SCHEMA_VERSION,
        "confirmed_categories": confirmed_categories,
        "candidates": candidates,
        "finalization_requirements": {
            "card_count": 4,
            "language": "id-ID",
            "preserve_candidate_ids": True,
        },
    }


def render_context(context: dict[str, Any]) -> str:
    return json.dumps(context, ensure_ascii=False, sort_keys=True, default=str)


def render_repair_prompt(
    *,
    validation_errors: str,
    previous_output: str,
    original_context: dict[str, Any],
) -> str:
    return "\n".join(
        [
            "Your previous output failed schema validation.",
            "Fix only the JSON structure and invalid values.",
            "Do not change IDs.",
            "Do not add facts not present in the original context.",
            "Validation errors:",
            validation_errors,
            "Previous output:",
            previous_output,
            "Original context:",
            render_context(original_context),
        ]
    )
