import asyncio
from dataclasses import replace
from datetime import UTC, datetime
from uuid import uuid4

from app.domain.models import Issue, IssueChanges, IssueFilters, IssueStatus, NewIssue, User


class InMemoryUserRepository:
    def __init__(self) -> None:
        self._users: dict[str, User] = {}

    async def get_by_username(self, username: str) -> User | None:
        return self._users.get(username)

    async def save(self, user: User) -> None:
        self._users[user.username] = user


class InMemoryIssueRepository:
    def __init__(self) -> None:
        self._issues: dict[str, Issue] = {}
        self._lock = asyncio.Lock()

    async def list(self, filters: IssueFilters, limit: int) -> list[Issue]:
        matches = (
            issue
            for issue in self._issues.values()
            if (filters.status is None or issue.status == filters.status)
            and (filters.priority is None or issue.priority == filters.priority)
        )
        return sorted(matches, key=lambda issue: issue.created_at, reverse=True)[:limit]

    async def get(self, issue_id: str) -> Issue | None:
        return self._issues.get(issue_id)

    async def create(self, new_issue: NewIssue) -> Issue:
        now = datetime.now(UTC)
        issue = Issue(
            id=uuid4().hex,
            title=new_issue.title,
            description=new_issue.description,
            status=new_issue.status,
            priority=new_issue.priority,
            created_by=new_issue.created_by,
            created_at=now,
            updated_at=now,
        )
        async with self._lock:
            self._issues[issue.id] = issue
        return issue

    async def update(self, issue_id: str, changes: IssueChanges) -> Issue | None:
        async with self._lock:
            current = self._issues.get(issue_id)
            if current is None:
                return None
            updated = replace(
                current,
                status=changes.status or current.status,
                priority=changes.priority or current.priority,
                updated_at=datetime.now(UTC),
            )
            self._issues[issue_id] = updated
            return updated

    async def count_by_status(self) -> dict[IssueStatus, int]:
        counts = dict.fromkeys(IssueStatus, 0)
        for issue in self._issues.values():
            counts[issue.status] += 1
        return counts
