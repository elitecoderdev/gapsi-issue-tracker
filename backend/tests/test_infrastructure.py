import json
from pathlib import Path

import pytest

from app.core.config import Settings
from app.core.container import build_container, build_repositories
from app.core.security import LoginRateLimiter, PasswordHasher
from app.domain.errors import TooManyAttemptsError
from app.domain.models import IssueFilters, IssueStatus, User
from app.repositories.firestore import FirestoreIssueRepository, FirestoreUserRepository
from app.repositories.memory import InMemoryIssueRepository, InMemoryUserRepository
from scripts import seed as seed_module
from tests.fakes import FakeFirestoreClient

SECRET = "test-secret-key-with-enough-length-1234567890"


def test_build_repositories_uses_memory_backend() -> None:
    users, issues = build_repositories(Settings(jwt_secret_key=SECRET, repository_backend="memory"))

    assert isinstance(users, InMemoryUserRepository)
    assert isinstance(issues, InMemoryIssueRepository)


def test_build_repositories_uses_firestore_backend(monkeypatch: pytest.MonkeyPatch) -> None:
    created: dict[str, str | None] = {}

    def fake_client(project: str | None, database: str) -> FakeFirestoreClient:
        created.update(project=project, database=database)
        return FakeFirestoreClient()

    monkeypatch.setattr("google.cloud.firestore.AsyncClient", fake_client)
    settings = Settings(jwt_secret_key=SECRET, repository_backend="firestore", gcp_project_id="demo")

    users, issues = build_repositories(settings)

    assert isinstance(users, FirestoreUserRepository)
    assert isinstance(issues, FirestoreIssueRepository)
    assert created == {"project": "demo", "database": "(default)"}


def test_settings_reject_short_jwt_secret() -> None:
    with pytest.raises(ValueError):
        Settings(jwt_secret_key="short")


def test_password_hasher_never_accepts_missing_hash() -> None:
    hasher = PasswordHasher()

    assert hasher.verify("timing-attack-mitigation", None) is False
    assert hasher.verify("secret-password", hasher.hash("secret-password")) is True
    assert hasher.verify("other-password", hasher.hash("secret-password")) is False


def test_rate_limiter_blocks_and_recovers_after_window(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = {"now": 1000.0}
    monkeypatch.setattr("app.core.security.time.monotonic", lambda: clock["now"])
    limiter = LoginRateLimiter(max_attempts=2, window_seconds=60)

    limiter.register_failure("admin")
    limiter.register_failure("admin")
    with pytest.raises(TooManyAttemptsError) as blocked:
        limiter.ensure_allowed("admin")
    assert blocked.value.retry_after_seconds == 61

    clock["now"] += 61
    limiter.ensure_allowed("admin")


def test_rate_limiter_does_not_keep_state_for_unknown_or_expired_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = {"now": 0.0}
    monkeypatch.setattr("app.core.security.time.monotonic", lambda: clock["now"])
    limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)

    for index in range(1000):
        limiter.ensure_allowed(f"random-user-{index}")
    limiter.register_failure("attacker")
    clock["now"] = 120
    limiter.ensure_allowed("someone")

    assert limiter._attempts == {}


async def test_seed_creates_users_and_sample_issues_once(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(jwt_secret_key=SECRET, repository_backend="memory")
    repositories = build_repositories(settings)
    monkeypatch.setattr(seed_module, "get_settings", lambda: settings)
    monkeypatch.setattr(seed_module, "build_repositories", lambda _: repositories)
    data = seed_module.SeedData.model_validate(
        {
            "users": [{"username": "admin", "full_name": "Admin", "password": "Sup3r-Secret"}],
            "issues": [
                {"title": "Falla", "description": "Detalle", "priority": "high", "created_by": "admin"},
                {"title": "Otra", "description": "Detalle", "priority": "low", "status": "done", "created_by": "admin"},
            ],
        }
    )

    await seed_module.seed(data)
    await seed_module.seed(data)

    users, issues = repositories
    admin = await users.get_by_username("admin")
    assert admin is not None
    assert admin.password_hash.startswith("$argon2id$")
    assert "Sup3r-Secret" not in admin.password_hash
    stored = await issues.list(IssueFilters(), limit=10)
    assert len(stored) == 2
    assert {issue.status for issue in stored} == {IssueStatus.OPEN, IssueStatus.DONE}


def test_seed_main_reads_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    seed_file = tmp_path / "seed.json"
    seed_file.write_text(
        json.dumps({"users": [{"username": "admin", "full_name": "Admin", "password": "Sup3r-Secret"}]}),
        encoding="utf-8",
    )
    received: list[seed_module.SeedData] = []

    async def fake_seed(data: seed_module.SeedData) -> None:
        received.append(data)

    monkeypatch.setattr(seed_module, "seed", fake_seed)
    monkeypatch.setattr("sys.argv", ["seed", str(seed_file)])

    seed_module.main()

    assert received[0].users[0].username == "admin"
    assert received[0].issues == []


async def test_container_shares_repositories_between_services() -> None:
    container = build_container(Settings(jwt_secret_key=SECRET, repository_backend="memory"))
    await container.users.save(
        User(username="admin", full_name="Admin", password_hash=container.password_hasher.hash("Sup3r-Secret"))
    )

    session = await container.auth_service.login("admin", "Sup3r-Secret")

    assert session.user.username == "admin"
    assert (await container.issue_service.get_summary()).total == 0
