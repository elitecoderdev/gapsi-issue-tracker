import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY_SUMMARY, IssueSummary } from '@features/issues/data/issue.models';
import { SummaryCards } from './summary-cards';

describe('SummaryCards', () => {
  let fixture: ComponentFixture<SummaryCards>;

  async function render(summary: IssueSummary, activeStatus: string | null = null, loading = false): Promise<void> {
    fixture.componentRef.setInput('summary', summary);
    fixture.componentRef.setInput('activeStatus', activeStatus);
    fixture.componentRef.setInput('loading', loading);
    await fixture.whenStable();
  }

  function cards(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.summary-card'));
  }

  function describeCards(): string[] {
    return cards().map((card) =>
      [
        card.querySelector('.summary-card__label')!.textContent,
        card.querySelector('.summary-card__value')!.textContent,
        card.querySelector('.summary-card__meta .tabular')!.textContent,
      ].join('|'),
    );
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SummaryCards);
  });

  it('computes the share of every status', async () => {
    await render({ total: 3, byStatus: { open: 1, in_progress: 2, done: 0 } });

    expect(describeCards()).toEqual([
      'Total de incidencias|3|100%',
      'Abierta|1|33%',
      'En progreso|2|67%',
      'Completada|0|0%',
    ]);
  });

  it('shows zero shares when there are no issues', async () => {
    await render(EMPTY_SUMMARY);

    expect(describeCards()).toEqual([
      'Total de incidencias|0|0%',
      'Abierta|0|0%',
      'En progreso|0|0%',
      'Completada|0|0%',
    ]);
  });

  it('highlights the active status and the loading state', async () => {
    await render(EMPTY_SUMMARY, 'done', true);

    const active = cards().filter((card) => card.getAttribute('aria-pressed') === 'true');
    expect(active.map((card) => card.className)).toEqual(['summary-card card tone-green is-active']);
    expect(cards()[0]!.querySelector('.summary-card__value')!.classList).toContain('is-loading');
  });

  it('emits the selected status', async () => {
    await render(EMPTY_SUMMARY);
    const selected = vi.fn();
    fixture.componentInstance.statusSelected.subscribe(selected);

    cards()[2]!.click();
    cards()[0]!.click();

    expect(selected.mock.calls).toEqual([['in_progress'], [null]]);
  });
});
