import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { STATUS_META, Tone } from '@features/issues/data/issue.labels';
import { ISSUE_STATUSES, IssueStatus, IssueSummary } from '@features/issues/data/issue.models';

interface SummaryCard {
  readonly status: IssueStatus | null;
  readonly label: string;
  readonly tone: Tone;
  readonly count: number;
  readonly share: number;
}

@Component({
  selector: 'app-summary-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
})
export class SummaryCards {
  readonly summary = input.required<IssueSummary>();
  readonly activeStatus = input<IssueStatus | null>(null);
  readonly loading = input(false);
  readonly statusSelected = output<IssueStatus | null>();

  protected readonly cards = computed<readonly SummaryCard[]>(() => {
    const { total, byStatus } = this.summary();
    const share = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));
    return [
      { status: null, label: 'Total de incidencias', tone: 'brand', count: total, share: total === 0 ? 0 : 100 },
      ...ISSUE_STATUSES.map((status) => ({
        status,
        label: STATUS_META[status].label,
        tone: STATUS_META[status].tone,
        count: byStatus[status],
        share: share(byStatus[status]),
      })),
    ];
  });
}
