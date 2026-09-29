from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.dependencies import CurrentUser, IssueServiceDep, get_current_user
from app.domain.models import IssueFilters, IssuePriority, IssueStatus
from app.schemas.error import ErrorResponse
from app.schemas.issue import IssueCreateRequest, IssueResponse, IssueSummaryResponse, IssueUpdateRequest

router = APIRouter(
    prefix="/issues",
    tags=["Issues"],
    dependencies=[Depends(get_current_user)],
    responses={401: {"model": ErrorResponse}},
)

IssueId = Annotated[str, Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]


@router.get("", response_model=list[IssueResponse], summary="Lista incidencias con filtros opcionales")
async def list_issues(
    issue_service: IssueServiceDep,
    status_filter: Annotated[IssueStatus | None, Query(alias="status")] = None,
    priority: IssuePriority | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[IssueResponse]:
    issues = await issue_service.list_issues(IssueFilters(status=status_filter, priority=priority), limit)
    return [IssueResponse.from_domain(issue) for issue in issues]


@router.get("/summary", response_model=IssueSummaryResponse, summary="Total de incidencias por estado")
async def get_summary(issue_service: IssueServiceDep) -> IssueSummaryResponse:
    return IssueSummaryResponse.from_domain(await issue_service.get_summary())


@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea una incidencia",
)
async def create_issue(
    payload: IssueCreateRequest,
    issue_service: IssueServiceDep,
    current_user: CurrentUser,
) -> IssueResponse:
    issue = await issue_service.create_issue(payload.to_domain(author=current_user.username))
    return IssueResponse.from_domain(issue)


@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Obtiene una incidencia",
    responses={404: {"model": ErrorResponse}},
)
async def get_issue(issue_id: IssueId, issue_service: IssueServiceDep) -> IssueResponse:
    return IssueResponse.from_domain(await issue_service.get_issue(issue_id))


@router.patch(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Actualiza estado y/o prioridad de una incidencia",
    responses={404: {"model": ErrorResponse}},
)
async def update_issue(
    issue_id: IssueId,
    payload: IssueUpdateRequest,
    issue_service: IssueServiceDep,
) -> IssueResponse:
    return IssueResponse.from_domain(await issue_service.update_issue(issue_id, payload.to_domain()))
