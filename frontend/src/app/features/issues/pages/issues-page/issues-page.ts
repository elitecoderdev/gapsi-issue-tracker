import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { resolveErrorMessage } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { IssueCreateDrawer } from '@features/issues/components/issue-create-drawer/issue-create-drawer';
import { IssueChangeRequest, IssueTable } from '@features/issues/components/issue-table/issue-table';
import { IssueToolbar } from '@features/issues/components/issue-toolbar/issue-toolbar';
import { SummaryCards } from '@features/issues/components/summary-cards/summary-cards';
import { PRIORITY_META, STATUS_META } from '@features/issues/data/issue.labels';
import { IssuesStore } from '@features/issues/data/issues.store';

@Component({
  selector: 'app-issues-page',
  imports: [SummaryCards, IssueToolbar, IssueTable, IssueCreateDrawer],
  providers: [IssuesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issues-page.html',
  styleUrl: './issues-page.scss',
})
export class IssuesPage {
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(IssuesStore);
  protected readonly isCreateOpen = signal(false);

  protected openCreate(): void {
    this.isCreateOpen.set(true);
  }

  protected closeCreate(): void {
    this.isCreateOpen.set(false);
  }

  protected applyChange({ issue, changes }: IssueChangeRequest): void {
    this.store
      .update(issue.id, changes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.toast.success(this.describeChange(issue.title, changes)),
        error: (error: unknown) =>
          this.toast.error(resolveErrorMessage(error, 'No fue posible actualizar la incidencia.')),
      });
  }

  private describeChange(title: string, { status, priority }: IssueChangeRequest['changes']): string {
    if (status) {
      return `"${title}" ahora está ${STATUS_META[status].label.toLowerCase()}.`;
    }
    if (priority) {
      return `"${title}" ahora tiene prioridad ${PRIORITY_META[priority].label.toLowerCase()}.`;
    }
    return 'Incidencia actualizada.';
  }
}
