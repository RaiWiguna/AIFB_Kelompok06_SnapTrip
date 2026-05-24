import sys
import types as pytypes

import httpx
import pytest
from conftest import signup

from app.core.observability import AiObservabilityRecorder
from app.db.seeds import DESTINATION_SEEDS
from app.providers.gemini import GeminiRecommendationProvider, GeminiValidationFailure
from app.providers.google_places import (
    TEXT_SEARCH_FIELD_MASK,
    GooglePlacesProvider,
    normalize_place,
)
from app.schemas.recommendations import (
    AlsoLikePickOutputV1,
    DestinationCardFinalizationOutputV1,
    DestinationSeedSelectionOutputV1,
    FinalizedCardOutputV1,
    SeedPickOutputV1,
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
    assert body["run"]["trace_id"].startswith("trc_")
    assert body["run"]["observability"]["enabled"] is True
    assert body["run"]["observability"]["raw_llm_enabled"] is True
    assert body["run"]["observability"]["event_count"] > 0
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
    events = client.app.state.store.collections["aiObservabilityEvents"].values()
    run_events = [event for event in events if event["trace_id"] == body["run"]["trace_id"]]
    assert "flow2_run_started" in {event["event"] for event in run_events}
    assert "flow2_gemini_1_fallback" in {event["event"] for event in run_events}
    assert "flow2_gemini_2_fallback" in {event["event"] for event in run_events}
    assert "flow2_run_completed" in {event["event"] for event in run_events}
    fallback_event = next(event for event in run_events if event["event"] == "flow2_gemini_1_fallback")
    assert fallback_event["payload"]["error_message"] == "Gemini 1 provider unavailable or request failed."


def test_destination_seeds_are_fixed_ten_per_category():
    counts = {}
    for seed in DESTINATION_SEEDS:
        assert seed["google_place_id"]
        assert seed["search_query"]
        for category in seed["categories"]:
            counts[category] = counts.get(category, 0) + 1
    assert counts == {
        "pantai": 10,
        "gunung": 10,
        "air_terjun": 10,
        "wisata_tradisional": 10,
    }


def test_recommendation_requires_confirmed_categories(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]

    generated = client.post(f"/api/trip-creation-sessions/{session_id}/recommendations")
    assert generated.status_code == 422


@pytest.mark.asyncio
async def test_place_photo_proxy_uses_header_api_key(client, monkeypatch):
    signup(client)
    settings = client.app.state.settings
    settings.use_google_places = True
    settings.google_places_api_key = "places-secret"
    captured = {}

    await client.app.state.store.save_doc(
        "placeEnrichments",
        {
            "id": "plc_photo_proxy",
            "photo_snaps": [
                {
                    "photo_id": "pho_proxy",
                    "provider_photo_name": "places/place-1/photos/photo-1",
                    "attribution": "Google User",
                }
            ],
        },
    )

    class FakePhotoClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, headers, params, follow_redirects):
            captured["url"] = url
            captured["headers"] = headers
            captured["params"] = params
            captured["follow_redirects"] = follow_redirects
            request = httpx.Request("GET", url, headers=headers, params=params)
            return httpx.Response(
                200,
                request=request,
                content=b"image-bytes",
                headers={"content-type": "image/jpeg"},
            )

    monkeypatch.setattr(httpx, "AsyncClient", FakePhotoClient)

    response = client.get("/api/place-photos/pho_proxy")

    assert response.status_code == 200
    assert response.content == b"image-bytes"
    assert captured["headers"] == {"X-Goog-Api-Key": "places-secret"}
    assert "key" not in captured["params"]
    assert "places-secret" not in captured["url"]
    assert captured["url"] == "https://places.googleapis.com/v1/places/place-1/photos/photo-1/media"
    assert captured["follow_redirects"] is True


