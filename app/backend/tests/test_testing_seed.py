def test_integrated_journey_seed_is_test_only_and_resets_memory_store(client):
    response = client.post("/api/testing/reset-product-journeys")

    assert response.status_code == 200
    body = response.json()
    assert body["seeded"] is True
    assert body["trips_by_category"]["pantai"] == "trip_e2e_pantai"
    assert body["private_trip_id"] == "trip_e2e_private"

    explore = client.get("/api/explore")
    assert explore.status_code == 200
    items = explore.json()["items"]
    assert len(items) == 4
    assert {item["categories"][0] for item in items} == {
        "pantai",
        "gunung",
        "air_terjun",
        "wisata_tradisional",
    }
    assert "trip_e2e_private" not in {item["id"] for item in items}
