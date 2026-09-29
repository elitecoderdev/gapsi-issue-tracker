from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_USERNAME


def test_login_returns_jwt_and_user(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"].count(".") == 2
    assert body["user"] == {"username": TEST_USERNAME, "full_name": "Test User"}


def test_login_rejects_wrong_password(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_rejects_unknown_user_with_same_error(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": "ghost", "password": "whatever-123"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_is_rate_limited_after_repeated_failures(client: TestClient) -> None:
    for _ in range(3):
        client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": "wrong-password"})

    response = client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})

    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_me_requires_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_me_rejects_tampered_token(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/auth/me", headers={"Authorization": auth_headers["Authorization"] + "x"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"


def test_me_returns_current_user(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == TEST_USERNAME
