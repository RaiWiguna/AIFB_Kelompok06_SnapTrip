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
    collection_id = created.json()["collection"]["id"]
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
