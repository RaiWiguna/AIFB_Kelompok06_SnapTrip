import pytest
from conftest import create_trip_plan, signup


@pytest.mark.asyncio
async def test_explore_filters_public_plans_by_category(client):
    user = signup(client)
    owner_id = user["id"]
    for category in ["pantai", "gunung", "air_terjun", "wisata_tradisional"]:
        await create_trip_plan(client, owner_id, categories=[category])
    await create_trip_plan(client, owner_id, visibility="private", categories=["pantai"])

    response = client.get("/api/explore", params={"category": "pantai"})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["categories"] == ["pantai"]

    all_public = client.get("/api/explore").json()["items"]
    assert len(all_public) == 4


@pytest.mark.asyncio
async def test_private_trip_plan_rejects_non_owner(client):
    owner = signup(client, "owner@example.com")
    private_plan = await create_trip_plan(client, owner["id"], visibility="private")
    client.post("/api/auth/logout")
    signup(client, "other@example.com")

    response = client.get(f"/api/trip-plans/{private_plan['id']}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_like_unlike_is_idempotent(client):
    user = signup(client)
    plan = await create_trip_plan(client, user["id"])

    first = client.post(f"/api/trip-plans/{plan['id']}/like")
    second = client.post(f"/api/trip-plans/{plan['id']}/like")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["like"]["id"] == second.json()["like"]["id"]

    unlike = client.delete(f"/api/trip-plans/{plan['id']}/like")
    again = client.delete(f"/api/trip-plans/{plan['id']}/like")
    assert unlike.status_code == 200
    assert again.status_code == 200


@pytest.mark.asyncio
async def test_collection_crud_and_save_remove(client):
    user = signup(client)
    plan = await create_trip_plan(client, user["id"])

    created = client.post("/api/collections", json={"name": "Weekend"})
    assert created.status_code == 201
    collection = created.json()["collection"]

    renamed = client.patch(f"/api/collections/{collection['id']}", json={"name": "Holiday"})
    assert renamed.status_code == 200
    assert renamed.json()["collection"]["name"] == "Holiday"

    first = client.post(f"/api/collections/{collection['id']}/items/{plan['id']}")
    duplicate = client.post(f"/api/collections/{collection['id']}/items/{plan['id']}")
    assert first.status_code == 200
    assert duplicate.status_code == 200
    assert first.json()["item"]["id"] == duplicate.json()["item"]["id"]

    removed = client.delete(f"/api/collections/{collection['id']}/items/{plan['id']}")
    assert removed.status_code == 200
    assert removed.json()["saved"] is False

    deleted = client.delete(f"/api/collections/{collection['id']}")
    assert deleted.status_code == 200
