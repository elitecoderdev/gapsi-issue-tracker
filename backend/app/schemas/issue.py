from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.models import Issue, IssueChanges, IssuePriority, IssueStatus, IssueSummary, NewIssue


class IssueCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    priority: IssuePriority = IssuePriority.MEDIUM

    def to_domain(self, author: str) -> NewIssue:
        return NewIssue(title=self.title, description=self.description, priority=self.priority, created_by=author)


class IssueUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IssueStatus | None = None
    priority: IssuePriority | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> Self:
        if self.status is None and self.priority is None:
            raise ValueError("Debes indicar al menos 'status' o 'priority'.")
        return self

    def to_domain(self) -> IssueChanges:
        return IssueChanges(status=self.status, priority=self.priority)


class IssueResponse(BaseModel):
    id: str
    title: str
    description: str
    status: IssueStatus
    priority: IssuePriority
    created_by: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, issue: Issue) -> "IssueResponse":
        return cls(
            id=issue.id,
            title=issue.title,
            description=issue.description,
            status=issue.status,
            priority=issue.priority,
            created_by=issue.created_by,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
        )


class IssueSummaryResponse(BaseModel):
    total: int
    by_status: dict[IssueStatus, int]

    @classmethod
    def from_domain(cls, summary: IssueSummary) -> "IssueSummaryResponse":
        return cls(total=summary.total, by_status=summary.by_status)
