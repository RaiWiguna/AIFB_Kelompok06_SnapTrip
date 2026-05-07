from backend.app.main import app


def test_import_app() -> None:
    assert app.title == "SnapTrip API"


def test_health_endpoint_returns_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["status"] == "ok"
    assert payload["data"]["service"] == "SnapTrip API"
    assert payload["meta"]["fallback_used"] is False


def test_api_health_endpoint_returns_ok(client) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"
