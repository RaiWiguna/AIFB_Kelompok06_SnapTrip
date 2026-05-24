from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from app.ai.prompts.destination_recommendation import (
    build_finalization_context_payload,
    build_selection_context_payload,
)
from app.core.categories import validate_categories
from app.core.ids import new_id
from app.providers.gemini import GeminiRecommendationProvider, GeminiValidationFailure
from app.providers.google_places import GooglePlacesProvider
from app.schemas.recommendations import (
    AlsoLikePickOutputV1,
    ConfidenceLevel,
    DestinationCardFinalizationOutputV1,
    DestinationSeedSelectionOutputV1,
    EstimatedCost,
    FinalizedCardOutputV1,
    ImageSnap,
    OpeningHoursSummary,
    RecommendationItemOutputV1,
    RecommendationLocation,
    RecommendationRunOutputV1,
    RecommendationWarning,
    SeedPickOutputV1,
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
        confirmed_categories = self._confirmed_categories(session)
        seeds = await self._candidate_seeds(confirmed_categories)
        if not seeds:
            raise HTTPException(status_code=422, detail="No destination seeds match the confirmed categories")

        classifier_context = await self._classifier_context(session)
        selection_context = build_selection_context_payload(
            confirmed_categories=confirmed_categories,
            classifier_mode=self.settings.classifier_mode,
            classifier_model_version=self.settings.classifier_model_version,
            aggregate_confidences=classifier_context["aggregate_confidences"],
            per_image_confidences=classifier_context["per_image_confidences"],
            candidate_destinations=[seed_context(seed) for seed in seeds],
            image_count=classifier_context["image_count"],
        )

        fallback_stages: list[str] = []
        provider_error = None
        try:
            selection = await self.gemini_provider.select_destinations(
                selection_context,
                image_parts=classifier_context["image_parts"],
            )
            self._validate_selection(selection, seeds)
        except GeminiValidationFailure as exc:
            fallback_stages.append("gemini_1")
            provider_error = exc.message
            selection = deterministic_selection(seeds)

        candidates = await self._ground_selection(selection, seeds, confirmed_categories, fallback_stages)
        finalization_context = build_finalization_context_payload(
            confirmed_categories=confirmed_categories,
            candidates=[finalization_candidate_context(candidate) for candidate in candidates],
        )

        try:
            finalization = await self.gemini_provider.finalize_cards(finalization_context)
            self._validate_finalization(finalization, candidates)
        except GeminiValidationFailure as exc:
            fallback_stages.append("gemini_2")
            provider_error = provider_error or exc.message
            finalization = deterministic_finalization(candidates)

        output = build_recommendation_output(
            confirmed_categories=confirmed_categories,
            candidates=candidates,
            finalization=finalization,
            fallback_used=bool(fallback_stages) or not self.gemini_provider.enabled,
        )

        return await self._persist_run(
            session=session,
            output=output,
            provider_error=provider_error,
            fallback_used=bool(fallback_stages) or not self.gemini_provider.enabled,
            candidate_seed_ids=[seed["id"] for seed in seeds],
            selection=selection,
            fallback_stages=fallback_stages,
            places_candidate_ids=[candidate["candidate_id"] for candidate in candidates],
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

    def _confirmed_categories(self, session: dict[str, Any]) -> list[str]:
        try:
            categories = validate_categories(session.get("confirmed_categories") or [])
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Confirmed categories are required") from exc
        if not categories:
            raise HTTPException(status_code=422, detail="Confirmed categories are required")
        return categories

    async def _candidate_seeds(self, categories: list[str]) -> list[dict[str, Any]]:
        seeds = await self.store.list_docs("destinationSeeds")
        matched = [
            seed
            for seed in seeds
            if set(categories).intersection(set(seed.get("categories", [])))
        ]
        return sorted(matched, key=lambda seed: seed["id"])

    async def _classifier_context(self, session: dict[str, Any]) -> dict[str, Any]:
        classification = await latest_classification(self.store, session["id"], session["owner_id"])
        aggregate = (classification or {}).get("aggregated") or []
        per_image = (classification or {}).get("per_image") or []
        image_ids = [*session.get("image_ids", []), *[ref.get("image_id") for ref in session.get("source_image_refs", [])]]
        image_parts = []
        for image_id in [image_id for image_id in image_ids if image_id]:
            image = await self.store.find_one("uploadedImages", id=image_id)
            if not image:
                continue
            image_bytes = await self.store.get_image_bytes(image_id)
            if image_bytes:
                image_parts.append({"data": image_bytes, "mime_type": image.get("content_type") or "image/jpeg"})
        return {
            "aggregate_confidences": aggregate,
            "per_image_confidences": per_image,
            "image_count": len(image_ids),
            "image_parts": image_parts,
        }

    def _validate_selection(self, selection: DestinationSeedSelectionOutputV1, seeds: list[dict[str, Any]]) -> None:
        seed_ids = {seed["id"] for seed in seeds}
        selected_ids = [pick.seed_id for pick in selection.main_seed_picks]
        if len(set(selected_ids)) != 2:
            raise GeminiValidationFailure("Gemini 1 returned duplicate seed picks.", selection.model_dump_json())
        unknown = [seed_id for seed_id in selected_ids if seed_id not in seed_ids]
        if unknown:
            raise GeminiValidationFailure(f"Gemini 1 returned unknown seed IDs: {', '.join(unknown)}", selection.model_dump_json())
        seed_names = {seed["name"].casefold() for seed in seeds}
        duplicated_also_like = [
            pick.name for pick in selection.also_like_picks if pick.name.casefold() in seed_names
        ]
        if duplicated_also_like:
            raise GeminiValidationFailure(
                f"Gemini 1 returned also-like destinations from seeds: {', '.join(duplicated_also_like)}",
                selection.model_dump_json(),
            )

    def _validate_finalization(
        self,
        finalization: DestinationCardFinalizationOutputV1,
        candidates: list[dict[str, Any]],
    ) -> None:
        candidate_ids = {candidate["candidate_id"] for candidate in candidates}
        card_ids = [card.candidate_id for card in finalization.cards]
        if set(card_ids) != candidate_ids or len(set(card_ids)) != len(card_ids):
            raise GeminiValidationFailure("Gemini 2 returned invalid candidate IDs.", finalization.model_dump_json())

    async def _ground_selection(
        self,
        selection: DestinationSeedSelectionOutputV1,
        seeds: list[dict[str, Any]],
        confirmed_categories: list[str],
        fallback_stages: list[str],
    ) -> list[dict[str, Any]]:
        seed_by_id = {seed["id"]: seed for seed in seeds}
        candidates = []
        for pick in sorted(selection.main_seed_picks, key=lambda item: item.rank):
            seed = seed_by_id[pick.seed_id]
            enrichment = await self._get_or_create_enrichment(seed)
            candidates.append(
                {
                    "candidate_id": seed["id"],
                    "candidate_kind": "seed",
                    "seed": seed,
                    "selection": pick,
                    "enrichment": enrichment,
                    "rank": len(candidates) + 1,
                }
            )

        for pick in sorted(selection.also_like_picks, key=lambda item: item.rank):
            candidate_id = new_id("alc")
            enrichment = await self.places_provider.enrich_suggested_place(
                candidate_id=candidate_id,
                name=pick.name,
                search_query=pick.search_query,
                region=pick.region,
                categories=confirmed_categories,
            )
            if enrichment.get("provider") != "google_places":
                fallback_stages.append("also_like_places")
            seed = {
                "id": candidate_id,
                "name": pick.name,
                "categories": confirmed_categories,
                "region": pick.region or "Indonesia",
                "description": f"Destinasi tambahan yang dipilih karena cocok dengan preferensi {', '.join(confirmed_categories)}.",
                "estimated_cost_idr": None,
                "suggested_duration_hours": None,
                "search_query": pick.search_query or pick.name,
                "google_place_id": enrichment.get("provider_place_id"),
            }
            cached = await self._save_enrichment(enrichment)
            candidates.append(
                {
                    "candidate_id": candidate_id,
                    "candidate_kind": "also_like",
                    "seed": seed,
                    "selection": pick,
                    "enrichment": cached,
                    "rank": len(candidates) + 1,
                }
            )
        return candidates

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
        return await self._save_enrichment(enrichment)

    async def _save_enrichment(self, enrichment: dict[str, Any]) -> dict[str, Any]:
        enrichment["expires_at"] = datetime.now(UTC) + timedelta(seconds=self.settings.places_cache_ttl_seconds)
        return await self.store.save_doc("placeEnrichments", enrichment)

    async def _persist_run(
        self,
        *,
        session: dict[str, Any],
        output: RecommendationRunOutputV1,
        provider_error: str | None,
        fallback_used: bool,
        candidate_seed_ids: list[str],
        selection: DestinationSeedSelectionOutputV1,
        fallback_stages: list[str],
        places_candidate_ids: list[str],
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
                "places_candidate_ids": places_candidate_ids,
                "gemini_1_schema_version": selection.schema_version,
                "gemini_2_schema_version": "destination_card_finalization.v1",
                "selection_result": selection.model_dump(mode="json"),
                "fallback_stages": fallback_stages,
                "provider_modes": {
                    "google_places": "enabled" if self.settings.use_google_places else "disabled",
                    "gemini": "enabled" if self.gemini_provider.enabled else "disabled",
                    "gemini_model": self.settings.gemini_model,
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


async def latest_classification(store, session_id: str, owner_id: str) -> dict[str, Any] | None:
    results = await store.list_docs("classificationResults", session_id=session_id, owner_id=owner_id)
    if not results:
        return None
    return sorted(results, key=lambda item: item.get("updated_at") or item.get("created_at"), reverse=True)[0]


def seed_context(seed: dict[str, Any]) -> dict[str, Any]:
    return {
        "seed_id": seed["id"],
        "name": seed["name"],
        "categories": seed.get("categories", []),
        "region": seed["region"],
        "seed_description": seed.get("description"),
        "seed_estimated_cost_idr": seed.get("estimated_cost_idr"),
        "suggested_duration_hours": seed.get("suggested_duration_hours"),
        "search_query": seed.get("search_query"),
    }


def enrichment_context(enrichment: dict[str, Any]) -> dict[str, Any]:
    return {
        "place_enrichment_id": enrichment["id"],
        "seed_id": enrichment["seed_id"],
        "provider": enrichment.get("provider"),
        "provider_place_id": enrichment.get("provider_place_id"),
        "display_name": enrichment.get("display_name"),
        "primary_type_display_name": enrichment.get("primary_type_display_name"),
        "formatted_address": enrichment.get("formatted_address"),
        "location": enrichment.get("location"),
        "rating": enrichment.get("rating"),
        "user_rating_count": enrichment.get("user_rating_count"),
        "website_uri": enrichment.get("website_uri"),
        "google_maps_uri": enrichment.get("google_maps_uri"),
        "opening_hours": enrichment.get("opening_hours"),
        "regular_opening_hours": enrichment.get("regular_opening_hours"),
        "current_opening_hours": enrichment.get("current_opening_hours"),
        "types": enrichment.get("types", []),
        "editorial_summary": enrichment.get("editorial_summary"),
        "generative_summary": enrichment.get("generative_summary"),
        "reviews": enrichment.get("reviews", []),
        "photo_snaps": [
            {
                "photo_id": photo["photo_id"],
                "attribution": photo.get("attribution"),
                "width_px": photo.get("width_px"),
                "height_px": photo.get("height_px"),
            }
            for photo in enrichment.get("photo_snaps", [])
        ],
        "warnings": enrichment.get("warnings", []),
    }


def finalization_candidate_context(candidate: dict[str, Any]) -> dict[str, Any]:
    seed = candidate["seed"]
    enrichment = candidate["enrichment"]
    selection = candidate["selection"]
    return {
        "candidate_id": candidate["candidate_id"],
        "candidate_kind": candidate["candidate_kind"],
        "rank": candidate["rank"],
        "why_its_a_match": selection.why_its_a_match,
        "seed": seed_context(seed),
        "place": enrichment_context(enrichment),
    }


def deterministic_selection(seeds: list[dict[str, Any]]) -> DestinationSeedSelectionOutputV1:
    seed_picks = seeds[:2] if len(seeds) >= 2 else seeds
    while len(seed_picks) < 2:
        seed_picks.append(seeds[0])
    first_category = (seeds[0].get("categories") or ["wisata"])[0]
    also_like_defaults = {
        "pantai": [
            ("Pantai Balangan", "Bali", "Pantai Balangan Bali"),
            ("Pantai Ngobaran", "Yogyakarta", "Pantai Ngobaran Yogyakarta"),
        ],
        "gunung": [
            ("Gunung Sumbing", "Jawa Tengah", "Gunung Sumbing Jawa Tengah"),
            ("Gunung Gede Pangrango", "Jawa Barat", "Gunung Gede Pangrango"),
        ],
        "air_terjun": [
            ("Air Terjun Tegenungan", "Bali", "Air Terjun Tegenungan Bali"),
            ("Curug Cikaso", "Jawa Barat", "Curug Cikaso Sukabumi"),
        ],
        "wisata_tradisional": [
            ("Museum Ullen Sentalu", "Yogyakarta", "Museum Ullen Sentalu Yogyakarta"),
            ("Desa Adat Sade", "Lombok", "Desa Adat Sade Lombok"),
        ],
    }
    also_like = also_like_defaults.get(first_category, also_like_defaults["wisata_tradisional"])
    return DestinationSeedSelectionOutputV1(
        main_seed_picks=[
            SeedPickOutputV1(
                seed_id=seed["id"],
                rank=index,
                why_its_a_match=f"Cocok dengan kategori {', '.join(seed.get('categories', []))} dan profil visual perjalananmu.",
            )
            for index, seed in enumerate(seed_picks[:2], start=1)
        ],
        also_like_picks=[
            AlsoLikePickOutputV1(
                name=name,
                region=region,
                search_query=query,
                rank=index,
                why_its_a_match=f"Masih satu rasa dengan preferensi {first_category}, tetapi memberi variasi rute di luar seed utama.",
            )
            for index, (name, region, query) in enumerate(also_like, start=1)
        ],
    )


def deterministic_finalization(candidates: list[dict[str, Any]]) -> DestinationCardFinalizationOutputV1:
    cards = []
    for candidate in candidates:
        seed = candidate["seed"]
        enrichment = candidate["enrichment"]
        reviews = enrichment.get("reviews") or []
        review_summary = "Ringkasan review belum tersedia dari Google Places."
        if reviews:
            snippets = [review.get("text") for review in reviews if review.get("text")]
            if snippets:
                review_summary = snippets[0][:260]
        cards.append(
            FinalizedCardOutputV1(
                candidate_id=candidate["candidate_id"],
                description=enrichment.get("editorial_summary")
                or enrichment.get("generative_summary")
                or seed.get("description")
                or "Destinasi ini cocok untuk dimasukkan ke rencana perjalanan.",
                review_summary=review_summary,
                normalized_address=enrichment.get("formatted_address") or seed.get("region") or "Indonesia",
                normalized_opening_hours=(enrichment.get("opening_hours") or {}).get("summary") or "Jam buka belum tersedia.",
                warnings=enrichment.get("warnings", []),
            )
        )
    return DestinationCardFinalizationOutputV1(cards=cards)


def build_recommendation_output(
    *,
    confirmed_categories: list[str],
    candidates: list[dict[str, Any]],
    finalization: DestinationCardFinalizationOutputV1,
    fallback_used: bool,
) -> RecommendationRunOutputV1:
    final_by_id = {card.candidate_id: card for card in finalization.cards}
    items = []
    for candidate in candidates:
        seed = candidate["seed"]
        enrichment = candidate["enrichment"]
        final = final_by_id[candidate["candidate_id"]]
        top_photo = image_snaps(enrichment)[:1]
        items.append(
            RecommendationItemOutputV1(
                seed_id=seed["id"],
                place_enrichment_id=enrichment["id"],
                rank=candidate["rank"],
                name=enrichment.get("display_name") or seed["name"],
                categories=seed.get("categories") or confirmed_categories,
                region=seed.get("region") or "Indonesia",
                short_summary=final.description,
                description=final.description,
                match_reason=candidate["selection"].why_its_a_match,
                review_summary=final.review_summary,
                opening_hours_summary=OpeningHoursSummary(
                    status=(enrichment.get("opening_hours") or {}).get("status") or "unavailable",
                    summary=final.normalized_opening_hours,
                ),
                estimated_cost=EstimatedCost(
                    amount_idr=seed.get("estimated_cost_idr"),
                    label=estimated_cost_label(seed.get("estimated_cost_idr")),
                    source=SourceType.curated_seed,
                    is_estimate=True,
                ),
                location=RecommendationLocation(
                    address=final.normalized_address,
                    lat=(enrichment.get("location") or {}).get("lat"),
                    lng=(enrichment.get("location") or {}).get("lng"),
                    google_maps_uri=enrichment.get("google_maps_uri"),
                ),
                image_snaps=image_snaps(enrichment),
                photo=top_photo[0] if top_photo else None,
                rating=enrichment.get("rating"),
                user_rating_count=enrichment.get("user_rating_count"),
                website_uri=enrichment.get("website_uri"),
                google_maps_uri=enrichment.get("google_maps_uri"),
                primary_type_display_name=enrichment.get("primary_type_display_name"),
                normalized_address=final.normalized_address,
                normalized_opening_hours=final.normalized_opening_hours,
                warnings=warning_models([*enrichment.get("warnings", []), *final.warnings, *(["provider_fallback"] if fallback_used else [])]),
                source_notes=[
                    SourceNote(
                        source=SourceType.google_places if enrichment.get("provider") == "google_places" else SourceType.curated_seed,
                        note="Data faktual kartu berasal dari Google Places dan seed kurasi SnapTrip.",
                    )
                ],
                confidence=ConfidenceLevel.high if enrichment.get("provider") == "google_places" and not fallback_used else ConfidenceLevel.medium,
            )
        )
    return RecommendationRunOutputV1(
        summary="Rekomendasi dibuat dari pilihan awal Gemini, lalu digrounding ulang memakai Google Places.",
        items=items,
    )


def image_snaps(enrichment: dict[str, Any]) -> list[ImageSnap]:
    return [
        ImageSnap(
            photo_id=photo["photo_id"],
            url=f"/api/place-photos/{photo['photo_id']}",
            attribution=photo.get("attribution"),
            width_px=photo.get("width_px"),
            height_px=photo.get("height_px"),
        )
        for photo in enrichment.get("photo_snaps", [])[:5]
    ]


def estimated_cost_label(amount: int | None) -> str:
    if amount is None:
        return "Estimasi biaya belum tersedia"
    return f"Estimasi mulai Rp{amount:,}".replace(",", ".")


def warning_models(codes: list[str]) -> list[RecommendationWarning]:
    messages = {
        "missing_opening_hours": "Jam buka belum tersedia.",
        "estimated_cost": "Biaya adalah estimasi dan dapat berubah.",
        "missing_photos": "Foto destinasi belum tersedia.",
        "places_unavailable": "Google Places tidak tersedia untuk destinasi ini.",
        "places_partial_match": "Data tempat mungkin perlu dicek ulang.",
        "places_text_search_fallback": "Lookup memakai text search karena place ID tidak tersedia.",
        "places_text_search_grounding": "Destinasi tambahan digrounding melalui Google Places text search.",
        "places_id_lookup_failed": "Lookup place ID gagal dan memakai fallback text search.",
        "temporarily_closed": "Tempat ini terdeteksi sementara tutup.",
        "permanently_closed": "Tempat ini terdeteksi tutup permanen.",
        "provider_fallback": "Sebagian rekomendasi memakai fallback karena provider tidak lengkap.",
    }
    unique_codes = []
    for code in codes:
        if code not in unique_codes:
            unique_codes.append(code)
    warnings = []
    for code in unique_codes:
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
