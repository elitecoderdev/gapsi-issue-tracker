from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Issue Tracker API"
    app_version: str = "1.0.0"
    environment: Literal["local", "test", "production"] = "local"
    api_prefix: str = "/api"
    docs_enabled: bool = True
    log_level: str = "INFO"

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "issue-tracker-api"
    access_token_expire_minutes: int = Field(default=60, gt=0, le=1440)

    login_max_attempts: int = Field(default=5, gt=0)
    login_window_seconds: int = Field(default=60, gt=0)

    repository_backend: Literal["firestore", "memory"] = "firestore"
    gcp_project_id: str | None = None
    firestore_database: str = "(default)"
    users_collection: str = "users"
    issues_collection: str = "issues"

    cors_origins: list[str] = Field(default_factory=list)


@lru_cache
def get_settings() -> Settings:
    return Settings()
