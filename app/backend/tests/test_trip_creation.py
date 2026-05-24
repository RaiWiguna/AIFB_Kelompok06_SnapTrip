from io import BytesIO

from conftest import signup
from PIL import Image

import app.api.trip_creation as trip_creation_module
from app.services.classifier import InvalidClassifierImageError


def image_bytes(format: str = "JPEG") -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (32, 32), color=(24, 96, 128)).save(buffer, format=format)
    return buffer.getvalue()


def contains_raw_bytes(value) -> bool:
    if isinstance(value, bytes):
        return True
    if isinstance(value, dict):
        return any(contains_raw_bytes(item) for item in value.values())
    if isinstance(value, list):
        return any(contains_raw_bytes(item) for item in value)
    return False


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
            ("files", ("a.jpg", image_bytes("JPEG"), "image/jpeg")),
            ("files", ("b.png", image_bytes("PNG"), "image/png")),
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
    trace_id = confirmed.json()["session"]["latest_flow1_trace_id"]
    events = client.app.state.store.collections["aiObservabilityEvents"].values()
    flow_events = [event for event in events if event["trace_id"] == trace_id]
    event_names = {event["event"] for event in flow_events}
    assert {
        "flow1_session_created",
        "flow1_images_added",
        "flow1_classification_started",
        "flow1_classifier_input_prepared",
        "flow1_classifier_completed",
        "flow1_categories_confirmed",
    }.issubset(event_names)
    input_event = next(event for event in flow_events if event["event"] == "flow1_classifier_input_prepared")
    assert input_event["payload"]["images"][0]["bytes_loaded"] > 0
    assert "bytes" not in input_event["payload"]["images"][0]

    seeds = client.get("/api/destination-seeds", params={"category": "pantai"})
    assert seeds.status_code == 200
    assert seeds.json()["seeds"]


def test_classify_maps_invalid_classifier_image_to_422(client, monkeypatch):
    class InvalidBytesClassifier:
        async def predict(self, images):
            raise InvalidClassifierImageError("synthetic decode failure")

    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()["session"]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("a.jpg", image_bytes("JPEG"), "image/jpeg"))],
    )
    monkeypatch.setattr(trip_creation_module, "get_classifier", lambda settings: InvalidBytesClassifier())

    response = client.post(f"/api/trip-creation-sessions/{session_id}/classify")

    assert response.status_code == 422
    assert response.json()["error"]["message"] == "Image file is invalid or corrupted"
    events = client.app.state.store.collections["aiObservabilityEvents"].values()
    failed = [event for event in events if event["event"] == "flow1_classifier_failed"]
    assert failed
    assert failed[-1]["status"] == "error"
    assert failed[-1]["payload"]["error_class"] == "InvalidClassifierImageError"
    assert contains_raw_bytes(failed[-1]["payload"]) is False


def test_classify_maps_unknown_classifier_category_to_503(client, monkeypatch):
    class UnknownCategoryClassifier:
        async def predict(self, images):
            return [
                {
                    "image_id": images[0]["id"],
                    "top_category": "museum",
                    "predictions": [{"category": "museum", "confidence": 1.0}],
                }
            ]

    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()["session"]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("a.jpg", image_bytes("JPEG"), "image/jpeg"))],
    )
    monkeypatch.setattr(trip_creation_module, "get_classifier", lambda settings: UnknownCategoryClassifier())

    response = client.post(f"/api/trip-creation-sessions/{session_id}/classify")

    assert response.status_code == 503
    assert response.json()["error"]["message"] == "Image classification is unavailable"


def test_session_recovery_returns_images_classification_and_selected_recommendations(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()["session"]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("a.jpg", image_bytes("JPEG"), "image/jpeg"))],
    )
    client.post(f"/api/trip-creation-sessions/{session_id}/classify")
    client.post(
        f"/api/trip-creation-sessions/{session_id}/confirm-categories",
        json={"categories": ["pantai"]},
    )
    generated = client.post(f"/api/trip-creation-sessions/{session_id}/recommendations").json()
    item_id = generated["items"][0]["id"]
    client.post(
        f"/api/trip-creation-sessions/{session_id}/selected-recommendations",
        json={"recommendation_item_ids": [item_id]},
    )

    recovered = client.get(f"/api/trip-creation-sessions/{session_id}")

    assert recovered.status_code == 200
    body = recovered.json()["session"]
    assert body["images"][0]["url"].startswith("/api/images/img_")
    assert body["classification"]["per_image"][0]["image_id"] == body["images"][0]["id"]
    assert body["latest_recommendations"]["items"][0]["id"] == item_id
    assert body["selected_recommendation_ids"] == [item_id]


