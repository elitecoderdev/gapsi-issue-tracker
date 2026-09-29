import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.middleware import add_security_headers
from app.api.routers import auth, health, issues
from app.core.config import Settings, get_settings
from app.core.container import Container, build_container


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.container = container or build_container(settings)
        yield

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url=f"{settings.api_prefix}/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url=f"{settings.api_prefix}/openapi.json" if settings.docs_enabled else None,
    )

    app.middleware("http")(add_security_headers)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
            max_age=600,
        )

    register_error_handlers(app)
    for router in (health.router, auth.router, issues.router):
        app.include_router(router, prefix=settings.api_prefix)
    return app


app = create_app()
