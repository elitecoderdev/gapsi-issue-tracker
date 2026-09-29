from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class IssueStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class IssuePriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class User:
    username: str
    full_name: str
    password_hash: str


@dataclass(frozen=True, slots=True)
class NewIssue:
    title: str
    description: str
    priority: IssuePriority
    created_by: str
    status: IssueStatus = IssueStatus.OPEN


@dataclass(frozen=True, slots=True)
class IssueChanges:
    status: IssueStatus | None = None
    priority: IssuePriority | None = None

    def as_fields(self) -> dict[str, str]:
        fields: dict[str, str] = {}
        if self.status is not None:
            fields["status"] = self.status.value
        if self.priority is not None:
            fields["priority"] = self.priority.value
        return fields


@dataclass(frozen=True, slots=True)
class Issue:
    id: str
    title: str
    description: str
    status: IssueStatus
    priority: IssuePriority
    created_by: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class IssueFilters:
    status: IssueStatus | None = None
    priority: IssuePriority | None = None


@dataclass(frozen=True, slots=True)
class IssueSummary:
    total: int
    by_status: dict[IssueStatus, int]
