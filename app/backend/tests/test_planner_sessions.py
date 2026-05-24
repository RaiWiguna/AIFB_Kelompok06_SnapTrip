import pytest
from conftest import signup

from app.schemas.planner import PlannerAgentStepV1, PlannerMessageRequest, PlannerStartRequest
from app.services.planner import (
    PlannerService,
    apply_meal_preference_to_itinerary,
    fill_itinerary_day_defaults,
    normalize_itinerary_activities,
)


async def create_planner_seed(
    client,
    owner_id: str,
    *,
    name: str = "Pantai Kuta",
    region: str = "Bali",
    categories: list[str] | None = None,
):
    store = client.app.state.store
    session = await store.save_doc(
        "tripCreationSessions",
        {
            "id": "tcs_agentic",
            "owner_id": owner_id,
            "source": "upload",
            "status": "recommendations_generated",
            "image_ids": [],
            "source_image_refs": [],
            "predicted_categories": [],
            "confirmed_categories": ["pantai"],
            "selected_recommendation_ids": [],
        },
    )
    item = await store.save_doc(
        "recommendationItems",
        {
            "id": "reci_agentic_1",
            "run_id": "rec_agentic",
            "session_id": session["id"],
            "owner_id": owner_id,
            "seed_id": "dest_agentic_1",
            "place_enrichment_id": "plc_agentic_1",
            "rank": 1,
            "name": name,
            "categories": categories or ["pantai"],
            "region": region,
            "short_summary": f"{name} destination",
            "description": f"{name} is a destination for the planner agent.",
            "match_reason": "Matches confirmed trip preferences.",
            "opening_hours_summary": {"status": "available", "summary": "Open daily"},
            "estimated_cost": {
                "amount_idr": 150000,
                "label": "IDR 150,000",
                "source": "curated_seed",
                "is_estimate": True,
            },
            "location": {
                "address": f"{name}, {region}",
                "lat": -8.72,
                "lng": 115.16,
                "google_maps_uri": "https://maps.google.com/?cid=1",
            },
            "image_snaps": [],
            "warnings": [],
            "source_notes": [],
            "confidence": "medium",
        },
    )
    return session, item


def planner_payload(item_id: str):
    return {
        "recommendation_item_id": item_id,
        "travel_start_date": "2026-06-10",
        "travel_end_date": "2026-06-12",
        "traveler_count": 3,
    }


def planner_payload_for_duration(item_id: str, days: int, traveler_count: int = 4):
    return {
        "recommendation_item_id": item_id,
        "travel_start_date": "2026-06-10",
        "travel_end_date": f"2026-06-{9 + days:02d}",
        "traveler_count": traveler_count,
    }


async def create_ready_planner(client, email: str = "budget-user@example.com"):
    user = signup(client, email)
    session, item = await create_planner_seed(client, user["id"])
    response = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    )
    assert response.status_code == 201
    return response.json()["session"]


def daily_totals(budget: dict) -> list[int]:
    return [sum(row["amounts"].values()) for row in budget["daily"]]


def category_total(budget: dict) -> int:
    return sum(int("".join(ch for ch in category["amount"] if ch.isdigit())) for category in budget["categories"])


def test_pipe_delimited_activity_fields_are_normalized():
    activities = normalize_itinerary_activities(
        [
            {
                "title": "10:30 | Mural Walk | Kampung Warna-Warni Jodipan | 2h | Relaxed mural walk.",
                "detail": "",
            }
        ],
        "Kampung Warna-Warni Jodipan",
        "Colorful culture stop.",
        "Malang",
    )

    assert activities == [
        {
            "time": "10:30",
            "title": "Mural Walk",
            "detail": "Relaxed mural walk.",
            "location": "Kampung Warna-Warni Jodipan",
            "duration": "2h",
        }
    ]


def test_vegetarian_meal_preference_updates_itinerary_meal_fields():
    content = {"days": [{"day": 1, "title": "Bromo", "meals": {"lunch": "Local restaurant to confirm"}}]}

    updated = apply_meal_preference_to_itinerary(content, "add vegetarian-friendly meal notes")

    assert "Vegetarian-friendly" in updated["days"][0]["meals"]["lunch"]
    assert "tempeh" in updated["days"][0]["meals"]["lunch"]


def test_malformed_itinerary_day_fields_are_normalized():
    day = fill_itinerary_day_defaults(
        {
            "day": 1,
            "title": "Kampung Warna-Warni Jodipan",
            "description": "Relaxed culture day.",
            "highlights": 123,
            "transport": "drive",
            "accommodation": "guesthouse",
            "estCost": "IDR 200,000",
        },
        {"transport": "previous bad transport", "highlights": "Culture stop"},
        1,
    )

    assert day["highlights"] == ["Culture stop"]
    assert day["transport"]["to"] == "Kampung Warna-Warni Jodipan"
    assert day["accommodation"]["name"] == "Local stay to confirm"
    assert day["estCost"]["value"] == "Budget TBD"


