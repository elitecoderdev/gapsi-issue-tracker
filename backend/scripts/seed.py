import argparse
import asyncio
import json
import logging
from pathlib import Path

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.container import build_repositories
from app.core.security import PasswordHasher
from app.domain.models import IssueFilters, IssuePriority, IssueStatus, NewIssue, User

logger = logging.getLogger("seed")


class SeedUser(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str
    password: str = Field(min_length=8)


class SeedIssue(BaseModel):
    title: str
    description: str
    priority: IssuePriority
    status: IssueStatus = IssueStatus.OPEN
    created_by: str


class SeedData(BaseModel):
    users: list[SeedUser]
    issues: list[SeedIssue] = Field(default_factory=list)


async def seed(data: SeedData) -> None:
    users, issues = build_repositories(get_settings())
    password_hasher = PasswordHasher()

    for seed_user in data.users:
        await users.save(
            User(
                username=seed_user.username,
                full_name=seed_user.full_name,
                password_hash=password_hasher.hash(seed_user.password),
            )
        )
        logger.info("User '%s' saved", seed_user.username)

    if data.issues and not await issues.list(IssueFilters(), limit=1):
        for seed_issue in data.issues:
            await issues.create(NewIssue(**seed_issue.model_dump()))
        logger.info("%d sample issues created", len(data.issues))


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed users and sample issues")
    parser.add_argument("file", type=Path, help="Path to the seed JSON file")
    arguments = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    data = SeedData.model_validate(json.loads(arguments.file.read_text(encoding="utf-8")))
    asyncio.run(seed(data))


if __name__ == "__main__":
    main()
