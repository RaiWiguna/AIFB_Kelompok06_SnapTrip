import pytest
from conftest import signup


async def create_planner_seed(client, owner_id: str):
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
            "name": "Pantai Kuta",
            "categories": ["pantai"],
            "region": "Bali",
            "short_summary": "Beach destination",
            "description": "Pantai Kuta is a beach destination for the planner agent.",
            "match_reason": "Matches confirmed trip preferences.",
            "opening_hours_summary": {"status": "available", "summary": "Open daily"},
            "estimated_cost": {
                "amount_idr": 150000,
                "label": "IDR 150,000",
                "source": "curated_seed",
                "is_estimate": True,
            },
            "location": {
                "address": "Pantai Kuta, Bali",
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

    client.post("/api/auth/logout")
    login = client.post(
        "/api/auth/login",
        json={"email": "planner-owner@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    revoked = client.post(f"/api/planner-sessions/invites/{invite.json()['invite']['id']}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["invite"]["status"] == "revoked"