@pytest.mark.asyncio
async def test_planner_session_auto_run_creates_documents_and_events(client):
    user = signup(client)
    session, item = await create_planner_seed(client, user["id"])

    response = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    )

    assert response.status_code == 201
    planner = response.json()["session"]
    assert planner["selected_recommendation_id"] == item["id"]
    assert planner["duration_days"] == 3
    assert planner["traveler_count"] == 3
    assert planner["ready"] is True
    assert planner["documents"]["trip_memo"]["valid"] is True
    assert len(planner["documents"]["full_itinerary"]["content"]["days"]) == 3
    assert planner["documents"]["budget_plan"]["content"]["estimated_total_idr"] == 1_350_000
    assert planner["messages"][0]["content"] == "Plan me a 3 day Pantai Kuta trip for 3 people."
    assert "run_started" in {event["type"] for event in planner["events"]}
    assert "document_committed" in {event["type"] for event in planner["events"]}


@pytest.mark.asyncio
async def test_fixed_total_budget_request_produces_exact_total(client):
    created = await create_ready_planner(client, "budget-fixed-total@example.com")

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "budget total harus Rp 5.000.000 fix"},
    )

    assert response.status_code == 200
    planner = response.json()["session"]
    budget = planner["documents"]["budget_plan"]["content"]
    assert planner["ready"] is True
    assert budget["budget_constraint"]["budget_mode"] == "fixed_total"
    assert budget["budget_constraint"]["amount_idr"] == 5_000_000
    assert budget["estimated_total_idr"] == 5_000_000
    assert budget["per_person_idr"] == round(5_000_000 / 3)
    assert category_total(budget) == 5_000_000
    assert sum(daily_totals(budget)) == 5_000_000


@pytest.mark.asyncio
async def test_max_total_budget_request_does_not_exceed_cap(client):
    created = await create_ready_planner(client, "budget-max-total@example.com")

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "jangan lebih dari Rp 1.000.000"},
    )

    assert response.status_code == 200
    budget = response.json()["session"]["documents"]["budget_plan"]["content"]
    assert budget["budget_constraint"]["budget_mode"] == "max_total"
    assert budget["estimated_total_idr"] <= 1_000_000
    assert category_total(budget) == budget["estimated_total_idr"]
    assert sum(daily_totals(budget)) == budget["estimated_total_idr"]


@pytest.mark.asyncio
async def test_fixed_per_person_budget_uses_traveler_count(client):
    created = await create_ready_planner(client, "budget-fixed-person@example.com")

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "Rp 3 juta per orang fix"},
    )

    assert response.status_code == 200
    budget = response.json()["session"]["documents"]["budget_plan"]["content"]
    assert budget["budget_constraint"]["budget_mode"] == "fixed_per_person"
    assert budget["budget_constraint"]["traveler_count"] == 3
    assert budget["per_person_idr"] == 3_000_000
    assert budget["estimated_total_idr"] == 9_000_000


@pytest.mark.asyncio
async def test_daily_budget_cap_limits_every_daily_row(client):
    created = await create_ready_planner(client, "budget-daily-cap@example.com")

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "budget harian Rp 300.000"},
    )

    assert response.status_code == 200
    budget = response.json()["session"]["documents"]["budget_plan"]["content"]
    assert budget["budget_constraint"]["budget_mode"] == "daily_cap"
    assert budget["budget_constraint"]["amount_idr"] == 300_000
    assert all(total <= 300_000 for total in daily_totals(budget))
    assert sum(daily_totals(budget)) == budget["estimated_total_idr"]


@pytest.mark.asyncio
async def test_ambiguous_budget_request_preserves_documents_and_asks_clarification(client):
    created = await create_ready_planner(client, "budget-ambiguous@example.com")
    before = created["documents"]["budget_plan"]

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "budget 5 juta"},
    )

    assert response.status_code == 200
    planner = response.json()["session"]
    after = planner["documents"]["budget_plan"]
    assert after["version"] == before["version"]
    assert after["content"]["estimated_total_idr"] == before["content"]["estimated_total_idr"]
    assert "whole trip, per person, or per day" in planner["messages"][-1]["content"]
    assert planner["ready"] is True


@pytest.mark.asyncio
async def test_planner_requires_single_destination_dates_and_people(client):
    user = signup(client)
    session, item = await create_planner_seed(client, user["id"])

    missing_dates = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json={"recommendation_item_id": item["id"], "traveler_count": 2},
    )
    assert missing_dates.status_code == 422

    selected_many = client.post(
        f"/api/trip-creation-sessions/{session['id']}/selected-recommendations",
        json={"recommendation_item_ids": [item["id"], "reci_other"]},
    )
    assert selected_many.status_code == 422


