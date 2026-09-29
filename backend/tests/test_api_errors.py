import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.container import Container
from app.domain.errors import RepositoryUnavailableError
from app.main import create_app
from app.repositories.memory import InMemoryUserRepository
from tests.conftest import TEST_USERNAME
from tests.test_issues import create_issue


def test_get_issue_by_id(client: TestClient, auth_headers: dict[str, str]) -> None:
    issue = create_issue(client, auth_headers)

    response = client.get(f"/api/issues/{issue['id']}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == issue


def test_get_unknown_issue_returns_404(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/issues/unknown", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "issue_not_found"


def test_issue_id_rejects_unsafe_characters(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/issues/..%2F..%2Fusers", headers=auth_headers)

    assert response.status_code in {404, 422}


def test_unknown_fields_are_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/issues",
        json={"title": "Falla", "description": "Detalle", "priority": "low", "created_by": "admin"},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_unsupported_method_uses_error_contract(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.delete("/api/issues", headers=auth_headers)

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "http_error"


def test_unknown_route_uses_error_contract(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"


def test_token_for_deleted_user_is_rejected(
    client: TestClient, container: Container, auth_headers: dict[str, str]
) -> None:
    users = container.users
    assert isinstance(users, InMemoryUserRepository)
    users._users.pop(TEST_USERNAME)

    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"


def test_non_bearer_scheme_is_rejected(client: TestClient) -> None:
    response = client.get("/api/auth/me", headers={"Authorization": "Basic YWRtaW46YWRtaW4="})

    assert response.status_code == 401


def test_repository_failures_return_503(
    settings: Settings, container: Container, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    async def unavailable(*_: object) -> None:
        raise RepositoryUnavailableError()

    monkeypatch.setattr(container.issues, "list", unavailable)

    with TestClient(create_app(settings, container)) as failing_client:
        response = failing_client.get("/api/issues", headers=auth_headers)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "repository_unavailable"


def test_unexpected_errors_are_hidden(
    settings: Settings, container: Container, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    async def explode(*_: object) -> None:
        raise RuntimeError("database password leaked in stack trace")

    monkeypatch.setattr(container.issues, "count_by_status", explode)

    with TestClient(create_app(settings, container), raise_server_exceptions=False) as failing_client:
        response = failing_client.get("/api/issues/summary", headers=auth_headers)

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Ocurrió un error inesperado. Intenta nuevamente."}
    }
    assert "password" not in response.text


def test_cors_is_restricted_to_configured_origins(settings: Settings, container: Container) -> None:
    app = create_app(replace_settings(settings, cors_origins=["http://localhost:4200"]), container)

    with TestClient(app) as cors_client:
        allowed = cors_client.options(
            "/api/issues",
            headers={"Origin": "http://localhost:4200", "Access-Control-Request-Method": "GET"},
        )
        denied = cors_client.options(
            "/api/issues",
            headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
        )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:4200"
    assert "access-control-allow-origin" not in denied.headers


def test_docs_can_be_disabled(settings: Settings, container: Container) -> None:
    app = create_app(replace_settings(settings, docs_enabled=False), container)

    with TestClient(app) as docs_client:
        assert docs_client.get("/api/docs").status_code == 404
        assert docs_client.get("/api/openapi.json").status_code == 404


def test_container_is_built_from_settings_when_not_provided(settings: Settings) -> None:
    with TestClient(create_app(settings)) as default_client:
        assert default_client.get("/api/health").json() == {"status": "ok"}


def replace_settings(settings: Settings, **changes: object) -> Settings:
    return settings.model_copy(update=changes)
