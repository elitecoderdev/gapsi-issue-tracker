import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import (
    DomainError,
    InvalidCredentialsError,
    InvalidTokenError,
    IssueNotFoundError,
    RepositoryUnavailableError,
    TooManyAttemptsError,
)
from app.schemas.error import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)

DOMAIN_STATUS_CODES: dict[type[DomainError], int] = {
    InvalidCredentialsError: status.HTTP_401_UNAUTHORIZED,
    InvalidTokenError: status.HTTP_401_UNAUTHORIZED,
    TooManyAttemptsError: status.HTTP_429_TOO_MANY_REQUESTS,
    IssueNotFoundError: status.HTTP_404_NOT_FOUND,
    RepositoryUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message, details=details))
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(body, exclude_none=True),
        headers=headers,
    )


async def handle_domain_error(_: Request, error: DomainError) -> JSONResponse:
    status_code = DOMAIN_STATUS_CODES.get(type(error), status.HTTP_400_BAD_REQUEST)
    headers: dict[str, str] = {}
    if isinstance(error, InvalidTokenError):
        headers["WWW-Authenticate"] = "Bearer"
    if isinstance(error, TooManyAttemptsError):
        headers["Retry-After"] = str(error.retry_after_seconds)
    return error_response(status_code, error.code, error.message, headers=headers or None)


async def handle_validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(part) for part in item["loc"][1:]), "message": item["msg"]} for item in error.errors()
    ]
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "validation_error",
        "Los datos enviados no son válidos.",
        details,
    )


async def handle_http_error(_: Request, error: StarletteHTTPException) -> JSONResponse:
    return error_response(error.status_code, "http_error", str(error.detail))


async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=error)
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "Ocurrió un error inesperado. Intenta nuevamente.",
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
