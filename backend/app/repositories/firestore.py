import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from functools import wraps
from typing import Any

from google.api_core.exceptions import GoogleAPICallError, RetryError
from google.cloud.firestore import AsyncClient, AsyncCollectionReference, DocumentSnapshot, FieldFilter, Query

from app.domain.errors import RepositoryUnavailableError
from app.domain.models import Issue, IssueChanges, IssueFilters, IssuePriority, IssueStatus, NewIssue, User

logger = logging.getLogger(__name__)


def translate_errors[**P, R](operation: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
    @wraps(operation)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return await operation(*args, **kwargs)
        except (GoogleAPICallError, RetryError) as error:
            logger.exception("Firestore operation '%s' failed", operation.__qualname__)
            raise RepositoryUnavailableError() from error

    return wrapper


class FirestoreUserRepository:
    def __init__(self, client: AsyncClient, collection_name: str) -> None:
        self._collection: AsyncCollectionReference = client.collection(collection_name)

    @translate_errors
    async def get_by_username(self, username: str) -> User | None:
        snapshot = await self._collection.document(username).get()
        if not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        return User(username=snapshot.id, full_name=data["full_name"], password_hash=data["password_hash"])

    @translate_errors
    async def save(self, user: User) -> None:
        await self._collection.document(user.username).set(
            {"full_name": user.full_name, "password_hash": user.password_hash}
        )


class FirestoreIssueRepository:
    def __init__(self, client: AsyncClient, collection_name: str) -> None:
        self._collection: AsyncCollectionReference = client.collection(collection_name)

    @translate_errors
    async def list(self, filters: IssueFilters, limit: int) -> list[Issue]:
        query: Any = self._collection
        if filters.status is not None:
            query = query.where(filter=FieldFilter("status", "==", filters.status.value))
        if filters.priority is not None:
            query = query.where(filter=FieldFilter("priority", "==", filters.priority.value))
        query = query.order_by("created_at", direction=Query.DESCENDING).limit(limit)
        return [self._to_issue(snapshot) async for snapshot in query.stream()]

    @translate_errors
    async def get(self, issue_id: str) -> Issue | None:
        snapshot = await self._collection.document(issue_id).get()
        return self._to_issue(snapshot) if snapshot.exists else None

    @translate_errors
    async def create(self, new_issue: NewIssue) -> Issue:
        now = datetime.now(UTC)
        document = self._collection.document()
        await document.set(
            {
                "title": new_issue.title,
                "description": new_issue.description,
                "status": new_issue.status.value,
                "priority": new_issue.priority.value,
                "created_by": new_issue.created_by,
                "created_at": now,
                "updated_at": now,
            }
        )
        return Issue(
            id=document.id,
            title=new_issue.title,
            description=new_issue.description,
            status=new_issue.status,
            priority=new_issue.priority,
            created_by=new_issue.created_by,
            created_at=now,
            updated_at=now,
        )

    @translate_errors
    async def update(self, issue_id: str, changes: IssueChanges) -> Issue | None:
        document = self._collection.document(issue_id)
        snapshot = await document.get()
        if not snapshot.exists:
            return None
        await document.update({**changes.as_fields(), "updated_at": datetime.now(UTC)})
        return self._to_issue(await document.get())

    @translate_errors
    async def count_by_status(self) -> dict[IssueStatus, int]:
        statuses = list(IssueStatus)
        totals = await asyncio.gather(*(self._count_status(status) for status in statuses))
        return dict(zip(statuses, totals, strict=True))

    async def _count_status(self, status: IssueStatus) -> int:
        aggregation = self._collection.where(filter=FieldFilter("status", "==", status.value)).count(alias="total")
        results = await aggregation.get()
        return int(results[0][0].value)

    @staticmethod
    def _to_issue(snapshot: DocumentSnapshot) -> Issue:
        data = snapshot.to_dict() or {}
        return Issue(
            id=snapshot.id,
            title=data["title"],
            description=data["description"],
            status=IssueStatus(data["status"]),
            priority=IssuePriority(data["priority"]),
            created_by=data["created_by"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
