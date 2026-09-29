import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY_FILTERS, IssueFilters } from '@features/issues/data/issue.models';
import { IssueToolbar } from './issue-toolbar';

describe('IssueToolbar', () => {
  let fixture: ComponentFixture<IssueToolbar>;
  let element: HTMLElement;

  async function render(filters: IssueFilters = EMPTY_FILTERS, hasActiveFilters = false): Promise<void> {
    fixture.componentRef.setInput('filters', filters);
    fixture.componentRef.setInput('hasActiveFilters', hasActiveFilters);
    await fixture.whenStable();
  }

  function tabs(): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  }

  function prioritySelect(): HTMLSelectElement {
    return element.querySelector<HTMLSelectElement>('.priority__select')!;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(IssueToolbar);
    element = fixture.nativeElement as HTMLElement;
  });

  it('marks the "all" tab as active without a status filter', async () => {
    await render();

    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(prioritySelect().value).toBe('');
    expect(element.querySelector('.clear')).toBeNull();
  });

  it('reflects the active filters', async () => {
    await render({ status: 'in_progress', priority: 'low' }, true);

    expect(tabs().map((tab) => tab.classList.contains('is-active'))).toEqual([false, false, true, false]);
    expect(prioritySelect().value).toBe('low');
  });

  it('emits the selected status tab', async () => {
    await render();
    const statusChange = vi.fn();
    fixture.componentInstance.statusChange.subscribe(statusChange);

    tabs()[1]!.click();
    tabs()[0]!.click();

    expect(statusChange.mock.calls).toEqual([['open'], [null]]);
  });

  it('emits the selected priority and null for the empty option', async () => {
    await render();
    const priorityChange = vi.fn();
    fixture.componentInstance.priorityChange.subscribe(priorityChange);

    const select = prioritySelect();
    select.value = 'high';
    select.dispatchEvent(new Event('change'));
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(priorityChange.mock.calls).toEqual([['high'], [null]]);
  });

  it('updates the search term from the input', async () => {
    await render();
    const input = element.querySelector<HTMLInputElement>('.search__input')!;

    input.value = 'login';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.searchTerm()).toBe('login');
  });

  it('shows the search term provided by the parent', async () => {
    fixture.componentRef.setInput('searchTerm', 'crash');
    await render();

    expect(element.querySelector<HTMLInputElement>('.search__input')!.value).toBe('crash');
  });

  it('emits clear from the clear button', async () => {
    await render(EMPTY_FILTERS, true);
    const clear = vi.fn();
    fixture.componentInstance.clear.subscribe(clear);

    element.querySelector<HTMLButtonElement>('.clear')!.click();

    expect(clear).toHaveBeenCalledTimes(1);
  });
});
