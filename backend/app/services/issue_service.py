from app.domain.errors import IssueNotFoundError
from app.domain.models import Issue, IssueChanges, IssueFilters, IssueSummary, NewIssue
from app.repositories.base import IssueRepository


class IssueService:
    def __init__(self, issues: IssueRepository) -> None:
        self._issues = issues

    async def list_issues(self, filters: IssueFilters, limit: int) -> list[Issue]:
        return await self._issues.list(filters, limit)

    async def get_issue(self, issue_id: str) -> Issue:
        issue = await self._issues.get(issue_id)
        if issue is None:
            raise IssueNotFoundError(issue_id)
        return issue

    async def create_issue(self, new_issue: NewIssue) -> Issue:
        return await self._issues.create(new_issue)

    async def update_issue(self, issue_id: str, changes: IssueChanges) -> Issue:
        issue = await self._issues.update(issue_id, changes)
        if issue is None:
            raise IssueNotFoundError(issue_id)
        return issue

    async def get_summary(self) -> IssueSummary:
        by_status = await self._issues.count_by_status()
        return IssueSummary(total=sum(by_status.values()), by_status=by_status)
