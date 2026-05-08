import pytest
from conftest import signup

from app.providers.gemini import GeminiValidationFailure
from app.providers.google_places import normalize_place
from app.schemas.recommendations import (
    ConfidenceLevel,
    EstimatedCost,
    OpeningHoursSummary,
    RecommendationItemOutputV1,
    RecommendationLocation,
    RecommendationRunOutputV1,
    SourceNote,
    SourceType,
)
from app.services.recommendations import RecommendationService


def create_confirmed_session(client, categories=None):
    signup(client)
    created = client.post("/api/trip-creation-sessions", json={"source": "upload"})
    assert created.status_code == 201
    session_id = created.json()["session"]["id"]
    confirmed = client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": categories or ["pantai"]},
    )
    assert confirmed.status_code == 200
    return session_id


def test_recommendation_api_uses_deterministic_fallback_when_providers_disabled(client):
    session_id = create_confirmed_session(client, ["pantai"])

    generated = client.post(f"/api/trip-creation-sessions/{session_id}/recommendations")
    assert generated.status_code == 200
    body = generated.json()
    assert body["run"]["fallback_used"] is True
    assert body["items"]
    assert body["items"][0]["id"].startswith("reci_")
    assert body["items"][0]["seed_id"].startswith("dest_")
    assert body["items"][0]["estimated_cost"]["is_estimate"] is True
    assert "raw_output" not in body["run"]

    runs = client.get(f"/api/trip-creation-sessions/{session_id}/recommendations")
    assert runs.status_code == 200
    assert runs.json()["runs"][0]["id"] == body["run"]["id"]

    fetched = client.get(f"/api/recommendation-runs/{body['run']['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["items"][0]["id"] == body["items"][0]["id"]

    selected = client.post(
        f"/api/trip-creation-sessions/{session_id}/selected-recommendations",
        json={"recommendation_item_ids": [body["items"][0]["id"]]},
    )
    assert selected.status_code == 200
    assert selected.json()["selected_recommendation_ids"] == [body["items"][0]["id"]]


def test_recommendation_requires_confirmed_categories(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]

    generated = client.post(f"/api/trip-creation-sessions/{session_id}/recommendations")
    assert generated.status_code == 422


@pytest.mark.asyncio
async def test_service_sends_grounded_context_to_gemini_and_persists_output(client):
    user = signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": ["pantai"]},
    )
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"

    places_provider = FakePlacesProvider()
    gemini_provider = FakeGeminiProvider()
    service = RecommendationService(
        store=client.app.state.store,
        settings=settings,
        places_provider=places_provider,
        gemini_provider=gemini_provider,
    )

    result = await service.generate_for_session(session_id, user)

    assert result["run"]["fallback_used"] is False
    assert result["items"][0]["name"] == "Pantai Kuta"
    context = gemini_provider.contexts[0]
    assert context["schema_version"] == "destination_recommendation.v1"
    assert context["confirmed_categories"] == ["pantai"]
    assert "candidate_destinations" in context
    assert "place_enrichments" in context
    assert "raw_prompt" not in context


@pytest.mark.asyncio
async def test_service_repairs_invalid_gemini_output_once(client):
    user = signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": ["pantai"]},
    )
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"
    gemini_provider = RepairingGeminiProvider()
    service = RecommendationService(
        store=client.app.state.store,
        settings=settings,
        places_provider=FakePlacesProvider(),
        gemini_provider=gemini_provider,
    )

    result = await service.generate_for_session(session_id, user)

    assert result["run"]["fallback_used"] is False
    assert gemini_provider.repair_called is True


