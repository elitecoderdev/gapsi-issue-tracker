export const ISSUE_STATUSES = ['open', 'in_progress', 'done'] as const;
export const ISSUE_PRIORITIES = ['high', 'medium', 'low'] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export interface Issue {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: IssueStatus;
  readonly priority: IssuePriority;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IssueSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<IssueStatus, number>>;
}

export interface IssueFilters {
  readonly status: IssueStatus | null;
  readonly priority: IssuePriority | null;
}

export interface CreateIssuePayload {
  readonly title: string;
  readonly description: string;
  readonly priority: IssuePriority;
}

export type IssueChanges = Partial<Pick<Issue, 'status' | 'priority'>>;

export interface IssueDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: IssueStatus;
  readonly priority: IssuePriority;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface IssueSummaryDto {
  readonly total: number;
  readonly by_status: Record<IssueStatus, number>;
}

export const EMPTY_FILTERS: IssueFilters = { status: null, priority: null };

export const EMPTY_SUMMARY: IssueSummary = { total: 0, byStatus: { open: 0, in_progress: 0, done: 0 } };
