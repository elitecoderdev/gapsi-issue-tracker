import time
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import Lock

import jwt
from pwdlib import PasswordHash

from app.domain.errors import InvalidTokenError, TooManyAttemptsError


class PasswordHasher:
    def __init__(self) -> None:
        self._hasher = PasswordHash.recommended()
        self._dummy_hash = self._hasher.hash("timing-attack-mitigation")

    def hash(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify(self, password: str, password_hash: str | None) -> bool:
        return self._hasher.verify(password, password_hash or self._dummy_hash) and password_hash is not None


@dataclass(frozen=True, slots=True)
class AccessToken:
    value: str
    expires_in: int


class TokenService:
    def __init__(self, secret_key: str, algorithm: str, issuer: str, expire_minutes: int) -> None:
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._issuer = issuer
        self._lifetime = timedelta(minutes=expire_minutes)

    def issue(self, subject: str) -> AccessToken:
        issued_at = datetime.now(UTC)
        claims = {
            "sub": subject,
            "iss": self._issuer,
            "iat": issued_at,
            "exp": issued_at + self._lifetime,
        }
        token = jwt.encode(claims, self._secret_key, algorithm=self._algorithm)
        return AccessToken(value=token, expires_in=int(self._lifetime.total_seconds()))

    def read_subject(self, token: str) -> str:
        try:
            claims = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm],
                issuer=self._issuer,
                options={"require": ["sub", "exp", "iat", "iss"]},
            )
        except jwt.PyJWTError as error:
            raise InvalidTokenError() from error
        return str(claims["sub"])


class LoginRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = {}
        self._lock = Lock()

    def ensure_allowed(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._evict_expired(now)
            attempts = self._attempts.get(key)
            if attempts and len(attempts) >= self._max_attempts:
                retry_after = int(self._window_seconds - (now - attempts[0])) + 1
                raise TooManyAttemptsError(retry_after)

    def register_failure(self, key: str) -> None:
        with self._lock:
            self._attempts.setdefault(key, deque()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)

    def _evict_expired(self, now: float) -> None:
        for key in list(self._attempts):
            attempts = self._attempts[key]
            while attempts and now - attempts[0] > self._window_seconds:
                attempts.popleft()
            if not attempts:
                del self._attempts[key]
