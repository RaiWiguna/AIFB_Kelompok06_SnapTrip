from conftest import signup


def test_categories_endpoint(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    ids = {category["id"] for category in response.json()["categories"]}
    assert ids == {"pantai", "gunung", "air_terjun", "wisata_tradisional"}


def test_upload_classify_confirm_and_seeds(client):
    signup(client)
    created = client.post("/api/trip-creation-sessions", json={"source": "upload"})
    assert created.status_code == 201
    session_id = created.json()["session"]["id"]

    upload = client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[
            ("files", ("a.jpg", b"fake-jpg-data", "image/jpeg")),
            ("files", ("b.png", b"fake-png-data", "image/png")),
        ],
    )
    assert upload.status_code == 200
    assert len(upload.json()["images"]) == 2
    assert upload.json()["images"][0]["checksum_sha256"]

    classification = client.post(f"/api/trip-creation-sessions/{session_id}/classify")
    assert classification.status_code == 200
    body = classification.json()["classification"]
    assert body["mode"] == "mock"
    assert {item["category"] for item in body["aggregated"]}.issubset(
        {"pantai", "gunung", "air_terjun", "wisata_tradisional"}
    )

    invalid = client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": ["space"]},
    )
    assert invalid.status_code == 422

    confirmed = client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": ["pantai", "gunung"]},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["session"]["confirmed_categories"] == ["pantai", "gunung"]

    seeds = client.get("/api/destination-seeds", params={"category": "pantai"})
    assert seeds.status_code == 200
    assert seeds.json()["seeds"]


def test_upload_rejects_invalid_type(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]
    upload = client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("bad.txt", b"not-image", "text/plain"))],
    )
    assert upload.status_code == 422