@pytest.mark.asyncio
async def test_planner_follow_up_can_search_added_destination_and_patch_documents(client):
    user = signup(client)
    session, item = await create_planner_seed(client, user["id"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    ).json()["session"]

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "Tambah destination ke Nusa Penida dan adjust budget."},
    )

    assert response.status_code == 200
    planner = response.json()["session"]
    assert len(planner["documents"]["full_itinerary"]["content"]["days"]) == 4
    event_types = {event["type"] for event in planner["events"]}
    assert "tool_started" in event_types
    facts = await client.app.state.store.list_docs("plannerResearchFacts", planner_session_id=created["id"])
    assert {fact["kind"] for fact in facts} >= {"places_text_search", "places_details", "grounded_web_research"}


@pytest.mark.asyncio
async def test_duration_change_reconciles_itinerary_dates_and_does_not_append_placeholder_days(client):
    user = signup(client, "planner-duration-reconcile@example.com")
    session, item = await create_planner_seed(
        client,
        user["id"],
        name="Gunung Gede Pangrango National Park Office",
        region="West Java",
        categories=["gunung"],
    )
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 7, traveler_count=4),
    ).json()["session"]
    assert len(created["documents"]["full_itinerary"]["content"]["days"]) == 7

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "make into 3 days, and day 2 - 3 different destinations, recommend me some good destinations"},
    )

    assert response.status_code == 200
    planner = response.json()["session"]
    days = planner["documents"]["full_itinerary"]["content"]["days"]
    assert planner["duration_days"] == 3
    assert planner["travel_end_date"] == "2026-06-12"
    assert [day["day"] for day in days] == [1, 2, 3]
    assert all(day["title"] != "Added destination research" for day in days)
    assert all("make into 3 days" not in day["description"].lower() for day in days)
    assert len(planner["documents"]["budget_plan"]["content"]["daily"]) == 3

    repeated = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "make it into 3 days, day 2 and day 3 different destinations each"},
    )
    assert repeated.status_code == 200
    repeated_days = repeated.json()["session"]["documents"]["full_itinerary"]["content"]["days"]
    assert [day["day"] for day in repeated_days] == [1, 2, 3]


@pytest.mark.asyncio
async def test_research_then_partial_gemini_itinerary_write_completes_missing_documents_and_uses_route_variety(client):
    class PartialItineraryProvider:
        enabled = True
        calls = 0

        async def decide(self, context, trace_context=None):
            self.calls += 1
            if self.calls == 1:
                return PlannerAgentStepV1(
                    intent="initial_plan",
                    assistant_text="I am looking up Pantai Tanjung Tinggi and nearby attractions.",
                    actions=[{"tool": "places_text_search", "args": {"query": "Pantai Tanjung Tinggi Belitung"}}],
                )
            return PlannerAgentStepV1(
                intent="initial_plan",
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="I created the itinerary and will set up the budget and memo next.",
                actions=[{"tool": "replace_full_itinerary", "args": {}}],
            )

    user = signup(client, "planner-partial-gemini@example.com")
    session, item = await create_planner_seed(
        client,
        user["id"],
        name="Pantai Tanjung Tinggi",
        region="Pantai Tj. Tinggi, Kepulauan Bangka Belitung",
        categories=["pantai"],
    )
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=PartialItineraryProvider(),
    )

    planner = (
        await service.create_from_trip_creation(
            session["id"],
            user,
            PlannerStartRequest(**planner_payload_for_duration(item["id"], 3, traveler_count=2)),
        )
    )["session"]

    assert planner["ready"] is True
    assert planner["documents"]["trip_memo"]["valid"] is True
    assert planner["documents"]["budget_plan"]["valid"] is True
    titles = [day["title"] for day in planner["documents"]["full_itinerary"]["content"]["days"]]
    assert titles == ["Pantai Tanjung Tinggi", "Pulau Lengkuas", "Danau Kaolin Belitung"]
    assert len(set(titles)) == 3
    assert {event["label"] for event in planner["events"] if event["type"] == "turn_started"} >= {
        "Reasoning turn 1",
        "Reasoning turn 2",
    }
    assert planner["messages"][-1]["content"] == (
        "I completed the missing planner documents and validated the trip memo, itinerary, and budget plan."
    )


