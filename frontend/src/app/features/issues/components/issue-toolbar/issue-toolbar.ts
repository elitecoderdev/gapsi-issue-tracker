import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { PRIORITY_META, STATUS_META } from '@features/issues/data/issue.labels';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  IssueFilters,
  IssuePriority,
  IssueStatus,
} from '@features/issues/data/issue.models';

@Component({
  selector: 'app-issue-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issue-toolbar.html',
  styleUrl: './issue-toolbar.scss',
})
export class IssueToolbar {
  readonly filters = input.required<IssueFilters>();
  readonly hasActiveFilters = input(false);
  readonly searchTerm = model('');
  readonly statusChange = output<IssueStatus | null>();
  readonly priorityChange = output<IssuePriority | null>();
  readonly clear = output<void>();

  protected readonly statuses = ISSUE_STATUSES;
  protected readonly priorities = ISSUE_PRIORITIES;
  protected readonly statusMeta = STATUS_META;
  protected readonly priorityMeta = PRIORITY_META;

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected onPriorityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.priorityChange.emit(value ? (value as IssuePriority) : null);
  }
}