@pytest.mark.asyncio
async def test_place_photo_proxy_rejects_malformed_provider_photo_name(client, monkeypatch):
    signup(client)
    settings = client.app.state.settings
    settings.use_google_places = True
    settings.google_places_api_key = "places-secret"

    await client.app.state.store.save_doc(
        "placeEnrichments",
        {
            "id": "plc_photo_malformed",
            "photo_snaps": [
                {
                    "photo_id": "pho_malformed",
                    "provider_photo_name": "https://evil.test/photos/photo-1",
                    "attribution": "Google User",
                    "width_px": 800,
                }
            ],
        },
    )

    class FailingPhotoClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            raise AssertionError("malformed provider photo name should not be fetched")

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(httpx, "AsyncClient", FailingPhotoClient)

    response = client.get("/api/place-photos/pho_malformed")

    assert response.status_code == 200
    assert response.json()["photo"] == {
        "id": "pho_malformed",
        "provider": "google_places",
        "attribution": "Google User",
        "width_px": 800,
        "height_px": None,
    }


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
    assert result["run"]["schema_version"] == "destination_recommendation.v2"
    assert len(result["items"]) == 4
    assert result["items"][0]["name"] == "Pantai Kuta"
    assert result["items"][0]["review_summary"] == "Review positif menyorot akses mudah dan suasana pantai."
    assert result["items"][0]["website_uri"] == "https://example.test/place"
    assert result["items"][0]["google_maps_uri"] == "https://maps.google.com/?cid=1"
    assert result["items"][0]["primary_type_display_name"] == "Beach"
    context = gemini_provider.selection_contexts[0]
    assert context["schema_version"] == "destination_seed_selection.v1"
    assert context["confirmed_categories"] == ["pantai"]
    assert "candidate_destinations" in context
    assert context["classifier_summary"]["aggregate_confidences"] == []
    assert gemini_provider.finalization_contexts[0]["schema_version"] == "destination_card_finalization.v1"
    assert "raw_prompt" not in context


@pytest.mark.asyncio
async def test_service_falls_back_when_gemini_selection_fails(client):
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
    gemini_provider = FailingGeminiProvider()
    service = RecommendationService(
        store=client.app.state.store,
        settings=settings,
        places_provider=FakePlacesProvider(),
        gemini_provider=gemini_provider,
    )

    result = await service.generate_for_session(session_id, user)

    assert result["run"]["fallback_used"] is True
    assert "gemini_1" in result["run"]["fallback_stages"]
    assert len(result["items"]) == 4


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
            "userRatingCount": 120,
            "websiteUri": "https://example.test/place",
            "types": ["beach", "establishment"],
            "primaryTypeDisplayName": {"text": "Beach"},
            "reviews": [
                {
                    "rating": 5,
                    "relativePublishTimeDescription": "a week ago",
                    "text": {"text": "Great beach."},
                    "authorAttribution": {"displayName": "Traveler"},
                }
            ],
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
    assert normalized["primary_type_display_name"] == "Beach"
    assert normalized["user_rating_count"] == 120
    assert normalized["website_uri"] == "https://example.test/place"
    assert normalized["reviews"][0]["text"] == "Great beach."
    assert normalized["photo_snaps"][0]["photo_id"].startswith("pho_")
    assert normalized["photo_snaps"][0]["provider_photo_name"] == "places/places-id/photos/photo-1"


@pytest.mark.asyncio
async def test_places_enrichment_falls_back_to_text_search_when_place_id_fails(client):
    settings = client.app.state.settings
    settings.use_google_places = True
    settings.google_places_api_key = "fake-places-key"
    provider = PlaceIdFailurePlacesProvider(settings)

    enriched = await provider.enrich_seed(
        {
            "id": "dest_stale",
            "name": "Stale Place",
            "region": "Indonesia",
            "categories": ["pantai"],
            "search_query": "Fresh Place Indonesia",
            "google_place_id": "stale-place-id",
        }
    )

    assert provider.details_calls == ["stale-place-id", "fresh-place-id"]
    assert provider.search_queries == ["Fresh Place Indonesia"]
    assert enriched["provider"] == "google_places"
    assert enriched["provider_place_id"] == "fresh-place-id"
    assert "places_id_lookup_failed" in enriched["warnings"]
    assert "places_text_search_fallback" in enriched["warnings"]