@pytest.mark.asyncio
async def test_agent_tool_document_args_are_persisted_to_latest_documents(client):
    class EditingProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            text = context["user_text"].lower()
            docs = context["documents"]
            if "day 6" in text:
                day = dict(docs["full_itinerary"]["content"]["days"][5])
                day.update(
                    {
                        "title": "Air Terjun Madakaripura",
                        "summary": "Waterfall stop near Probolinggo before closing the Bromo route.",
                        "description": "Explore Air Terjun Madakaripura with a local guide, then return toward Probolinggo.",
                        "highlights": ["Waterfall", "Guide recommended", "Probolinggo"],
                        "activities": [
                            {
                                "time": "09:00",
                                "title": "Explore Air Terjun Madakaripura",
                                "detail": "Short guided waterfall walk with time for photos and a relaxed lunch.",
                                "location": "Probolinggo",
                                "duration": "3h",
                            }
                        ],
                    }
                )
                return PlannerAgentStepV1(
                    intent="change_preferences",
                    requires_document_edit=True,
                    affected_documents=["full_itinerary"],
                    assistant_text="Day 6 now uses Air Terjun Madakaripura.",
                    actions=[{"tool": "patch_itinerary_day", "args": {"day": 6, "day_content": day}}],
                )
            if "memo" in text:
                memo = dict(docs["trip_memo"]["content"])
                memo["caption"] = "Detailed Bromo route memo with waterfall logistics."
                memo["markdown"] = (
                    memo["markdown"]
                    + "\n\n### Route logistics\n\n"
                    "- Day 6 now closes with Air Terjun Madakaripura near Probolinggo.\n"
                    "- Carry a rain layer and confirm local guide access before departure."
                )
                return PlannerAgentStepV1(
                    intent="change_preferences",
                    requires_document_edit=True,
                    affected_documents=["trip_memo"],
                    assistant_text="Memo expanded.",
                    actions=[{"tool": "replace_trip_memo", "args": {"content": memo}}],
                )
            budget = dict(docs["budget_plan"]["content"])
            budget["estimated_total_idr"] = 900_000
            return PlannerAgentStepV1(
                intent="change_budget",
                requires_document_edit=True,
                affected_documents=["budget_plan"],
                assistant_text="Budget made more efficient.",
                actions=[{"tool": "replace_budget_plan", "args": {"content": budget}}],
            )

    user = signup(client, "planner-agent-args@example.com")
    session, item = await create_planner_seed(
        client,
        user["id"],
        name="Mount Bromo",
        region="East Java",
        categories=["gunung"],
    )
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 6, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=EditingProvider(),
    )

    itinerary_response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="oh ya, day 6 nya ganti ke tempat lain"),
    )
    day_6 = itinerary_response["session"]["documents"]["full_itinerary"]["content"]["days"][5]
    assert day_6["title"] == "Air Terjun Madakaripura"
    assert "Madakaripura" in itinerary_response["session"]["display"]["itinerary"][5]["title"]

    memo_response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="buat trip memo lebih lengkap"),
    )
    memo = memo_response["session"]["documents"]["trip_memo"]["content"]
    assert memo["caption"] == "Detailed Bromo route memo with waterfall logistics."
    assert "Route logistics" in memo["markdown"]

    budget_response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="ubah budget jadi lebih efisien"),
    )
    budget = budget_response["session"]["documents"]["budget_plan"]["content"]
    assert budget["estimated_total_idr"] == 900_000
    assert budget_response["session"]["display"]["budget"]["estimated_total_idr"] == 900_000


@pytest.mark.asyncio
async def test_budget_constraint_from_intent_survives_full_budget_replacement(client):
    class FullBudgetProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            docs = context["documents"]
            budget = dict(docs["budget_plan"]["content"])
            budget["estimated_total_idr"] = 2_500_000
            budget["budget_constraint"] = None
            return PlannerAgentStepV1(
                intent="change_budget",
                requires_document_edit=True,
                affected_documents=["budget_plan"],
                assistant_text="Budget capped.",
                actions=[{"tool": "replace_budget_plan", "args": {"content": budget}}],
            )

    user = signup(client, "planner-budget-replace-cap@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=FullBudgetProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="jangan lebih dari Rp 2.000.000 total untuk seluruh trip"),
    )

    budget = response["session"]["documents"]["budget_plan"]["content"]
    assert budget["estimated_total_idr"] == 2_000_000
    assert budget["budget_constraint"]["budget_mode"] == "max_total"
    assert sum(daily_totals(budget)) == 2_000_000

    follow_up = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="update itinerary and keep budget realistic"),
    )
    follow_up_budget = follow_up["session"]["documents"]["budget_plan"]["content"]
    assert follow_up_budget["estimated_total_idr"] == 2_000_000
    assert follow_up_budget["budget_constraint"]["budget_mode"] == "max_total"


@pytest.mark.asyncio
async def test_mutating_response_is_based_on_canonical_documents(client):
    class MismatchedAssistantProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            return PlannerAgentStepV1(
                intent="add_destination",
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="I changed Day 4 to Desa Wisata Ngadisari.",
                actions=[
                    {"tool": "patch_itinerary_day", "args": {"duration_days": 4, "intent": "add day 4 nearby"}},
                    {"tool": "validate_documents", "args": {}},
                    {"tool": "finish_response", "args": {}},
                ],
            )

    user = signup(client, "planner-canonical-response@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=MismatchedAssistantProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="replace day 4 with a relaxed cultural destination"),
    )

    days = response["session"]["documents"]["full_itinerary"]["content"]["days"]
    assert days[3]["title"] == "Kampung Warna-Warni Jodipan"
    final_message = response["session"]["messages"][-1]["content"]
    assert "Kampung Warna-Warni Jodipan" in final_message
    assert "Ngadisari" not in final_message


