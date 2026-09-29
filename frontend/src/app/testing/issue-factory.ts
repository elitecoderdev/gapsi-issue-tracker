import { Issue, IssueDto, IssueSummaryDto } from '@features/issues/data/issue.models';

export function buildIssueDto(overrides: Partial<IssueDto> = {}): IssueDto {
  return {
    id: 'issue-0001-abcdef',
    title: 'Falla en login',
    description: 'No permite ingresar',
    status: 'open',
    priority: 'high',
    created_by: 'admin',
    created_at: '2026-09-29T10:00:00Z',
    updated_at: '2026-09-29T11:00:00Z',
    ...overrides,
  };
}

export function buildIssue(overrides: Partial<Issue> = {}): Issue {
  const dto = buildIssueDto();
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    ...overrides,
  };
}

export function buildSummaryDto(open = 0, inProgress = 0, done = 0): IssueSummaryDto {
  return { total: open + inProgress + done, by_status: { open, in_progress: inProgress, done } };
}