def test_text_search_field_mask_stays_resolution_scoped():
    assert "places.id" in TEXT_SEARCH_FIELD_MASK
    assert "places.reviews" not in TEXT_SEARCH_FIELD_MASK
    assert "places.photos" not in TEXT_SEARCH_FIELD_MASK
    assert "places.generativeSummary" not in TEXT_SEARCH_FIELD_MASK


@pytest.mark.asyncio
async def test_gemini_provider_observes_raw_prompt_and_response_by_default(monkeypatch, client):
    install_fake_gemini(monkeypatch)
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"
    recorder = AiObservabilityRecorder(store=client.app.state.store, settings=settings)
    provider = GeminiRecommendationProvider(settings, observability=recorder)

    await provider.select_destinations(
        {"schema_version": "destination_seed_selection.v1", "hello": "world"},
        trace_context={
            "trace_id": "trc_raw_default",
            "flow": "flow2",
            "stage": "gemini_1",
            "event_prefix": "flow2_gemini_1",
            "session_id": "tcs_raw",
            "owner_id": "usr_raw",
        },
    )

    events = await client.app.state.store.list_docs("aiObservabilityEvents", trace_id="trc_raw_default")
    prompt_event = next(event for event in events if event["event"] == "flow2_gemini_1_prompt_prepared")
    completed_event = next(event for event in events if event["event"] == "flow2_gemini_1_completed")
    assert prompt_event["payload"]["raw_prompt_text"]
    assert '"hello": "world"' in prompt_event["payload"]["raw_prompt_text"]
    assert completed_event["payload"]["raw_response_text"]
    assert "main_seed_picks" in completed_event["payload"]["raw_response_text"]


@pytest.mark.asyncio
async def test_gemini_provider_can_disable_raw_llm_text(monkeypatch, client):
    install_fake_gemini(monkeypatch)
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"
    settings.ai_raw_llm_observability = False
    recorder = AiObservabilityRecorder(store=client.app.state.store, settings=settings)
    provider = GeminiRecommendationProvider(settings, observability=recorder)

    await provider.select_destinations(
        {"schema_version": "destination_seed_selection.v1", "hello": "world"},
        trace_context={
            "trace_id": "trc_raw_disabled",
            "flow": "flow2",
            "stage": "gemini_1",
            "event_prefix": "flow2_gemini_1",
            "session_id": "tcs_raw",
            "owner_id": "usr_raw",
        },
    )

    events = await client.app.state.store.list_docs("aiObservabilityEvents", trace_id="trc_raw_disabled")
    prompt_event = next(event for event in events if event["event"] == "flow2_gemini_1_prompt_prepared")
    completed_event = next(event for event in events if event["event"] == "flow2_gemini_1_completed")
    assert "raw_prompt_text" not in prompt_event["payload"]
    assert "raw_response_text" not in completed_event["payload"]
    assert prompt_event["payload"]["prompt_sha256"]
    assert completed_event["payload"]["response_sha256"]


@pytest.mark.asyncio
async def test_gemini_provider_observes_validation_failure_raw_response(monkeypatch, client):
    install_fake_gemini(monkeypatch, raw_text='{"broken": true}')
    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"
    recorder = AiObservabilityRecorder(store=client.app.state.store, settings=settings)
    provider = GeminiRecommendationProvider(settings, observability=recorder)

    with pytest.raises(GeminiValidationFailure):
        await provider.select_destinations(
            {"schema_version": "destination_seed_selection.v1"},
            trace_context={
                "trace_id": "trc_invalid_raw",
                "flow": "flow2",
                "stage": "gemini_1",
                "event_prefix": "flow2_gemini_1",
                "session_id": "tcs_raw",
                "owner_id": "usr_raw",
            },
        )

    events = await client.app.state.store.list_docs("aiObservabilityEvents", trace_id="trc_invalid_raw")
    completed_event = next(event for event in events if event["event"] == "flow2_gemini_1_completed")
    assert completed_event["status"] == "validation_failed"
    assert completed_event["payload"]["raw_response_text"] == '{"broken": true}'
    assert completed_event["payload"]["safe_message"] == "Gemini output validation failed."
    assert "input_value" not in str(completed_event["payload"])
    assert "validation_error" not in completed_event["payload"]


