from datetime import UTC, datetime, timedelta
from typing import Any, cast

import pytest
from google.cloud.firestore import AsyncClient

from app.domain.errors import RepositoryUnavailableError
from app.domain.models import Issue, IssueChanges, IssueFilters, IssuePriority, IssueStatus, NewIssue, User
from app.repositories.firestore import FirestoreIssueRepository, FirestoreUserRepository
from tests.fakes import FailingFirestoreClient, FakeFirestoreClient

BASE_TIME = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture
def client() -> FakeFirestoreClient:
    return FakeFirestoreClient()


@pytest.fixture
def issues(client: FakeFirestoreClient) -> FirestoreIssueRepository:
    return FirestoreIssueRepository(cast(AsyncClient, client), "issues")


@pytest.fixture
def users(client: FakeFirestoreClient) -> FirestoreUserRepository:
    return FirestoreUserRepository(cast(AsyncClient, client), "users")


def new_issue(**overrides: Any) -> NewIssue:
    values: dict[str, Any] = {
        "title": "Falla",
        "description": "Detalle",
        "priority": IssuePriority.HIGH,
        "created_by": "admin",
    }
    return NewIssue(**{**values, **overrides})


async def create_at(
    repository: FirestoreIssueRepository, client: FakeFirestoreClient, minutes: int, **overrides: Any
) -> Issue:
    issue = await repository.create(new_issue(**overrides))
    client.stores["issues"][issue.id]["created_at"] = BASE_TIME + timedelta(minutes=minutes)
    return issue


async def test_user_roundtrip(users: FirestoreUserRepository, client: FakeFirestoreClient) -> None:
    await users.save(User(username="admin", full_name="Admin", password_hash="hash"))

    assert await users.get_by_username("admin") == User(username="admin", full_name="Admin", password_hash="hash")
    assert await users.get_by_username("ghost") is None
    assert client.stores["users"]["admin"] == {"full_name": "Admin", "password_hash": "hash"}


async def test_create_and_get_issue(issues: FirestoreIssueRepository, client: FakeFirestoreClient) -> None:
    created = await issues.create(new_issue())

    stored = client.stores["issues"][created.id]
    assert stored["status"] == "open"
    assert stored["priority"] == "high"
    assert await issues.get(created.id) == created
    assert await issues.get("missing") is None


async def test_list_applies_filters_order_and_limit(
    issues: FirestoreIssueRepository, client: FakeFirestoreClient
) -> None:
    oldest = await create_at(issues, client, 1, priority=IssuePriority.LOW)
    middle = await create_at(issues, client, 2, priority=IssuePriority.HIGH)
    newest = await create_at(issues, client, 3, priority=IssuePriority.HIGH, status=IssueStatus.DONE)

    everything = await issues.list(IssueFilters(), limit=10)
    high = await issues.list(IssueFilters(priority=IssuePriority.HIGH), limit=10)
    high_open = await issues.list(IssueFilters(status=IssueStatus.OPEN, priority=IssuePriority.HIGH), limit=10)
    limited = await issues.list(IssueFilters(), limit=1)

    assert [issue.id for issue in everything] == [newest.id, middle.id, oldest.id]
    assert [issue.id for issue in high] == [newest.id, middle.id]
    assert [issue.id for issue in high_open] == [middle.id]
    assert [issue.id for issue in limited] == [newest.id]


async def test_update_changes_only_given_fields(issues: FirestoreIssueRepository) -> None:
    created = await issues.create(new_issue())

    updated = await issues.update(created.id, IssueChanges(status=IssueStatus.IN_PROGRESS))
    reprioritized = await issues.update(created.id, IssueChanges(priority=IssuePriority.LOW))

    assert updated is not None
    assert updated.status == IssueStatus.IN_PROGRESS
    assert updated.priority == IssuePriority.HIGH
    assert reprioritized is not None
    assert reprioritized.priority == IssuePriority.LOW
    assert reprioritized.status == IssueStatus.IN_PROGRESS
    assert reprioritized.updated_at >= created.updated_at


async def test_update_missing_issue_returns_none(issues: FirestoreIssueRepository) -> None:
    assert await issues.update("missing", IssueChanges(status=IssueStatus.DONE)) is None


async def test_count_by_status(issues: FirestoreIssueRepository) -> None:
    await issues.create(new_issue())
    await issues.create(new_issue())
    await issues.create(new_issue(status=IssueStatus.DONE))

    assert await issues.count_by_status() == {IssueStatus.OPEN: 2, IssueStatus.IN_PROGRESS: 0, IssueStatus.DONE: 1}


async def test_google_errors_are_translated_to_domain_errors() -> None:
    failing_client = cast(AsyncClient, FailingFirestoreClient())

    with pytest.raises(RepositoryUnavailableError):
        await FirestoreUserRepository(failing_client, "users").get_by_username("admin")
    with pytest.raises(RepositoryUnavailableError):
        await FirestoreIssueRepository(failing_client, "issues").get("any")
