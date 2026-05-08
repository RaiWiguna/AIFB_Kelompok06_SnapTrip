import os

os.environ["SNAPTRIP_STORAGE"] = "memory"
os.environ["MONGODB_URI"] = "memory://snaptrip"
os.environ["APP_ENV"] = "test"
os.environ["CLASSIFIER_MODE"] = "mock"
os.environ["SESSION_SECRET"] = "test-session-secret"

import pytest
from fastapi.testclient import TestClient

from app.core.app import create_app


@pytest.fixture
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def signup(client: TestClient, email: str = "user@example.com", password: str = "password123"):
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password, "display_name": "Snap User"},
    )
    assert response.status_code == 201
    return response.json()["user"]


async def create_trip_plan(
    client: TestClient,
    owner_id: str,
    *,
    visibility: str = "public",
    categories: list[str] | None = None,
):
    return await client.app.state.store.save_doc(
        "tripPlans",
        {
            "id": "trip_test_" + visibility + "_" + "_".join(categories or ["pantai"]),
            "owner_id": owner_id,
            "title": "Test Trip",
            "status": "accepted",
            "visibility": visibility,
            "categories": categories or ["pantai"],
            "duration_days": 3,
            "estimated_budget_idr": 1_500_000,
            "cover_image_id": None,
        },
    )
