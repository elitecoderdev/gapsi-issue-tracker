import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ToastService } from '@core/notifications/toast.service';
import { IssueTable } from '@features/issues/components/issue-table/issue-table';
import { IssueDto } from '@features/issues/data/issue.models';
import { buildIssue, buildIssueDto, buildSummaryDto } from '../../../../testing/issue-factory';
import { IssuesPage } from './issues-page';

const FIRST = buildIssueDto({ id: 'first', title: 'Primera' });
const SECOND = buildIssueDto({ id: 'second', title: 'Segunda' });

describe('IssuesPage', () => {
  let fixture: ComponentFixture<IssuesPage>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
    fixture = TestBed.createComponent(IssuesPage);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function flushList(issues: IssueDto[]): void {
    fixture.detectChanges();
    http.expectOne((request) => request.method === 'GET' && request.url === '/api/issues').flush(issues);
  }

  function flushSummary(): void {
    fixture.detectChanges();
    http.expectOne('/api/issues/summary').flush(buildSummaryDto(2, 0, 0));
  }

  async function load(issues: IssueDto[] = [FIRST, SECOND]): Promise<void> {
    flushList(issues);
    flushSummary();
    await fixture.whenStable();
  }

  function button(label: string): HTMLButtonElement {
    const match = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
    );
    if (!match) {
      throw new Error(`Button "${label}" not found`);
    }
    return match;
  }

  function issueTable(): IssueTable {
    return fixture.debugElement.query(By.directive(IssueTable)).componentInstance as IssueTable;
  }

  it('shows a skeleton while the first page is loading', async () => {
    expect(element.querySelector('.skeleton')).not.toBeNull();

    await load();

    expect(element.querySelector('.skeleton')).toBeNull();
  });

  it('renders the issues with a plural footer', async () => {
    await load();

    expect(element.querySelectorAll('.table__row')).toHaveLength(2);
    expect(element.querySelector('.panel__footer')!.textContent?.trim()).toBe('Mostrando 2 incidencias');
  });

  it('uses a singular footer for a single issue', async () => {
    await load([FIRST]);

    expect(element.querySelector('.panel__footer')!.textContent?.trim()).toBe('Mostrando 1 incidencia');
  });

  it('invites to create the first issue when there are none', async () => {
    await load([]);

    button('Crear la primera').click();
    await fixture.whenStable();

    expect(element.querySelector('app-issue-create-drawer')).not.toBeNull();
  });

  it('offers to clear the filters when they hide every issue', async () => {
    await load();
    const search = element.querySelector<HTMLInputElement>('.search__input')!;
    search.value = 'nada coincide';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(element.querySelector('.state strong')!.textContent).toBe('No hay incidencias con estos filtros');

    button('Limpiar filtros').click();
    await fixture.whenStable();

    expect(element.querySelectorAll('.table__row')).toHaveLength(2);
  });

  it('filters by the status selected in the summary cards and the toolbar', async () => {
    await load();

    element.querySelectorAll<HTMLButtonElement>('.summary-card')[1]!.click();
    fixture.detectChanges();
    const byStatus = http.expectOne((request) => request.url === '/api/issues');
    expect(byStatus.request.params.get('status')).toBe('open');
    byStatus.flush([FIRST]);
    await fixture.whenStable();

    const prioritySelect = element.querySelector<HTMLSelectElement>('.priority__select')!;
    prioritySelect.value = 'low';
    prioritySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const byPriority = http.expectOne((request) => request.url === '/api/issues');
    expect(byPriority.request.params.get('priority')).toBe('low');
    byPriority.flush([]);
    await fixture.whenStable();

    element.querySelector<HTMLButtonElement>('[role="tab"]')!.click();
    fixture.detectChanges();
    http.expectOne((request) => request.url === '/api/issues').flush([]);
    await fixture.whenStable();

    button('Limpiar filtros').click();
    flushList([FIRST, SECOND]);
    await fixture.whenStable();
    expect(element.querySelectorAll('.table__row')).toHaveLength(2);
  });

  it('shows the load error and retries', async () => {
    fixture.detectChanges();
    http
      .expectOne((request) => request.url === '/api/issues')
      .flush({ error: { code: 'down', message: 'Servicio no disponible' } }, { status: 503, statusText: 'Error' });
    flushSummary();
    await fixture.whenStable();

    expect(element.querySelector('.state--error strong')!.textContent).toBe('Servicio no disponible');

    button('Reintentar').click();
    await load();

    expect(element.querySelector('.state--error')).toBeNull();
  });

  it('refreshes the data from the header button', async () => {
    await load();

    button('Actualizar').click();
    await load([FIRST]);

    expect(element.querySelectorAll('.table__row')).toHaveLength(1);
  });

  it('opens and closes the create drawer', async () => {
    await load();

    button('Nueva incidencia').click();
    await fixture.whenStable();
    expect(element.querySelector('app-issue-create-drawer')).not.toBeNull();

    button('Cancelar').click();
    await fixture.whenStable();
    expect(element.querySelector('app-issue-create-drawer')).toBeNull();
  });

  it('closes the drawer after an issue is created', async () => {
    await load();
    button('Nueva incidencia').click();
    await fixture.whenStable();

    const title = element.querySelector<HTMLInputElement>('app-issue-create-drawer input.input')!;
    title.value = 'Nueva falla';
    title.dispatchEvent(new Event('input'));
    const description = element.querySelector<HTMLTextAreaElement>('app-issue-create-drawer textarea')!;
    description.value = 'Detalle';
    description.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('app-issue-create-drawer form')!.dispatchEvent(new Event('submit'));

    http.expectOne((request) => request.method === 'POST').flush(buildIssueDto({ id: 'third' }));
    await load([FIRST, SECOND, buildIssueDto({ id: 'third' })]);

    expect(element.querySelector('app-issue-create-drawer')).toBeNull();
    expect(element.querySelectorAll('.table__row')).toHaveLength(3);
  });

  it.each([
    [{ status: 'done' as const }, '"Primera" ahora está completada.'],
    [{ priority: 'low' as const }, '"Primera" ahora tiene prioridad baja.'],
    [{}, 'Incidencia actualizada.'],
  ])('confirms the change %o with a toast', async (changes, message) => {
    await load();

    issueTable().changeRequested.emit({ issue: buildIssue({ id: 'first', title: 'Primera' }), changes });
    http.expectOne('/api/issues/first').flush({ ...FIRST, ...changes });

    expect(toast.success).toHaveBeenCalledWith(message);
    await load();
  });

  it('shows an error toast when a change fails', async () => {
    await load();

    issueTable().changeRequested.emit({ issue: buildIssue({ id: 'first' }), changes: { status: 'done' } });
    http.expectOne('/api/issues/first').flush(null, { status: 500, statusText: 'Error' });

    expect(toast.error).toHaveBeenCalledWith('No fue posible actualizar la incidencia.');
  });
});
