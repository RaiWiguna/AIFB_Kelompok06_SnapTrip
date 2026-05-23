from conftest import signup
from fastapi.testclient import TestClient

from app.core.app import create_app
from app.core.config import get_settings


def set_cookie_headers(response):
    return response.headers.get_list("set-cookie")


def test_health_and_ready(client):
    assert client.get("/health").status_code == 200
    ready = client.get("/ready")
    assert ready.status_code == 200
    assert ready.json()["ready"] is True


def test_signup_login_me_logout(client):
    user = signup(client)
    assert user["email"] == "user@example.com"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == user["id"]

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200

    assert client.get("/api/auth/me").status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_local_auth_cookie_is_host_only(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "cookie@example.com", "password": "password123", "display_name": "Cookie User"},
    )

    session_cookie = next(
        header
        for header in set_cookie_headers(response)
        if header.startswith("snaptrip_session=") and "Max-Age=1209600" in header
    )
    assert "Domain=" not in session_cookie
    assert "Path=/" in session_cookie
    assert "HttpOnly" in session_cookie
    assert "SameSite=lax" in session_cookie


def test_configured_auth_cookie_domain_replaces_legacy_host_cookie(monkeypatch):
    monkeypatch.setenv("COOKIE_DOMAIN", "snaptrip.site")
    get_settings.cache_clear()
    with TestClient(create_app(), base_url="https://api.snaptrip.site") as client:
        response = client.post(
            "/api/auth/signup",
            json={"email": "domain@example.com", "password": "password123", "display_name": "Domain User"},
        )

    get_settings.cache_clear()
    headers = set_cookie_headers(response)
    legacy_delete = next(
        header
        for header in headers
        if header.startswith("snaptrip_session=") and "Max-Age=0" in header and "Domain=" not in header
    )
    domain_cookie = next(
        header
        for header in headers
        if header.startswith("snaptrip_session=") and "Max-Age=1209600" in header
    )
    assert "Path=/" in legacy_delete
    assert "Domain=snaptrip.site" in domain_cookie
    assert "Path=/" in domain_cookie
    assert "HttpOnly" in domain_cookie
    assert "SameSite=lax" in domain_cookie


def test_logout_expires_domain_and_legacy_host_cookies(monkeypatch):
    monkeypatch.setenv("COOKIE_DOMAIN", "snaptrip.site")
    get_settings.cache_clear()
    with TestClient(create_app(), base_url="https://api.snaptrip.site") as client:
        signup_response = client.post(
            "/api/auth/signup",
            json={"email": "logout@example.com", "password": "password123", "display_name": "Logout User"},
        )
        assert signup_response.status_code == 201

        logout = client.post("/api/auth/logout")

    get_settings.cache_clear()
    assert logout.status_code == 200
    headers = [
        header
        for header in set_cookie_headers(logout)
        if header.startswith("snaptrip_session=") and "Max-Age=0" in header
    ]
    assert any("Domain=snaptrip.site" in header for header in headers)
    assert any("Domain=" not in header for header in headers)


def test_duplicate_signup_and_invalid_login(client):
    signup(client)
    duplicate = client.post(
        "/api/auth/signup",
        json={"email": "USER@example.com", "password": "password123", "display_name": "Again"},
    )
    assert duplicate.status_code == 409

    invalid = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrong-password"},
    )
    assert invalid.status_code == 401
