from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.models import User
from app.services.auth_service import AuthenticatedSession


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9._-]+$")
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    username: str
    full_name: str

    @classmethod
    def from_domain(cls, user: User) -> "UserResponse":
        return cls(username=user.username, full_name=user.full_name)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse

    @classmethod
    def from_session(cls, session: AuthenticatedSession) -> "TokenResponse":
        return cls(
            access_token=session.token.value,
            expires_in=session.token.expires_in,
            user=UserResponse.from_domain(session.user),
        )
