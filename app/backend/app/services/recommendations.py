from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from app.ai.prompts.destination_recommendation import build_context_payload
from app.core.categories import validate_categories
from app.core.ids import new_id
from app.providers.gemini import GeminiRecommendationProvider, GeminiValidationFailure
from app.providers.google_places import GooglePlacesProvider
from app.schemas.recommendations import (
    ConfidenceLevel,
    EstimatedCost,
    ImageSnap,
    OpeningHoursSummary,
    RecommendationItemOutputV1,
    RecommendationLocation,
    RecommendationRunOutputV1,
    RecommendationWarning,
    SourceNote,
    SourceType,
    WarningCode,
)


class RecommendationService:
    def __init__(
        self,
        *,
        store,
        settings,
        places_provider: GooglePlacesProvider | None = None,
        gemini_provider: GeminiRecommendationProvider | None = None,
    ):
        self.store = store
        self.settings = settings
        self.places_provider = places_provider or GooglePlacesProvider(settings)
        self.gemini_provider = gemini_provider or GeminiRecommendationProvider(settings)

    async def generate_for_session(self, session_id: str, user: dict[str, Any]) -> dict[str, Any]:
        session = await self._get_owned_session(session_id, user)
        try:
            confirmed_categories = validate_categories(session.get("confirmed_categories") or [])
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Confirmed categories are required") from exc
        if not confirmed_categories:
            raise HTTPException(status_code=422, detail="Confirmed categories are required")

        seeds = await self._candidate_seeds(confirmed_categories)
        if not seeds:
            raise HTTPException(status_code=422, detail="No destination seeds match the confirmed categories")

        enrichments = []
        for seed in seeds:
            enrichments.append(await self._get_or_create_enrichment(seed))

        context = build_context_payload(
            confirmed_categories=confirmed_categories,
            classifier_mode=self.settings.classifier_mode,
            classifier_model_version=self.settings.classifier_model_version,
            candidate_destinations=[seed_context(seed) for seed in seeds],
            place_enrichments=[enrichment_context(enrichment) for enrichment in enrichments],
        )

        fallback_used = False
        provider_error = None
        try:
            output = await self.gemini_provider.generate(context)
            self._validate_output_references(output, seeds, enrichments)
        except GeminiValidationFailure as first_error:
            try:
                output = await self.gemini_provider.repair(
                    context=context,
                    validation_errors=first_error.message,
                    previous_output=first_error.raw_output,
                )
                self._validate_output_references(output, seeds, enrichments)
            except GeminiValidationFailure as second_error:
                fallback_used = True
                provider_error = second_error.message or first_error.message
                output = deterministic_output(seeds, enrichments)

        return await self._persist_run(
            session=session,
            output=output,
            provider_error=provider_error,
            fallback_used=fallback_used or not self.gemini_provider.enabled,
            candidate_seed_ids=[seed["id"] for seed in seeds],
        )

    async def list_session_runs(self, session_id: str, user: dict[str, Any]) -> list[dict[str, Any]]:
        await self._get_owned_session(session_id, user)
        return await self.store.list_docs("recommendationRuns", session_id=session_id, owner_id=user["id"])

    async def get_run(self, run_id: str, user: dict[str, Any]) -> dict[str, Any]:
        run = await self.store.find_one("recommendationRuns", id=run_id)
        if not run or run["owner_id"] != user["id"]:
            raise HTTPException(status_code=404, detail="Recommendation run not found")
        items = await self.store.list_docs("recommendationItems", run_id=run_id)
        return {"run": run, "items": sorted(items, key=lambda item: item["rank"])}

    async def select_items(
        self, session_id: str, user: dict[str, Any], recommendation_item_ids: list[str]
    ) -> dict[str, Any]:
        session = await self._get_owned_session(session_id, user)
        selected = []
        for item_id in recommendation_item_ids:
            item = await self.store.find_one("recommendationItems", id=item_id)
            if not item or item["owner_id"] != user["id"] or item["session_id"] != session_id:
                raise HTTPException(status_code=404, detail=f"Recommendation item not found: {item_id}")
            selected.append(item_id)
        updated = await self.store.update_doc(
            "tripCreationSessions",
            session["id"],
            {"selected_recommendation_ids": selected, "status": "recommendations_selected"},
        )
        return {"session": updated, "selected_recommendation_ids": selected}

    async def _get_owned_session(self, session_id: str, user: dict[str, Any]) -> dict[str, Any]:
        session = await self.store.find_one("tripCreationSessions", id=session_id)
        if not session or session["owner_id"] != user["id"]:
            raise HTTPException(status_code=404, detail="Trip creation session not found")
        return session

    async def _candidate_seeds(self, categories: list[str]) -> list[dict[str, Any]]:
        seeds = await self.store.list_docs("destinationSeeds")
        matched = [
            seed
            for seed in seeds
            if set(categories).intersection(set(seed.get("categories", [])))
        ]
        return sorted(matched, key=lambda seed: seed["id"])[:8]

    async def _get_or_create_enrichment(self, seed: dict[str, Any]) -> dict[str, Any]:
        cached = await self.store.list_docs("placeEnrichments", seed_id=seed["id"])
        now = datetime.now(UTC)
        for enrichment in sorted(cached, key=lambda item: item.get("updated_at") or now, reverse=True):
            expires_at = enrichment.get("expires_at")
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)
            if not expires_at or expires_at > now:
                return enrichment

        enrichment = await self.places_provider.enrich_seed(seed)
        enrichment["expires_at"] = now + timedelta(seconds=self.settings.places_cache_ttl_seconds)
        return await self.store.save_doc("placeEnrichments", enrichment)

    def _validate_output_references(
        self,
        output: RecommendationRunOutputV1,
        seeds: list[dict[str, Any]],
        enrichments: list[dict[str, Any]],
    ) -> None:
        seed_ids = {seed["id"] for seed in seeds}
        enrichment_ids = {enrichment["id"] for enrichment in enrichments}
        photo_ids = {
            photo["photo_id"]
            for enrichment in enrichments
            for photo in enrichment.get("photo_snaps", [])
        }
        for item in output.items:
            if item.seed_id not in seed_ids:
                raise GeminiValidationFailure(f"Unknown seed_id: {item.seed_id}", output.model_dump_json())
            if item.place_enrichment_id not in enrichment_ids:
                raise GeminiValidationFailure(
                    f"Unknown place_enrichment_id: {item.place_enrichment_id}", output.model_dump_json()
                )
            for snap in item.image_snaps:
                if snap.photo_id not in photo_ids:
                    raise GeminiValidationFailure(f"Unknown photo_id: {snap.photo_id}", output.model_dump_json())

    async def _persist_run(
        self,
        *,
        session: dict[str, Any],
        output: RecommendationRunOutputV1,
        provider_error: str | None,
        fallback_used: bool,
        candidate_seed_ids: list[str],
    ) -> dict[str, Any]:
        run = await self.store.save_doc(
            "recommendationRuns",
            {
                "id": new_id("rec"),
                "session_id": session["id"],
                "owner_id": session["owner_id"],
                "schema_version": output.schema_version,
                "summary": output.summary,
                "confirmed_categories": session.get("confirmed_categories", []),
                "candidate_seed_ids": candidate_seed_ids,
                "provider_modes": {
                    "google_places": "enabled" if self.settings.use_google_places else "disabled",
                    "gemini": "enabled" if self.gemini_provider.enabled else "disabled",
                },
                "fallback_used": fallback_used,
                "provider_error": provider_error,
            },
        )
        items = []
        for output_item in output.items:
            item_doc = output_item.model_dump(mode="json")
            item_doc.update(
                {
                    "id": new_id("reci"),
                    "run_id": run["id"],
                    "session_id": session["id"],
                    "owner_id": session["owner_id"],
                }
            )
            items.append(await self.store.save_doc("recommendationItems", item_doc))
        await self.store.update_doc(
            "tripCreationSessions",
            session["id"],
            {"status": "recommendations_generated", "latest_recommendation_run_id": run["id"]},
        )
        return {"run": run, "items": sorted(items, key=lambda item: item["rank"])}