@pytest.mark.asyncio
async def test_itinerary_only_day_replacement_syncs_existing_budget_daily_rows(client):
    class ItineraryOnlyProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            day = dict(context["documents"]["full_itinerary"]["content"]["days"][3])
            day.update(
                {
                    "title": "Tumpak Sewu Waterfall",
                    "summary": "A distinct waterfall day south of the Bromo route.",
                    "description": "Visit Tumpak Sewu for a higher-effort waterfall day before returning from East Java.",
                    "location": "Lumajang, East Java",
                    "activities": [
                        {
                            "time": "08:00",
                            "title": "Waterfall viewpoint",
                            "detail": "Walk to the main viewpoint and keep the pacing flexible for road conditions.",
                            "location": "Tumpak Sewu Waterfall",
                            "duration": "3h",
                        }
                    ],
                }
            )
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="I changed Day 4 to Tumpak Sewu.",
                actions=[
                    {"tool": "patch_itinerary_day", "args": {"day": 4, "day_content": day}},
                    {"tool": "validate_documents", "args": {}},
                ],
            )

    user = signup(client, "planner-budget-sync-itinerary@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 4, traveler_count=2),
    ).json()["session"]
    before_budget = created["documents"]["budget_plan"]["content"]
    assert before_budget["daily"][3]["title"] != "Tumpak Sewu Waterfall"
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=ItineraryOnlyProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="change day 4 to Tumpak Sewu"),
    )

    planner = response["session"]
    day_4 = planner["documents"]["full_itinerary"]["content"]["days"][3]
    budget = planner["documents"]["budget_plan"]["content"]
    assert day_4["title"] == "Tumpak Sewu Waterfall"
    assert budget["daily"][3]["title"] == "Tumpak Sewu Waterfall"
    assert "Tumpak Sewu" in budget["daily"][3]["route"]
    assert sum(daily_totals(budget)) == budget["estimated_total_idr"]
    assert planner["documents"]["budget_plan"]["version"] == created["documents"]["budget_plan"]["version"] + 1


@pytest.mark.asyncio
async def test_empty_targeted_itinerary_patch_uses_provider_repair(client):
    class RepairingProvider:
        enabled = True

        def __init__(self):
            self.repair_called = False

        async def decide(self, context, trace_context=None):
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="Day 2 was slowed down.",
                actions=[{"tool": "patch_itinerary_day", "args": {"day": 2}}],
            )

        async def repair(self, context, validation_errors, previous_output, trace_context=None):
            self.repair_called = True
            day = dict(context["documents"]["full_itinerary"]["content"]["days"][1])
            day["activities"] = [
                {
                    "time": "10:30",
                    "title": "Slow cultural walk",
                    "detail": "A slower-paced local walk with cafe time.",
                    "location": day["title"],
                    "duration": "2h",
                }
            ]
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="Day 2 was slowed down.",
                actions=[{"tool": "patch_itinerary_day", "args": {"day": 2, "day_content": day}}, {"tool": "validate_documents", "args": {}}],
            )

    user = signup(client, "planner-contract-repair@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    provider = RepairingProvider()
    service = PlannerService(store=client.app.state.store, settings=client.app.state.settings, planner_provider=provider)

    response = await service.send_message(created["id"], user, PlannerMessageRequest(text="make day 2 slower paced"))

    assert provider.repair_called is True
    day_2 = response["session"]["documents"]["full_itinerary"]["content"]["days"][1]
    assert day_2["activities"][0]["title"] == "Slow cultural walk"


@pytest.mark.asyncio
async def test_partial_agent_document_payloads_are_normalized_instead_of_failing(client):
    class PartialPayloadProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            text = context["user_text"].lower()
            if "day 3" in text:
                return PlannerAgentStepV1(
                    intent="add_destination",
                    requires_document_edit=True,
                    affected_documents=["full_itinerary"],
                    assistant_text="I added Air Terjun Madakaripura as day 3.",
                    actions=[
                        {
                            "tool": "patch_itinerary_day",
                            "args": {
                                "day": 3,
                                "day_content": {
                                    "title": "Air Terjun Madakaripura",
                                    "summary": "Waterfall stop near Bromo.",
                                    "description": "Visit Air Terjun Madakaripura before returning from the Bromo area.",
                                    "activities": [{"title": "Waterfall walk", "detail": "Guided walk into the waterfall canyon."}],
                                },
                            },
                        }
                    ],
                )
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["trip_memo"],
                assistant_text="Memo expanded.",
                actions=[
                    {
                        "tool": "replace_trip_memo",
                        "args": {"content": {"markdown": "### Expanded Bromo memo\n\nIncludes sunrise pacing, jeep timing, and waterfall contingency."}},
                    }
                ],
            )

    user = signup(client, "planner-partial-payload@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 2, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=PartialPayloadProvider(),
    )

    day_response = await service.send_message(created["id"], user, PlannerMessageRequest(text="ok tambahkan ke day 3"))
    planner = day_response["session"]
    assert planner["status"] == "ready_to_review"
    assert planner["duration_days"] == 3
    assert planner["travel_end_date"] == "2026-06-12"
    day_3 = planner["documents"]["full_itinerary"]["content"]["days"][2]
    assert day_3["title"] == "Air Terjun Madakaripura"
    assert day_3["cover"]
    assert day_3["transport"]["to"] == "Air Terjun Madakaripura"
    assert "Itinerary now has 3 days" in planner["messages"][-1]["content"]

    memo_response = await service.send_message(created["id"], user, PlannerMessageRequest(text="buat memo lebih lengkap"))
    memo = memo_response["session"]["documents"]["trip_memo"]["content"]
    assert "Expanded Bromo memo" in memo["markdown"]
    assert memo["caption"]
    assert memo["tiles"]
    assert memo_response["session"]["messages"][-1]["content"] == "Trip memo was updated from the latest canonical plan."