@pytest.mark.asyncio
async def test_places_provider_observes_text_search_and_details(monkeypatch, client):
    settings = client.app.state.settings
    settings.use_google_places = True
    settings.google_places_api_key = "fake-places-key"
    monkeypatch.setattr(httpx, "AsyncClient", lambda timeout: FakePlacesHttpClient())
    recorder = AiObservabilityRecorder(store=client.app.state.store, settings=settings)
    provider = GooglePlacesProvider(settings, observability=recorder)
    trace_context = {
        "trace_id": "trc_places",
        "flow": "flow2",
        "stage": "places_api",
        "session_id": "tcs_places",
        "owner_id": "usr_places",
    }

    place = await provider.search_text("Pantai Kuta Bali", trace_context=trace_context)
    details = await provider.get_place_details(place["id"], trace_context=trace_context)

    assert details["id"] == "place-1"
    events = await client.app.state.store.list_docs("aiObservabilityEvents", trace_id="trc_places")
    text_event = next(event for event in events if event["event"] == "flow2_places_text_search_completed")
    details_event = next(event for event in events if event["event"] == "flow2_places_details_completed")
    assert text_event["payload"]["query"] == "Pantai Kuta Bali"
    assert text_event["payload"]["selected_place_id"] == "place-1"
    assert details_event["payload"]["field_coverage"]["has_rating"] is True
    assert details_event["payload"]["field_mask"]


@pytest.mark.asyncio
async def test_observability_truncates_oversized_text_fields(client):
    settings = client.app.state.settings
    settings.ai_observability_max_field_bytes = 8
    recorder = AiObservabilityRecorder(store=client.app.state.store, settings=settings)

    await recorder.emit(
        trace_id="trc_truncate",
        flow="flow2",
        stage="gemini_1",
        event="flow2_gemini_1_prompt_prepared",
        payload={"raw_prompt_text": "x" * 20},
    )

    event = (await client.app.state.store.list_docs("aiObservabilityEvents", trace_id="trc_truncate"))[0]
    assert event["payload"]["raw_prompt_text"]["truncated"] is True
    assert event["payload"]["raw_prompt_text"]["original_bytes"] == 20


@pytest.mark.asyncio
async def test_gemini_provider_passes_configured_model(monkeypatch, client):
    captured = {}

    class FakeClient:
        class models:
            @staticmethod
            def generate_content(*, model, contents, config):
                captured["model"] = model
                return pytypes.SimpleNamespace(
                    text='{"schema_version":"destination_seed_selection.v1","main_seed_picks":[{"seed_id":"dest_a","rank":1,"why_its_a_match":"a"},{"seed_id":"dest_b","rank":2,"why_its_a_match":"b"}],"also_like_picks":[{"name":"Pantai Baru","rank":1,"why_its_a_match":"c"},{"name":"Gunung Baru","rank":2,"why_its_a_match":"d"}]}',
                    parsed=None,
                )

    class FakeGenerateContentConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    fake_types = pytypes.SimpleNamespace(
        GenerateContentConfig=FakeGenerateContentConfig,
        SafetySetting=lambda **kwargs: kwargs,
        HarmCategory=pytypes.SimpleNamespace(
            HARM_CATEGORY_DANGEROUS_CONTENT="danger",
            HARM_CATEGORY_HATE_SPEECH="hate",
            HARM_CATEGORY_HARASSMENT="harassment",
            HARM_CATEGORY_SEXUALLY_EXPLICIT="sexual",
        ),
        HarmBlockThreshold=pytypes.SimpleNamespace(BLOCK_LOW_AND_ABOVE="low"),
        Part=pytypes.SimpleNamespace(from_bytes=lambda **kwargs: kwargs),
    )
    fake_genai = pytypes.SimpleNamespace(Client=lambda: FakeClient(), types=fake_types)
    fake_google = pytypes.SimpleNamespace(genai=fake_genai)
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.genai", fake_genai)
    monkeypatch.setitem(sys.modules, "google.genai.types", fake_types)

    settings = client.app.state.settings
    settings.use_gemini = True
    settings.gemini_api_key = "fake-key"
    settings.google_api_key = ""
    settings.gemini_model = "gemini-3.5-flash"
    provider = GeminiRecommendationProvider(settings)

    await provider.select_destinations({"schema_version": "destination_seed_selection.v1"})

    assert captured["model"] == "gemini-3.5-flash"


