import pytest
from conftest import signup


async def create_preview_session(client, owner_id: str, *, selected: bool = True):
    store = client.app.state.store
    session = await store.save_doc(
        "tripCreationSessions",
        {
            "id": "tcs_preview",
            "owner_id": owner_id,
            "source": "upload",
            "status": "recommendations_selected" if selected else "recommendations_generated",
            "image_ids": [],
            "source_image_refs": [],
            "predicted_categories": [],
            "confirmed_categories": ["pantai", "wisata_tradisional"],
            "selected_recommendation_ids": [],
        },
    )
    items = []
    for rank, name in enumerate(["Pantai Kuta", "Uluwatu Temple"], start=1):
        item = await store.save_doc(
            "recommendationItems",
            {
                "id": f"reci_preview_{rank}",
                "run_id": "rec_preview",
                "session_id": session["id"],
                "owner_id": owner_id,
                "seed_id": f"dest_preview_{rank}",
                "place_enrichment_id": f"plc_preview_{rank}",
                "rank": rank,
                "name": name,
                "categories": ["pantai"] if rank == 1 else ["wisata_tradisional"],
                "region": "Bali",
                "short_summary": f"{name} short summary",
                "description": f"{name} is a selected destination for the planner preview.",
                "match_reason": "Matches confirmed trip preferences.",
                "opening_hours_summary": {"status": "available", "summary": "Open daily"},
                "estimated_cost": {
                    "amount_idr": 150000 * rank,
                    "label": f"IDR {150000 * rank:,}",
                    "source": "curated_seed",
                    "is_estimate": True,
                },
                "location": {
                    "address": f"{name}, Bali",
                    "lat": -8.7 + rank / 100,
                    "lng": 115.1 + rank / 100,
                    "google_maps_uri": f"https://maps.google.com/?cid={rank}",
                },
                "image_snaps": [],
                "warnings": [],
                "source_notes": [],
                "confidence": "medium",
            },
        )
        items.append(item)
    if selected:
        await store.update_doc(
            "tripCreationSessions",
            session["id"],
            {"selected_recommendation_ids": [item["id"] for item in items]},
        )
    return session, items


def test_planner_preview_requires_auth(client):
    response = client.get("/api/planner-preview/tcs_preview")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_planner_preview_is_owner_scoped(client):
    owner = signup(client, "owner-preview@example.com")
    session, _ = await create_preview_session(client, owner["id"])
    client.post("/api/auth/logout")
    signup(client, "other-preview@example.com")

    response = client.get(f"/api/planner-preview/{session['id']}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_planner_preview_requires_selected_recommendations(client):
    user = signup(client)
    session, _ = await create_preview_session(client, user["id"], selected=False)

    response = client.get(f"/api/planner-preview/{session['id']}")

    assert response.status_code == 422
    assert "Select destinations" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_planner_preview_returns_deterministic_non_persisted_documents(client):
    user = signup(client)
    session, _ = await create_preview_session(client, user["id"])

    response = client.get(f"/api/planner-preview/{session['id']}")

    assert response.status_code == 200
    preview = response.json()["preview"]
    assert preview["session_id"] == session["id"]
    assert preview["title"] == "Pantai Kuta + 1 stop planner preview"
    assert preview["documents"]["persisted"] is False
    assert preview["acceptance"]["enabled"] is False
    assert [stop["name"] for stop in preview["destinations"]] == ["Pantai Kuta", "Uluwatu Temple"]
    assert preview["memo"]["markdown"]
    assert len(preview["itinerary"]) == 2
    assert len(preview["budget"]["categories"]) == 5
    assert preview["budget"]["total_amount"] == "IDR 450,000"
    assert "GEMINI_API_KEY" not in str(preview)
    assert "GOOGLE_PLACES_API_KEY" not in str(preview)

    stored_session = await client.app.state.store.find_one("tripCreationSessions", id=session["id"])
    assert "memo" not in stored_session
    assert "itinerary" not in stored_session
    assert "budget_categories" not in stored_session
    assert await client.app.state.store.list_docs("tripPlans") == []
