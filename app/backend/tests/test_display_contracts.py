import pytest
from conftest import create_trip_plan, signup


@pytest.mark.asyncio
async def test_account_summary_counts_and_recent_trips(client):
    user = signup(client)
    await create_trip_plan(client, user["id"], title="Recent Bali")
    await create_trip_plan(client, user["id"], title="Recent Java", categories=["gunung"])
    collection = client.post("/api/collections", json={"name": "Weekend ideas"}).json()[
        "collection"
    ]
    plan = await create_trip_plan(client, user["id"], title="Liked Coast")
    client.post(f"/api/trip-plans/{plan['id']}/like")
    client.post(f"/api/collections/{collection['id']}/items/{plan['id']}")

    response = client.get("/api/account/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["display_name"] == "Snap User"
    assert body["stats"] == {
        "owned_trips": 3,
        "joined_trips": 0,
        "collections": 1,
        "liked_trips": 1,
    }
    assert len(body["recent_owned_trips"]) == 3
    assert body["joined_trips"] == []


def test_account_summary_requires_auth(client):
    response = client.get("/api/account/summary")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_explore_returns_display_ready_card_and_viewer_state(client):
    user = signup(client)
    plan = await create_trip_plan(
        client,
        user["id"],
        title="Bali Coast",
        categories=["pantai", "wisata_tradisional"],
        region="Uluwatu, Bali",
    )
    client.post(f"/api/trip-plans/{plan['id']}/like")

    response = client.get("/api/explore", params={"category": "pantai"})
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["title"] == "Bali Coast"
    assert item["cover_url"] == "/landing/diamond-beach.png"
    assert item["region"] == "Uluwatu, Bali"
    assert item["owner_display"]["name"] == "Snap User"
    assert item["like_count"] == 1
    assert item["save_count"] == 0
    assert item["viewer"]["liked"] is True
    assert item["viewer"]["saved"] is False


@pytest.mark.asyncio
async def test_explore_card_marks_viewer_saved_state(client):
    user = signup(client)
    plan = await create_trip_plan(client, user["id"], title="Saved Coast", categories=["pantai"])
    collection = client.post("/api/collections", json={"name": "Saved plans"}).json()["collection"]
    client.post(f"/api/collections/{collection['id']}/items/{plan['id']}")

    response = client.get("/api/explore", params={"category": "pantai"})

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["id"] == plan["id"]
    assert item["viewer"]["saved"] is True


@pytest.mark.asyncio
async def test_liked_trip_plans_endpoint_returns_current_user_likes(client):
    user = signup(client)
    liked = await create_trip_plan(client, user["id"], title="Liked Trip")
    unliked = await create_trip_plan(client, user["id"], title="Other Trip", categories=["gunung"])
    client.post(f"/api/trip-plans/{liked['id']}/like")

    response = client.get("/api/likes/trip-plans")
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [liked["id"]]
    assert unliked["id"] not in [item["id"] for item in items]


@pytest.mark.asyncio
async def test_collection_list_detail_slug_and_id_lookup(client):
    user = signup(client)
    plan = await create_trip_plan(client, user["id"], title="Saved Trip")
    created = client.post("/api/collections", json={"name": "Bali quiet week"})
    created_collection = created.json()["collection"]
    collection_id = created_collection["id"]
    assert created_collection["slug"].startswith("bali-quiet-week-")
    assert created_collection["count"] == 0
    assert len(created_collection["cover_grid_urls"]) == 4
    client.post(f"/api/collections/{collection_id}/items/{plan['id']}")

    list_response = client.get("/api/collections")
    assert list_response.status_code == 200
    collection = list_response.json()["collections"][0]
    assert collection["slug"].startswith("bali-quiet-week-")
    assert collection["count"] == 1
    assert len(collection["cover_grid_urls"]) == 4

    by_slug = client.get(f"/api/collections/{collection['slug']}")
    by_id = client.get(f"/api/collections/{collection_id}")
    assert by_slug.status_code == 200
    assert by_id.status_code == 200
    assert by_slug.json()["collection"]["trips"][0]["id"] == plan["id"]
    assert by_id.json()["collection"]["id"] == collection_id


@pytest.mark.asyncio
async def test_collection_detail_is_owner_scoped(client):
    owner = signup(client, "owner@example.com")
    created = client.post("/api/collections", json={"name": "Private Board"})
    collection_id = created.json()["collection"]["id"]
    await create_trip_plan(client, owner["id"])
    client.post("/api/auth/logout")
    signup(client, "other@example.com")

    response = client.get(f"/api/collections/{collection_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_trip_detail_returns_public_display_without_auth(client):
    user = signup(client)
    plan = await create_trip_plan(client, user["id"], title="Public Detail", categories=["pantai"])
    client.post("/api/auth/logout")

    response = client.get(f"/api/trip-plans/{plan['id']}/detail")

    assert response.status_code == 200
    detail = response.json()["detail"]
    assert detail["trip_plan"]["title"] == "Public Detail"
    assert detail["memo"]["markdown"]
    assert detail["itinerary"]
    assert detail["budget"]["categories"]
    assert detail["gallery"]["thumbs"]
    assert "GEMINI_API_KEY" not in str(detail)
    assert "GOOGLE_PLACES_API_KEY" not in str(detail)


@pytest.mark.asyncio
async def test_trip_detail_private_access_is_owner_only(client):
    owner = signup(client, "owner-detail@example.com")
    plan = await create_trip_plan(client, owner["id"], visibility="private", title="Private Detail")

    owner_response = client.get(f"/api/trip-plans/{plan['id']}/detail")
    assert owner_response.status_code == 200

    client.post("/api/auth/logout")
    signup(client, "other-detail@example.com")

    response = client.get(f"/api/trip-plans/{plan['id']}/detail")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_trip_detail_synthesizes_destination_coordinates_from_selected_recommendations(client):
    user = signup(client)
    item = await client.app.state.store.save_doc(
        "recommendationItems",
        {
            "id": "reci_detail_coords",
            "run_id": "rec_detail",
            "session_id": "tcs_detail",
            "owner_id": user["id"],
            "seed_id": "dest_kuta_beach",
            "place_enrichment_id": "plc_detail",
            "rank": 1,
            "name": "Pantai Kuta",
            "categories": ["pantai"],
            "region": "Bali",
            "short_summary": "Sunset beach stop",
            "description": "A beach stop with reliable location context.",
            "match_reason": "Matches beach preferences.",
            "opening_hours_summary": {"status": "available", "summary": "Open daily"},
            "estimated_cost": {"amount_idr": 150000, "label": "IDR 150,000", "source": "curated_seed", "is_estimate": True},
            "location": {
                "address": "Kuta, Bali",
                "lat": -8.7185,
                "lng": 115.1686,
                "google_maps_uri": "https://maps.google.com/?cid=1",
            },
            "image_snaps": [],
            "warnings": [],
            "source_notes": [],
            "confidence": "high",
        },
    )
    plan = await create_trip_plan(client, user["id"], title="Coordinate Detail", categories=["pantai"])
    await client.app.state.store.update_doc(
        "tripPlans",
        plan["id"],
        {"selected_recommendation_ids": [item["id"]]},
    )

    response = client.get(f"/api/trip-plans/{plan['id']}/detail")

    assert response.status_code == 200
    stop = response.json()["detail"]["destinations"][0]
    assert stop["lat"] == -8.7185
    assert stop["lng"] == 115.1686
    assert stop["google_maps_uri"] == "https://maps.google.com/?cid=1"
    assert stop["place_enrichment_id"] == "plc_detail"