def install_fake_gemini(monkeypatch, raw_text=None):
    response_text = raw_text or (
        '{"schema_version":"destination_seed_selection.v1",'
        '"main_seed_picks":['
        '{"seed_id":"dest_a","rank":1,"why_its_a_match":"a"},'
        '{"seed_id":"dest_b","rank":2,"why_its_a_match":"b"}],'
        '"also_like_picks":['
        '{"name":"Pantai Baru","rank":1,"why_its_a_match":"c"},'
        '{"name":"Gunung Baru","rank":2,"why_its_a_match":"d"}]}'
    )

    class FakeClient:
        class models:
            @staticmethod
            def generate_content(*, model, contents, config):
                return pytypes.SimpleNamespace(text=response_text, parsed=None)

    class FakeGenerateContentConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    fake_types = pytypes.SimpleNamespace(
        GenerateContentConfig=FakeGenerateContentConfig,
        SafetySetting=lambda **kwargs: kwargs,
        HarmCategory=pytypes.SimpleNamespace(
            HARM_CATEGORY_DANGEROUS_CONTENT="danger",
            HARM_CATEGORY_HATE_SPEECH="hate",
            HARM_CATEGORY_HARASSMENT="harassment",
            HARM_CATEGORY_SEXUALLY_EXPLICIT="sexual",
        ),
        HarmBlockThreshold=pytypes.SimpleNamespace(BLOCK_LOW_AND_ABOVE="low"),
        Part=pytypes.SimpleNamespace(from_bytes=lambda **kwargs: kwargs),
    )
    fake_genai = pytypes.SimpleNamespace(Client=lambda: FakeClient(), types=fake_types)
    fake_google = pytypes.SimpleNamespace(genai=fake_genai)
    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.genai", fake_genai)
    monkeypatch.setitem(sys.modules, "google.genai.types", fake_types)


class FakePlacesHttpClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers, json):
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            request=request,
            json={
                "places": [
                    {
                        "id": "place-1",
                        "name": "places/place-1",
                        "displayName": {"text": "Pantai Kuta"},
                        "formattedAddress": "Kuta, Bali",
                    }
                ]
            },
        )

    async def get(self, url, headers):
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            request=request,
            json={
                "id": "place-1",
                "name": "places/place-1",
                "displayName": {"text": "Pantai Kuta"},
                "formattedAddress": "Kuta, Bali",
                "location": {"latitude": -8.7, "longitude": 115.1},
                "rating": 4.5,
                "userRatingCount": 100,
                "googleMapsUri": "https://maps.google.com/?cid=1",
            },
        )