@pytest.mark.asyncio
async def test_malformed_gemini_memo_payload_is_normalized_instead_of_failing(client):
    class MalformedMemoProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["trip_memo"],
                assistant_text="Memo expanded.",
                actions=[
                    {
                        "tool": "replace_trip_memo",
                        "args": {
                            "content": {
                                "markdown": "### Better trip memo\n\nA fuller memo with route rationale, pacing, and preparation notes.",
                                "caption": "Expanded memo",
                                "source": "Planner agent",
                                "items": "4 tiles",
                                "tiles": [
                                    "/landing/indonesia-map.png",
                                    None,
                                    {"url": "/landing/bromo.jpg", "caption": "Bromo route"},
                                    {"src": "", "alt": "ignored"},
                                ],
                            }
                        },
                    }
                ],
            )

    user = signup(client, "planner-malformed-memo@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=MalformedMemoProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="make memo more descriptive"),
    )

    planner = response["session"]
    memo = planner["documents"]["trip_memo"]["content"]
    assert planner["status"] == "ready_to_review"
    assert memo["items"] == 4
    assert memo["tiles"] == [
        {"src": "/landing/indonesia-map.png", "alt": "Expanded memo"},
        {"src": "/landing/bromo.jpg", "alt": "Bromo route"},
    ]
    assert not [event for event in planner["events"] if event["type"] in {"tool_failed", "run_failed"}]


@pytest.mark.asyncio
async def test_queued_follow_up_is_processed_after_active_run_finishes(client):
    class AnswerProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            return PlannerAgentStepV1(
                intent="answer_question",
                requires_document_edit=False,
                affected_documents=[],
                assistant_text="Queued answer from current planner documents.",
                actions=[],
                stop=True,
            )

    created = await create_ready_planner(client, "planner-queued-followup@example.com")
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=AnswerProvider(),
    )
    queued = await service._append_message(
        created["id"],
        "user",
        "what are the destinations for day 2 and day 3?",
        visible=True,
        run_id=None,
        queued=True,
    )

    await service._maybe_process_next_queued_follow_up(created["id"])

    stored = await client.app.state.store.find_one("plannerMessages", id=queued["id"])
    snapshot = await service.snapshot(created["id"], {"id": created["owner_id"]})
    assert stored["queued"] is False
    assert snapshot["session"]["status"] == "ready_to_review"
    assert snapshot["session"]["messages"][-1]["content"] == "Queued answer from current planner documents."
    assert "message_dequeued" in {event["type"] for event in snapshot["session"]["events"]}


@pytest.mark.asyncio
async def test_agent_context_separates_visible_chat_from_sanitized_tool_observations(client):
    created = await create_ready_planner(client, "planner-context-sanitized@example.com")
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
    )

    context = await service._build_agent_context(
        created["id"],
        user_text="what changed?",
        trigger="user_message",
        turn_count=1,
    )

    assert context["recent_messages"]
    assert all(message["role"] != "tool" for message in context["recent_messages"])
    assert context["recent_tool_observations"]
    assert all("content" not in observation for observation in context["recent_tool_observations"])
    assert any(observation.get("document_type") == "budget_plan" for observation in context["recent_tool_observations"])


@pytest.mark.asyncio
async def test_invalid_provider_step_uses_repair_before_local_fallback(client):
    from app.providers.planner_agent import GeminiValidationFailure

    class RepairingProvider:
        enabled = True
        repaired = False

        async def decide(self, context, trace_context=None):
            raise GeminiValidationFailure("invalid structured step", '{"tool":"replace_trip_memo"}')

        async def repair(self, *, context, validation_errors, previous_output, trace_context=None):
            self.repaired = True
            return PlannerAgentStepV1(
                intent="change_preferences",
                requires_document_edit=True,
                affected_documents=["trip_memo"],
                assistant_text="Memo repaired and expanded.",
                actions=[
                    {
                        "tool": "replace_trip_memo",
                        "args": {
                            "content": {
                                "markdown": "### Repaired memo\n\nStructured repair produced a useful memo update.",
                                "caption": "Repaired memo",
                                "source": "Planner repair",
                                "items": 1,
                                "tiles": [{"src": "/landing/indonesia-map.png", "alt": "Repaired memo"}],
                            }
                        },
                    },
                    {"tool": "validate_documents", "args": {}},
                ],
            )

    user = signup(client, "planner-repair-provider@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    provider = RepairingProvider()
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=provider,
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="please improve the trip memo so it is more descriptive"),
    )

    assert provider.repaired is True
    planner = response["session"]
    assert planner["documents"]["trip_memo"]["version"] == created["documents"]["trip_memo"]["version"] + 1
    assert "Repaired memo" in planner["documents"]["trip_memo"]["content"]["markdown"]
    assert planner["messages"][-1]["content"] == "Trip memo was updated from the latest canonical plan. Documents validated successfully."


