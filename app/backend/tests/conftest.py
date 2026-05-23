import os

os.environ["SNAPTRIP_STORAGE"] = "memory"
os.environ["MONGODB_URI"] = "memory://snaptrip"
os.environ["APP_ENV"] = "test"
os.environ["CLASSIFIER_MODE"] = "mock"
os.environ["SESSION_SECRET"] = "test-session-secret"
os.environ["USE_GEMINI"] = "false"
os.environ["USE_GOOGLE_PLACES"] = "false"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GOOGLE_PLACES_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from app.core.app import create_app
from app.core.config import get_settings


@pytest.fixture
def client():
    get_settings.cache_clear()
    with TestClient(create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


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
    title: str = "Test Trip",
    region: str = "Bali, Indonesia",
):
    category_key = "_".join(categories or ["pantai"])
    existing = await client.app.state.store.list_docs("tripPlans")
    return await client.app.state.store.save_doc(
        "tripPlans",
        {
            "id": f"trip_test_{visibility}_{category_key}_{len(existing)}",
            "owner_id": owner_id,
            "title": title,
            "status": "accepted",
            "visibility": visibility,
            "categories": categories or ["pantai"],
            "duration_days": 3,
            "estimated_budget_idr": 1_500_000,
            "cover_image_id": None,
            "region": region,
        },
    )
