from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.container import Container
from app.domain.errors import InvalidTokenError
from app.domain.models import User
from app.services.auth_service import AuthService
from app.services.issue_service import IssueService

bearer_scheme = HTTPBearer(auto_error=False, description="JWT obtenido en /api/auth/login")


def get_container(request: Request) -> Container:
    container: Container = request.app.state.container
    return container


def get_auth_service(container: Annotated[Container, Depends(get_container)]) -> AuthService:
    return container.auth_service


def get_issue_service(container: Annotated[Container, Depends(get_container)]) -> IssueService:
    return container.issue_service


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenError()
    return await auth_service.resolve_user(credentials.credentials)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
IssueServiceDep = Annotated[IssueService, Depends(get_issue_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]
