from typing import Any

from fastapi.testclient import TestClient


def create_issue(client: TestClient, headers: dict[str, str], **overrides: Any) -> dict[str, Any]:
    payload = {"title": "Falla en login", "description": "No permite ingresar", "priority": "high", **overrides}
    response = client.post("/api/issues", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_issues_require_authentication(client: TestClient) -> None:
    assert client.get("/api/issues").status_code == 401


def test_create_issue_sets_defaults(client: TestClient, auth_headers: dict[str, str]) -> None:
    issue = create_issue(client, auth_headers, title="  Título con espacios  ")

    assert issue["title"] == "Título con espacios"
    assert issue["status"] == "open"
    assert issue["priority"] == "high"
    assert issue["created_by"] == "tester"


def test_create_issue_validates_payload(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/issues",
        json={"title": "ab", "description": "", "priority": "urgent"},
        headers=auth_headers,
    )

    assert response.status_code == 422
    fields = {detail["field"] for detail in response.json()["error"]["details"]}
    assert fields == {"title", "description", "priority"}


def test_list_issues_filters_by_status_and_priority(client: TestClient, auth_headers: dict[str, str]) -> None:
    high = create_issue(client, auth_headers, priority="high")
    create_issue(client, auth_headers, priority="low")
    client.patch(f"/api/issues/{high['id']}", json={"status": "in_progress"}, headers=auth_headers)

    by_priority = client.get("/api/issues", params={"priority": "low"}, headers=auth_headers).json()
    by_status = client.get("/api/issues", params={"status": "in_progress"}, headers=auth_headers).json()
    combined = client.get("/api/issues", params={"status": "open", "priority": "high"}, headers=auth_headers).json()

    assert [issue["priority"] for issue in by_priority] == ["low"]
    assert [issue["id"] for issue in by_status] == [high["id"]]
    assert combined == []


def test_update_issue_status_and_priority(client: TestClient, auth_headers: dict[str, str]) -> None:
    issue = create_issue(client, auth_headers)

    response = client.patch(
        f"/api/issues/{issue['id']}", json={"status": "done", "priority": "low"}, headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["priority"] == "low"


def test_update_issue_requires_a_field(client: TestClient, auth_headers: dict[str, str]) -> None:
    issue = create_issue(client, auth_headers)

    response = client.patch(f"/api/issues/{issue['id']}", json={}, headers=auth_headers)

    assert response.status_code == 422


def test_unknown_issue_returns_404(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.patch("/api/issues/does-not-exist", json={"status": "done"}, headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "issue_not_found"


def test_summary_counts_issues_by_status(client: TestClient, auth_headers: dict[str, str]) -> None:
    first = create_issue(client, auth_headers)
    create_issue(client, auth_headers)
    third = create_issue(client, auth_headers)
    client.patch(f"/api/issues/{first['id']}", json={"status": "in_progress"}, headers=auth_headers)
    client.patch(f"/api/issues/{third['id']}", json={"status": "done"}, headers=auth_headers)

    summary = client.get("/api/issues/summary", headers=auth_headers).json()

    assert summary == {"total": 3, "by_status": {"open": 1, "in_progress": 1, "done": 1}}


def test_security_headers_are_present(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
