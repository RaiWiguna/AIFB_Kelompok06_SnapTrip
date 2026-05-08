from __future__ import annotations

import json
from typing import Any

SCHEMA_VERSION = "destination_recommendation.v1"

SYSTEM_INSTRUCTION = """You are SnapTrip's destination recommendation structuring engine.
Return only JSON matching the provided schema.
Use Bahasa Indonesia for user-facing copy.
Use only the supplied curated seed data and Google Places enrichment.
Do not invent opening hours, prices, ratings, addresses, coordinates, photos, or provider facts.
If a field is missing, mark it unavailable and add a warning.
Preserve every provided seed_id, place_enrichment_id, category id, and photo_id exactly.
Every cost is an estimate, not a guarantee."""


def build_context_payload(
    *,
    confirmed_categories: list[str],
    classifier_mode: str,
    classifier_model_version: str,
    candidate_destinations: list[dict[str, Any]],
    place_enrichments: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "confirmed_categories": confirmed_categories,
        "classifier_summary": {
            "source": "mobilenetv2",
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
