from fastapi import APIRouter

from app.api.dependencies import AuthServiceDep, CurrentUser
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.error import ErrorResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Inicia sesión y obtiene un JWT",
    responses={401: {"model": ErrorResponse}, 429: {"model": ErrorResponse}},
)
async def login(payload: LoginRequest, auth_service: AuthServiceDep) -> TokenResponse:
    session = await auth_service.login(payload.username, payload.password)
    return TokenResponse.from_session(session)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Devuelve el usuario autenticado",
    responses={401: {"model": ErrorResponse}},
)
async def read_current_user(current_user: CurrentUser) -> UserResponse:
    return UserResponse.from_domain(current_user)