@pytest.mark.asyncio
async def test_enabled_provider_failure_does_not_use_keyword_fallback_mutation(client):
    from app.providers.planner_agent import GeminiValidationFailure

    class FailingProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            raise GeminiValidationFailure("provider timed out", "")

    user = signup(client, "planner-provider-failure@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    before_versions = {
        doc_type: doc["version"]
        for doc_type, doc in created["documents"].items()
    }
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=FailingProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="add day 4 with a unique destination nearby"),
    )

    planner = response["session"]
    assert {
        doc_type: doc["version"]
        for doc_type, doc in planner["documents"].items()
    } == before_versions
    assert planner["duration_days"] == 3
    assert "could not get a reliable planner decision" in planner["messages"][-1]["content"]


@pytest.mark.asyncio
async def test_invalid_gemini_itinerary_payload_falls_back_to_valid_duration_reconcile(client):
    class InvalidItineraryProvider:
        enabled = True

        async def decide(self, context, trace_context=None):
            return PlannerAgentStepV1(
                intent="add_destination",
                duration_days=4,
                requires_document_edit=True,
                affected_documents=["full_itinerary"],
                assistant_text="I added a fourth day with a nearby destination.",
                actions=[
                    {
                        "tool": "replace_full_itinerary",
                        "args": {
                            "content": {
                                "schema_version": "full_itinerary.v1",
                                "days": ["...", "...", "...", "..."],
                            }
                        },
                    },
                    {
                        "tool": "replace_budget_plan",
                        "args": {
                            "content": {
                                "schema_version": "budget_plan.v1",
                                "estimated_total_idr": 1_200_000,
                                "total_amount": "IDR 1,200,000",
                                "total_label": "for 2 people - 4 days",
                                "per_person_idr": 600_000,
                                "categories": [None, None],
                                "daily": [
                                {"day": 1, "title": "Malformed first day", "route": "Bromo", "amounts": "about IDR 200,000"},
                                None,
                                None,
                                '{"day": 4, "title": "Waterfall day", "route": "Bromo to waterfall", "amounts": {"transport": 120000, "meals": 80000}}',
                            ],
                        }
                    },
                    },
                ],
            )

    user = signup(client, "planner-invalid-itinerary-payload@example.com")
    session, item = await create_planner_seed(client, user["id"], name="Mount Bromo", region="East Java", categories=["gunung"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=2),
    ).json()["session"]
    service = PlannerService(
        store=client.app.state.store,
        settings=client.app.state.settings,
        planner_provider=InvalidItineraryProvider(),
    )

    response = await service.send_message(
        created["id"],
        user,
        PlannerMessageRequest(text="add day 4 with a unique destination nearby"),
    )

    planner = response["session"]
    assert planner["status"] == "ready_to_review"
    assert planner["duration_days"] == 4
    assert planner["travel_end_date"] == "2026-06-13"
    days = planner["documents"]["full_itinerary"]["content"]["days"]
    assert [day["day"] for day in days] == [1, 2, 3, 4]
    assert days[3]["title"] == "Kampung Warna-Warni Jodipan"
    budget_daily = planner["documents"]["budget_plan"]["content"]["daily"]
    assert len(budget_daily) == 4
    assert budget_daily[3]["title"] == "Kampung Warna-Warni Jodipan"
    assert len(set(daily_totals(planner["documents"]["budget_plan"]["content"]))) > 1
    assert planner["documents"]["trip_memo"]["valid"] is True
    assert not [event for event in planner["events"] if event["type"] in {"tool_failed", "run_failed"}]


@pytest.mark.asyncio
async def test_destination_question_answers_without_mutating_documents(client):
    user = signup(client, "planner-question-only@example.com")
    session, item = await create_planner_seed(
        client,
        user["id"],
        name="Gunung Gede Pangrango National Park Office",
        region="West Java",
        categories=["gunung"],
    )
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload_for_duration(item["id"], 3, traveler_count=4),
    ).json()["session"]
    before_versions = {
        doc_type: doc["version"]
        for doc_type, doc in created["documents"].items()
    }

    response = client.post(
        f"/api/planner-sessions/{created['id']}/messages",
        json={"text": "so what are the destinations for day 2 and 3?"},
    )

    assert response.status_code == 200
    planner = response.json()["session"]
    after_versions = {
        doc_type: doc["version"]
        for doc_type, doc in planner["documents"].items()
    }
    assert after_versions == before_versions
    assert "day 2" in planner["messages"][-1]["content"].lower()
    assert "day 3" in planner["messages"][-1]["content"].lower()
    assert "updated the itinerary" not in planner["messages"][-1]["content"].lower()