def test_places_normalization_shapes_ui_safe_photo_metadata():
    seed = {"id": "dest_kuta_beach", "name": "Pantai Kuta"}
    normalized = normalize_place(
        seed,
        {
            "id": "places-id",
            "name": "places/places-id",
            "displayName": {"text": "Pantai Kuta"},
            "formattedAddress": "Kuta, Bali",
            "location": {"latitude": -8.718, "longitude": 115.168},
            "rating": 4.5,
            "regularOpeningHours": {"weekdayDescriptions": ["Senin: 08.00-18.00"]},
            "businessStatus": "OPERATIONAL",
            "priceLevel": "PRICE_LEVEL_INEXPENSIVE",
            "photos": [
                {
                    "name": "places/places-id/photos/photo-1",
                    "widthPx": 1200,
                    "heightPx": 800,
                    "authorAttributions": [{"displayName": "Google User"}],
                }
            ],
            "googleMapsUri": "https://maps.google.com/?cid=1",
        },
    )

    assert normalized["provider"] == "google_places"
    assert normalized["opening_hours"]["status"] == "available"
    assert normalized["photo_snaps"][0]["photo_id"].startswith("pho_")
    assert normalized["photo_snaps"][0]["provider_photo_name"] == "places/places-id/photos/photo-1"


class FakePlacesProvider:
    async def enrich_seed(self, seed):
        return {
            "id": "plc_fake_" + seed["id"],
            "seed_id": seed["id"],
            "provider": "google_places",
            "display_name": seed["name"],
            "formatted_address": seed["region"],
            "location": {"lat": -8.718, "lng": 115.168},
            "rating": 4.5,
            "google_maps_uri": "https://maps.google.com/?cid=1",
            "opening_hours": {"status": "available", "summary": "Senin-Minggu 08.00-18.00"},
            "price_level": "PRICE_LEVEL_INEXPENSIVE",
            "business_status": "OPERATIONAL",
            "photo_snaps": [
                {
                    "photo_id": "pho_fake_" + seed["id"],
                    "provider_photo_name": "places/fake/photos/1",
                    "attribution": "Google User",
                }
            ],
            "warnings": [],
        }


class FakeGeminiProvider:
    enabled = True

    def __init__(self):
        self.contexts = []

    async def generate(self, context):
        self.contexts.append(context)
        seed = context["candidate_destinations"][0]
        enrichment = context["place_enrichments"][0]
        return output_for(seed, enrichment)

    async def repair(self, *, context, validation_errors, previous_output):
        return await self.generate(context)


class RepairingGeminiProvider(FakeGeminiProvider):
    def __init__(self):
        super().__init__()
        self.repair_called = False

    async def generate(self, context):
        self.contexts.append(context)
        raise GeminiValidationFailure("broken JSON", "{")

    async def repair(self, *, context, validation_errors, previous_output):
        self.repair_called = True
        seed = context["candidate_destinations"][0]
        enrichment = context["place_enrichments"][0]
        return output_for(seed, enrichment)


def output_for(seed, enrichment):
    return RecommendationRunOutputV1(
        summary="Rekomendasi siap ditampilkan.",
        items=[
            RecommendationItemOutputV1(
                seed_id=seed["seed_id"],
                place_enrichment_id=enrichment["place_enrichment_id"],
                rank=1,
                name=seed["name"],
                categories=seed["categories"],
                region=seed["region"],
                short_summary="Destinasi pantai untuk rencana liburan santai.",
                description="Pantai ini cocok untuk menikmati suasana pesisir dan sunset.",
                match_reason="Sesuai dengan kategori pantai yang dikonfirmasi.",
                opening_hours_summary=OpeningHoursSummary(status="available", summary="Senin-Minggu 08.00-18.00"),
                estimated_cost=EstimatedCost(
                    amount_idr=seed["seed_estimated_cost_idr"],
                    label="Estimasi mulai Rp150.000",
                    source=SourceType.curated_seed,
                    is_estimate=True,
                ),
                location=RecommendationLocation(
                    address="Kuta, Bali",
                    lat=-8.718,
                    lng=115.168,
                    google_maps_uri="https://maps.google.com/?cid=1",
                ),
                image_snaps=[
                    {
                        "photo_id": enrichment["photo_snaps"][0]["photo_id"],
                        "url": f"/api/place-photos/{enrichment['photo_snaps'][0]['photo_id']}",
                        "attribution": "Google User",
                    }
                ],
                warnings=[],
                source_notes=[
                    SourceNote(source=SourceType.gemini, note="Disusun dari data kurasi dan Google Places.")
                ],
                confidence=ConfidenceLevel.high,
            )
        ],
    )
