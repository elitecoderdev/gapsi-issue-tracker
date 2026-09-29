import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buildIssue } from '../../../../testing/issue-factory';
import { IssueTable } from './issue-table';

describe('IssueTable', () => {
  const first = buildIssue({ id: 'first-issue-id', title: 'Primera', status: 'open', priority: 'high' });
  const second = buildIssue({ id: 'second-issue-id', title: 'Segunda', status: 'done', priority: 'low' });
  let fixture: ComponentFixture<IssueTable>;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(IssueTable);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('issues', [first, second]);
    await fixture.whenStable();
  });

  function rows(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>('.table__row'));
  }

  function selects(row: HTMLElement): HTMLSelectElement[] {
    return Array.from(row.querySelectorAll<HTMLSelectElement>('select'));
  }

  it('renders one row per issue with its current values', () => {
    const [firstRow] = rows();

    expect(rows()).toHaveLength(2);
    expect(firstRow!.querySelector('.issue__title')!.textContent).toBe('Primera');
    expect(firstRow!.querySelector('.issue__id')!.textContent).toBe('#first-is');
    expect(selects(firstRow!).map((select) => select.value)).toEqual(['high', 'open']);
    expect(selects(rows()[1]!).map((select) => select.value)).toEqual(['low', 'done']);
    expect(firstRow!.querySelector('app-badge')!.textContent).toBe('admin');
  });

  it('disables the controls of pending issues', async () => {
    fixture.componentRef.setInput('pendingIds', new Set([second.id]));
    await fixture.whenStable();

    expect(rows().map((row) => row.classList.contains('is-pending'))).toEqual([false, true]);
    expect(selects(rows()[1]!).every((select) => select.disabled)).toBe(true);
    expect(selects(rows()[0]!).some((select) => select.disabled)).toBe(false);
  });

  it('emits priority and status change requests', () => {
    const changeRequested = vi.fn();
    fixture.componentInstance.changeRequested.subscribe(changeRequested);
    const [prioritySelect, statusSelect] = selects(rows()[0]!);

    prioritySelect!.value = 'medium';
    prioritySelect!.dispatchEvent(new Event('change'));
    statusSelect!.value = 'in_progress';
    statusSelect!.dispatchEvent(new Event('change'));

    expect(changeRequested.mock.calls).toEqual([
      [{ issue: first, changes: { priority: 'medium' } }],
      [{ issue: first, changes: { status: 'in_progress' } }],
    ]);
  });
});
