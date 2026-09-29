import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { resolveErrorMessage } from '@core/http/api-error';
import { Observable, finalize, tap } from 'rxjs';
import {
  CreateIssuePayload,
  EMPTY_FILTERS,
  EMPTY_SUMMARY,
  Issue,
  IssueChanges,
  IssueFilters,
  IssuePriority,
  IssueStatus,
} from './issue.models';
import { IssuesApi } from './issues.api';

@Injectable()
export class IssuesStore {
  private readonly api = inject(IssuesApi);

  readonly filters = signal<IssueFilters>(EMPTY_FILTERS);
  readonly searchTerm = signal('');

  private readonly issuesResource = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.api.list(params),
    defaultValue: [],
  });
  private readonly summaryResource = rxResource({
    stream: () => this.api.summary(),
    defaultValue: EMPTY_SUMMARY,
  });
  private readonly pending = signal<ReadonlySet<string>>(new Set());

  readonly pendingIds = this.pending.asReadonly();

  readonly summary = computed(() => this.summaryResource.value());
  readonly isLoading = computed(() => this.issuesResource.isLoading());
  readonly isSummaryLoading = computed(() => this.summaryResource.isLoading());
  readonly loadError = computed(() => {
    const error = this.issuesResource.error();
    return error ? resolveErrorMessage(error, 'No fue posible cargar las incidencias.') : null;
  });
  readonly hasActiveFilters = computed(() => {
    const { status, priority } = this.filters();
    return status !== null || priority !== null || this.searchTerm().trim() !== '';
  });
  readonly issues = computed<readonly Issue[]>(() => {
    const issues = this.issuesResource.hasValue() ? this.issuesResource.value() : [];
    const term = this.searchTerm().trim().toLocaleLowerCase('es');
    if (!term) {
      return issues;
    }
    return issues.filter((issue) =>
      `${issue.title} ${issue.description} ${issue.createdBy}`.toLocaleLowerCase('es').includes(term),
    );
  });

  setStatusFilter(status: IssueStatus | null): void {
    this.filters.update((filters) => ({ ...filters, status }));
  }

  setPriorityFilter(priority: IssuePriority | null): void {
    this.filters.update((filters) => ({ ...filters, priority }));
  }

  clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
    this.searchTerm.set('');
  }

  refresh(): void {
    this.issuesResource.reload();
    this.summaryResource.reload();
  }

  create(payload: CreateIssuePayload): Observable<Issue> {
    return this.api.create(payload).pipe(tap(() => this.refresh()));
  }

  update(issueId: string, changes: IssueChanges): Observable<Issue> {
    const snapshot = this.issuesResource.value();
    this.patchLocal(issueId, changes);
    this.setPending(issueId, true);

    return this.api.update(issueId, changes).pipe(
      tap({
        next: () => this.refresh(),
        error: () => this.issuesResource.set(snapshot),
      }),
      finalize(() => this.setPending(issueId, false)),
    );
  }

  private patchLocal(issueId: string, changes: IssueChanges): void {
    this.issuesResource.update((issues) =>
      issues.map((issue) => (issue.id === issueId ? { ...issue, ...changes } : issue)),
    );
  }

  private setPending(issueId: string, pending: boolean): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(issueId);
      } else {
        next.delete(issueId);
      }
      return next;
    });
  }
}
