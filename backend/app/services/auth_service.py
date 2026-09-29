from dataclasses import dataclass

from app.core.security import AccessToken, LoginRateLimiter, PasswordHasher, TokenService
from app.domain.errors import InvalidCredentialsError, InvalidTokenError
from app.domain.models import User
from app.repositories.base import UserRepository


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    token: AccessToken
    user: User


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        password_hasher: PasswordHasher,
        token_service: TokenService,
        rate_limiter: LoginRateLimiter,
    ) -> None:
        self._users = users
        self._password_hasher = password_hasher
        self._token_service = token_service
        self._rate_limiter = rate_limiter

    async def login(self, username: str, password: str) -> AuthenticatedSession:
        attempt_key = username.lower()
        self._rate_limiter.ensure_allowed(attempt_key)

        user = await self._users.get_by_username(username)
        if not self._password_hasher.verify(password, user.password_hash if user else None) or user is None:
            self._rate_limiter.register_failure(attempt_key)
            raise InvalidCredentialsError()

        self._rate_limiter.reset(attempt_key)
        return AuthenticatedSession(token=self._token_service.issue(user.username), user=user)

    async def resolve_user(self, token: str) -> User:
        username = self._token_service.read_subject(token)
        user = await self._users.get_by_username(username)
        if user is None:
            raise InvalidTokenError()
        return user