def test_classification_includes_valid_source_image_refs(client):
    user = signup(client)
    image = client.app.state.store._insert(
        "uploadedImages",
        {
            "id": "img_public_cover",
            "owner_id": "usr_other",
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "size_bytes": 12,
            "checksum_sha256": "checksum",
            "gridfs_id": "img_public_cover",
        },
    )
    client.app.state.store._insert(
        "tripPlans",
        {
            "id": "trip_public_cover",
            "owner_id": user["id"],
            "title": "Public Cover",
            "status": "accepted",
            "visibility": "public",
            "categories": ["pantai"],
            "cover_image_id": image["id"],
        },
    )
    session_id = client.post("/api/trip-creation-sessions", json={"source": "liked_trips"}).json()["session"]["id"]

    sourced = client.post(f"/api/trip-creation-sessions/{session_id}/source-images", json=[image["id"]])
    classified = client.post(f"/api/trip-creation-sessions/{session_id}/classify")

    assert sourced.status_code == 200
    assert classified.status_code == 200
    assert classified.json()["classification"]["per_image"][0]["image_id"] == "img_public_cover"


def test_source_image_observability_counts_only_new_refs(client):
    user = signup(client)
    image = client.app.state.store._insert(
        "uploadedImages",
        {
            "id": "img_public_cover",
            "owner_id": "usr_other",
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "size_bytes": 12,
            "checksum_sha256": "checksum",
            "gridfs_id": "img_public_cover",
        },
    )
    client.app.state.store._insert(
        "tripPlans",
        {
            "id": "trip_public_cover",
            "owner_id": user["id"],
            "title": "Public Cover",
            "status": "accepted",
            "visibility": "public",
            "categories": ["pantai"],
            "cover_image_id": image["id"],
        },
    )
    session_id = client.post("/api/trip-creation-sessions", json={"source": "liked_trips"}).json()["session"]["id"]

    first = client.post(f"/api/trip-creation-sessions/{session_id}/source-images", json=[image["id"]])
    second = client.post(f"/api/trip-creation-sessions/{session_id}/source-images", json=[image["id"]])

    assert first.status_code == 200
    assert second.status_code == 200
    events = list(client.app.state.store.collections["aiObservabilityEvents"].values())
    source_events = [
        event
        for event in events
        if event["event"] == "flow1_images_added" and event["payload"]["source_type"] == "source_images"
    ]
    assert source_events[-2]["payload"]["added_count"] == 1
    assert source_events[-1]["payload"]["added_count"] == 0
    assert source_events[-1]["payload"]["added_image_ids"] == []
    assert source_events[-1]["payload"]["images"] == []


def test_source_images_reject_private_foreign_images(client):
    signup(client)
    client.app.state.store._insert(
        "uploadedImages",
        {
            "id": "img_private_foreign",
            "owner_id": "usr_other",
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "size_bytes": 12,
            "checksum_sha256": "checksum",
            "gridfs_id": "img_private_foreign",
        },
    )
    session_id = client.post("/api/trip-creation-sessions", json={"source": "liked_trips"}).json()["session"]["id"]

    sourced = client.post(f"/api/trip-creation-sessions/{session_id}/source-images", json=["img_private_foreign"])

    assert sourced.status_code == 404


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


def test_upload_rejects_corrupt_image_bytes(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]
    upload = client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("bad.jpg", b"not-an-image", "image/jpeg"))],
    )
    assert upload.status_code == 422


def test_upload_rejects_more_than_eight_images_across_session(client):
    signup(client)
    session_id = client.post("/api/trip-creation-sessions", json={"source": "upload"}).json()[
        "session"
    ]["id"]

    first_upload = client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[
            ("files", (f"{index}.png", image_bytes("PNG"), "image/png"))
            for index in range(8)
        ],
    )
    second_upload = client.post(
        f"/api/trip-creation-sessions/{session_id}/images",
        files=[("files", ("extra.png", image_bytes("PNG"), "image/png"))],
    )

    assert first_upload.status_code == 200
    assert second_upload.status_code == 422
