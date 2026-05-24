import pytest
from conftest import signup


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
