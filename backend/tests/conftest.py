import asyncio
import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-with-enough-length-1234567890")
os.environ.setdefault("REPOSITORY_BACKEND", "memory")

from app.core.config import Settings
from app.core.container import Container, build_container
from app.domain.models import User
from app.main import create_app

TEST_USERNAME = "tester"
TEST_PASSWORD = "S3cure-Test-Pass"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        environment="test",
        repository_backend="memory",
        jwt_secret_key="test-secret-key-with-enough-length-1234567890",
        login_max_attempts=3,
    )


@pytest.fixture
def container(settings: Settings) -> Container:
    container = build_container(settings)
    password_hash = container.password_hasher.hash(TEST_PASSWORD)
    asyncio.run(container.users.save(User(username=TEST_USERNAME, full_name="Test User", password_hash=password_hash)))
    return container


@pytest.fixture
def client(settings: Settings, container: Container) -> Iterator[TestClient]:
    with TestClient(create_app(settings, container)) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
