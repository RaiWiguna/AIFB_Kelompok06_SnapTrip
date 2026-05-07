from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.app.db.models import Destination
from backend.app.services.destinations import DestinationService


def test_create_session(client: TestClient) -> None:
    response = client.post("/api/sessions", json={})

    assert response.status_code == 201
    payload = response.json()
    assert payload["data"]["session_id"].startswith("sess_")
    assert payload["data"]["status"] == "active"
    assert payload["meta"]["fallback_used"] is False


def test_get_session_valid(client: TestClient) -> None:
    created = client.post("/api/sessions", json={}).json()["data"]

    response = client.get(f"/api/sessions/{created['session_id']}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"] == {
        "session_id": created["session_id"],
        "status": "active",
        "detected_categories": [],
        "confirmed_categories": [],
        "selected_place_ids": [],
        "latest_itinerary_id": None,
    }


def test_get_session_invalid_returns_standard_error(client: TestClient) -> None:
    response = client.get("/api/sessions/sess_missing")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"


def test_seed_destination_terbaca(db_session: Session) -> None:
    destinations = db_session.exec(select(Destination)).all()
    bandung_destinations = DestinationService(db_session).list_destinations("Bandung")

    assert len(destinations) >= 10
    assert len(bandung_destinations) >= 10
    assert any(destination.id == "dest_001" for destination in destinations)
