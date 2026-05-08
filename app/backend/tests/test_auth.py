from conftest import signup


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
