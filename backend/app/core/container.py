from dataclasses import dataclass

from app.core.config import Settings
from app.core.security import LoginRateLimiter, PasswordHasher, TokenService
from app.repositories.base import IssueRepository, UserRepository
from app.services.auth_service import AuthService
from app.services.issue_service import IssueService


@dataclass(frozen=True, slots=True)
class Container:
    users: UserRepository
    issues: IssueRepository
    password_hasher: PasswordHasher
    auth_service: AuthService
    issue_service: IssueService


def build_repositories(settings: Settings) -> tuple[UserRepository, IssueRepository]:
    if settings.repository_backend == "memory":
        from app.repositories.memory import InMemoryIssueRepository, InMemoryUserRepository

        return InMemoryUserRepository(), InMemoryIssueRepository()

    from google.cloud.firestore import AsyncClient

    from app.repositories.firestore import FirestoreIssueRepository, FirestoreUserRepository

    client = AsyncClient(project=settings.gcp_project_id, database=settings.firestore_database)
    return (
        FirestoreUserRepository(client, settings.users_collection),
        FirestoreIssueRepository(client, settings.issues_collection),
    )


def build_container(settings: Settings) -> Container:
    users, issues = build_repositories(settings)
    password_hasher = PasswordHasher()
    token_service = TokenService(
        secret_key=settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        expire_minutes=settings.access_token_expire_minutes,
    )
    rate_limiter = LoginRateLimiter(settings.login_max_attempts, settings.login_window_seconds)
    return Container(
        users=users,
        issues=issues,
        password_hasher=password_hasher,
        auth_service=AuthService(users, password_hasher, token_service, rate_limiter),
        issue_service=IssueService(issues),
    )