def seed_context(seed: dict[str, Any]) -> dict[str, Any]:
    return {
        "seed_id": seed["id"],
        "name": seed["name"],
        "categories": seed.get("categories", []),
        "region": seed["region"],
        "seed_description": seed.get("description"),
        "seed_estimated_cost_idr": seed.get("estimated_cost_idr"),
        "suggested_duration_hours": seed.get("suggested_duration_hours"),
    }


def enrichment_context(enrichment: dict[str, Any]) -> dict[str, Any]:
    return {
        "place_enrichment_id": enrichment["id"],
        "seed_id": enrichment["seed_id"],
        "provider": enrichment.get("provider"),
        "display_name": enrichment.get("display_name"),
        "formatted_address": enrichment.get("formatted_address"),
        "location": enrichment.get("location"),
        "rating": enrichment.get("rating"),
        "opening_hours": enrichment.get("opening_hours"),
        "price_level": enrichment.get("price_level"),
        "business_status": enrichment.get("business_status"),
        "photo_snaps": [
            {
                "photo_id": photo["photo_id"],
                "attribution": photo.get("attribution"),
            }
            for photo in enrichment.get("photo_snaps", [])
        ],
        "warnings": enrichment.get("warnings", []),
    }


def deterministic_output(
    seeds: list[dict[str, Any]], enrichments: list[dict[str, Any]]
) -> RecommendationRunOutputV1:
    enrichment_by_seed = {enrichment["seed_id"]: enrichment for enrichment in enrichments}
    items = []
    for index, seed in enumerate(seeds, start=1):
        enrichment = enrichment_by_seed[seed["id"]]
        warnings = warning_models(enrichment.get("warnings", []))
        warnings.append(
            RecommendationWarning(
                code=WarningCode.provider_fallback,
                message="Rekomendasi dibuat dari data kurasi karena Gemini tidak tersedia.",
            )
        )
        if not enrichment.get("photo_snaps"):
            warnings.append(
                RecommendationWarning(
                    code=WarningCode.missing_photos,
                    message="Foto destinasi belum tersedia dari Google Places.",
                )
            )
        items.append(
            RecommendationItemOutputV1(
                seed_id=seed["id"],
                place_enrichment_id=enrichment["id"],
                rank=index,
                name=enrichment.get("display_name") or seed["name"],
                categories=seed.get("categories", []),
                region=seed["region"],
                short_summary=seed["description"],
                description=seed["description"],
                match_reason=f"Cocok dengan kategori {', '.join(seed.get('categories', []))} yang kamu konfirmasi.",
                opening_hours_summary=OpeningHoursSummary(**enrichment["opening_hours"]),
                estimated_cost=EstimatedCost(
                    amount_idr=seed.get("estimated_cost_idr"),
                    label=f"Estimasi mulai Rp{seed.get('estimated_cost_idr', 0):,}".replace(",", "."),
                    source=SourceType.curated_seed,
                    is_estimate=True,
                ),
                location=RecommendationLocation(
                    address=enrichment.get("formatted_address"),
                    lat=(enrichment.get("location") or {}).get("lat"),
                    lng=(enrichment.get("location") or {}).get("lng"),
                    google_maps_uri=enrichment.get("google_maps_uri"),
                ),
                image_snaps=[
                    ImageSnap(
                        photo_id=photo["photo_id"],
                        url=f"/api/place-photos/{photo['photo_id']}",
                        attribution=photo.get("attribution"),
                    )
                    for photo in enrichment.get("photo_snaps", [])[:5]
                ],
                warnings=warnings,
                source_notes=[
                    SourceNote(
                        source=SourceType.curated_seed,
                        note="Data dasar berasal dari kurasi destinasi SnapTrip.",
                    )
                ],
                confidence=ConfidenceLevel.medium if enrichment.get("provider") == "google_places" else ConfidenceLevel.low,
            )
        )
    return RecommendationRunOutputV1(
        summary="Rekomendasi dibuat dari kategori wisata yang sudah dikonfirmasi.",
        items=items,
    )


def warning_models(codes: list[str]) -> list[RecommendationWarning]:
    messages = {
        "missing_opening_hours": "Jam buka belum tersedia.",
        "estimated_cost": "Biaya adalah estimasi dan dapat berubah.",
        "missing_photos": "Foto destinasi belum tersedia.",
        "places_unavailable": "Google Places tidak tersedia untuk destinasi ini.",
        "places_partial_match": "Data tempat mungkin perlu dicek ulang.",
        "temporarily_closed": "Tempat ini terdeteksi sementara tutup.",
        "permanently_closed": "Tempat ini terdeteksi tutup permanen.",
    }
    warnings = []
    for code in codes:
        try:
            warning_code = WarningCode(code)
        except ValueError:
            continue
        warnings.append(
            RecommendationWarning(
                code=warning_code,
                message=messages.get(code, "Data destinasi perlu dicek ulang."),
            )
        )
    return warnings
