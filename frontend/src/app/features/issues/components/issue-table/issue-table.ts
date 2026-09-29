import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PRIORITY_META, STATUS_META } from '@features/issues/data/issue.labels';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  Issue,
  IssueChanges,
  IssuePriority,
  IssueStatus,
} from '@features/issues/data/issue.models';
import { Badge } from '@shared/ui/badge/badge';

export interface IssueChangeRequest {
  readonly issue: Issue;
  readonly changes: IssueChanges;
}

@Component({
  selector: 'app-issue-table',
  imports: [DatePipe, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issue-table.html',
  styleUrl: './issue-table.scss',
})
export class IssueTable {
  readonly issues = input.required<readonly Issue[]>();
  readonly pendingIds = input<ReadonlySet<string>>(new Set());
  readonly changeRequested = output<IssueChangeRequest>();

  protected readonly statuses = ISSUE_STATUSES;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly statusMeta = STATUS_META;
  protected readonly priorityMeta = PRIORITY_META;

  protected onStatusChange(issue: Issue, event: Event): void {
    this.emitChange(issue, { status: (event.target as HTMLSelectElement).value as IssueStatus });
  }

  protected onPriorityChange(issue: Issue, event: Event): void {
    this.emitChange(issue, { priority: (event.target as HTMLSelectElement).value as IssuePriority });
  }

  private emitChange(issue: Issue, changes: IssueChanges): void {
    this.changeRequested.emit({ issue, changes });
  }
}