class FakePlacesProvider:
    async def enrich_seed(self, seed, trace_context=None):
        return {
            "id": "plc_fake_" + seed["id"],
            "seed_id": seed["id"],
            "provider": "google_places",
            "provider_place_id": seed.get("google_place_id") or "fake-place-id",
            "display_name": seed["name"],
            "primary_type_display_name": "Beach",
            "formatted_address": seed["region"],
            "location": {"lat": -8.718, "lng": 115.168},
            "rating": 4.5,
            "user_rating_count": 120,
            "website_uri": "https://example.test/place",
            "google_maps_uri": "https://maps.google.com/?cid=1",
            "opening_hours": {"status": "available", "summary": "Senin-Minggu 08.00-18.00"},
            "regular_opening_hours": {"weekdayDescriptions": ["Senin-Minggu 08.00-18.00"]},
            "current_opening_hours": {"weekdayDescriptions": ["Senin-Minggu 08.00-18.00"]},
            "price_level": "PRICE_LEVEL_INEXPENSIVE",
            "business_status": "OPERATIONAL",
            "types": ["beach", "establishment"],
            "editorial_summary": "Pantai yang populer untuk sunset.",
            "generative_summary": None,
            "reviews": [{"rating": 5, "text": "Great beach."}],
            "photo_snaps": [
                {
                    "photo_id": "pho_fake_" + seed["id"],
                    "provider_photo_name": "places/fake/photos/1",
                    "attribution": "Google User",
                }
            ],
            "warnings": [],
        }

    async def enrich_suggested_place(
        self,
        *,
        candidate_id,
        name,
        search_query=None,
        region=None,
        categories=None,
        trace_context=None,
    ):
        return await self.enrich_seed(
            {
                "id": candidate_id,
                "name": name,
                "region": region or "Indonesia",
                "categories": categories or ["pantai"],
                "google_place_id": "fake-suggested-place-id",
            }
        )


class FakeGeminiProvider:
    enabled = True

    def __init__(self):
        self.selection_contexts = []
        self.finalization_contexts = []

    async def select_destinations(self, context, image_parts=None, trace_context=None):
        self.selection_contexts.append(context)
        return DestinationSeedSelectionOutputV1(
            main_seed_picks=[
                SeedPickOutputV1(
                    seed_id=context["candidate_destinations"][0]["seed_id"],
                    rank=1,
                    why_its_a_match="Cocok dengan preferensi pantai dari gambar.",
                ),
                SeedPickOutputV1(
                    seed_id=context["candidate_destinations"][1]["seed_id"],
                    rank=2,
                    why_its_a_match="Memberi variasi pantai yang tetap santai.",
                ),
            ],
            also_like_picks=[
                AlsoLikePickOutputV1(
                    name="Pantai Balangan",
                    region="Bali",
                    search_query="Pantai Balangan Bali",
                    rank=1,
                    why_its_a_match="Alternatif pantai dengan suasana tebing.",
                ),
                AlsoLikePickOutputV1(
                    name="Pantai Ngobaran",
                    region="Yogyakarta",
                    search_query="Pantai Ngobaran Yogyakarta",
                    rank=2,
                    why_its_a_match="Alternatif pantai dengan sentuhan budaya.",
                ),
            ],
        )

    async def finalize_cards(self, context, trace_context=None):
        self.finalization_contexts.append(context)
        return DestinationCardFinalizationOutputV1(
            cards=[
                FinalizedCardOutputV1(
                    candidate_id=candidate["candidate_id"],
                    description="Deskripsi final berbasis data Places.",
                    review_summary="Review positif menyorot akses mudah dan suasana pantai.",
                    normalized_address=candidate["place"]["formatted_address"] or "Bali",
                    normalized_opening_hours="Buka setiap hari menurut data Places.",
                )
                for candidate in context["candidates"]
            ]
        )


class PlaceIdFailurePlacesProvider(GooglePlacesProvider):
    def __init__(self, settings):
        super().__init__(settings)
        self.details_calls = []
        self.search_queries = []

    async def get_place_details(self, place_id, trace_context=None):
        self.details_calls.append(place_id)
        if place_id == "stale-place-id":
            request = httpx.Request("GET", "https://places.googleapis.com/v1/places/stale-place-id")
            response = httpx.Response(404, request=request)
            raise httpx.HTTPStatusError("not found", request=request, response=response)
        return {
            "id": place_id,
            "name": f"places/{place_id}",
            "displayName": {"text": "Fresh Place"},
            "formattedAddress": "Indonesia",
            "location": {"latitude": -8.0, "longitude": 115.0},
            "businessStatus": "OPERATIONAL",
        }

    async def search_text(self, query, trace_context=None):
        self.search_queries.append(query)
        return {"id": "fresh-place-id"}


class FailingGeminiProvider(FakeGeminiProvider):
    async def select_destinations(self, context, image_parts=None, trace_context=None):
        self.selection_contexts.append(context)
        raise GeminiValidationFailure("broken JSON", "{")