@pytest.mark.asyncio
async def test_reply_instruction_and_zero_budget_preserve_documents(client):
    created = await create_ready_planner(client, "planner-chat-budget-guards@example.com")
    before_versions = {
        doc_type: doc["version"]
        for doc_type, doc in created["documents"].items()
    }

    hello = client.post(f"/api/planner-sessions/{created['id']}/messages", json={"text": "say hello"})

    assert hello.status_code == 200
    planner = hello.json()["session"]
    assert planner["messages"][-1]["content"].strip().lower() == "hello"
    assert {
        doc_type: doc["version"]
        for doc_type, doc in planner["documents"].items()
    } == before_versions

    budget_before = planner["documents"]["budget_plan"]
    zero_budget = client.post(f"/api/planner-sessions/{created['id']}/messages", json={"text": "make all budgets 0"})

    assert zero_budget.status_code == 200
    planner = zero_budget.json()["session"]
    assert planner["documents"]["budget_plan"]["version"] == budget_before["version"]
    assert planner["documents"]["budget_plan"]["content"]["estimated_total_idr"] == budget_before["content"]["estimated_total_idr"]
    assert "budget" in planner["messages"][-1]["content"].lower()
    assert any(word in planner["messages"][-1]["content"].lower() for word in ["clarify", "cannot", "valid"])


@pytest.mark.asyncio
async def test_planner_can_reply_without_document_edits(client):
    user = signup(client)
    session, item = await create_planner_seed(client, user["id"])
    created = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    ).json()["session"]
    before = created["documents"]["budget_plan"]["version"]

    response = client.post(f"/api/planner-sessions/{created['id']}/messages", json={"text": "Thanks, noted."})

    assert response.status_code == 200
    planner = response.json()["session"]
    assert planner["documents"]["budget_plan"]["version"] == before
    assert planner["messages"][-1]["role"] == "assistant"
    assert "documents stay unchanged" in planner["messages"][-1]["content"]


@pytest.mark.asyncio
async def test_planner_accept_invite_join_and_revoke(client):
    owner = signup(client, "planner-owner@example.com")
    session, item = await create_planner_seed(client, owner["id"])
    planner = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    ).json()["session"]

    accepted = client.post(f"/api/planner-sessions/{planner['id']}/accept", json={"visibility": "invite_only"})

    assert accepted.status_code == 200
    plan = accepted.json()["trip_plan"]
    assert plan["status"] == "accepted"
    assert plan["visibility"] == "invite_only"
    assert plan["planner_session_id"] == planner["id"]

    invite = client.post(f"/api/planner-sessions/trip-plans/{plan['id']}/invites", json={"expires_days": 7})
    assert invite.status_code == 201
    token = invite.json()["invite"]["token"]
    assert client.get(f"/api/planner-sessions/invites/{token}").status_code == 200

    client.post("/api/auth/logout")
    signup(client, "planner-viewer@example.com")
    joined = client.post(f"/api/planner-sessions/invites/{token}/join")
    assert joined.status_code == 200
    assert joined.json()["participant"]["role"] == "viewer"
    assert client.get(f"/api/trip-plans/{plan['id']}/detail").status_code == 200
    joined_summary = client.get("/api/account/summary")
    assert joined_summary.status_code == 200
    assert plan["id"] in [item["id"] for item in joined_summary.json()["joined_trips"]]

    client.post("/api/auth/logout")
    login = client.post(
        "/api/auth/login",
        json={"email": "planner-owner@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    revoked = client.post(f"/api/planner-sessions/invites/{invite.json()['invite']['id']}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["invite"]["status"] == "revoked"


@pytest.mark.asyncio
async def test_accepted_trip_can_be_published_to_explore_and_opened_by_other_user(client):
    owner = signup(client, "planner-publisher@example.com")
    session, item = await create_planner_seed(client, owner["id"])
    planner = client.post(
        f"/api/planner-sessions/from-trip-creation/{session['id']}",
        json=planner_payload(item["id"]),
    ).json()["session"]
    accepted = client.post(f"/api/planner-sessions/{planner['id']}/accept", json={"visibility": "private"})
    assert accepted.status_code == 200
    plan = accepted.json()["trip_plan"]

    private_explore = client.get("/api/explore")
    assert plan["id"] not in [item["id"] for item in private_explore.json()["items"]]

    published = client.patch(f"/api/trip-plans/{plan['id']}/visibility", json={"visibility": "public"})
    assert published.status_code == 200
    assert published.json()["trip_plan"]["visibility"] == "public"

    public_explore = client.get("/api/explore")
    assert plan["id"] in [item["id"] for item in public_explore.json()["items"]]

    client.post("/api/auth/logout")
    signup(client, "planner-public-viewer@example.com")
    detail = client.get(f"/api/trip-plans/{plan['id']}/detail")
    assert detail.status_code == 200
    assert detail.json()["detail"]["trip_plan"]["title"] == "Pantai Kuta trip"
