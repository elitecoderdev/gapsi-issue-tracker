import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { buildIssue, buildIssueDto, buildSummaryDto } from '../../../testing/issue-factory';
import { IssueDto } from './issue.models';
import { IssuesStore } from './issues.store';

const FIRST = buildIssueDto({ id: 'first', title: 'Error al guardar', description: 'Pedido', created_by: 'maria' });
const SECOND = buildIssueDto({ id: 'second', title: 'Pantalla lenta', description: 'Reportes', created_by: 'JUAN' });

describe('IssuesStore', () => {
  let store: IssuesStore;
  let http: HttpTestingController;

  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function expectList(): TestRequest {
    TestBed.tick();
    return http.expectOne((request) => request.method === 'GET' && request.url === '/api/issues');
  }

  function expectSummary(): TestRequest {
    TestBed.tick();
    return http.expectOne('/api/issues/summary');
  }

  async function load(issues: IssueDto[] = [FIRST, SECOND]): Promise<void> {
    expectList().flush(issues);
    expectSummary().flush(buildSummaryDto(2, 0, 0));
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), IssuesStore] });
    store = TestBed.inject(IssuesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the issues and the summary', async () => {
    TestBed.tick();
    expect(store.isLoading()).toBe(true);
    expect(store.isSummaryLoading()).toBe(true);
    expect(store.issues()).toEqual([]);

    await load();

    expect(store.isLoading()).toBe(false);
    expect(store.isSummaryLoading()).toBe(false);
    expect(store.issues().map((issue) => issue.id)).toEqual(['first', 'second']);
    expect(store.summary()).toEqual({ total: 2, byStatus: { open: 2, in_progress: 0, done: 0 } });
    expect(store.loadError()).toBeNull();
  });

  it('requests the issues again with the selected filters', async () => {
    await load();

    store.setStatusFilter('open');
    const byStatus = expectList();
    expect(byStatus.request.params.get('status')).toBe('open');
    expect(byStatus.request.params.has('priority')).toBe(false);
    byStatus.flush([FIRST]);
    await settle();

    store.setPriorityFilter('high');
    const byBoth = expectList();
    expect(byBoth.request.params.get('status')).toBe('open');
    expect(byBoth.request.params.get('priority')).toBe('high');
    byBoth.flush([FIRST]);
    await settle();

    expect(store.filters()).toEqual({ status: 'open', priority: 'high' });
    expect(store.issues().map((issue) => issue.id)).toEqual(['first']);
  });

  it('tracks whether any filter is active and clears them', async () => {
    await load();
    expect(store.hasActiveFilters()).toBe(false);

    store.searchTerm.set('   ');
    expect(store.hasActiveFilters()).toBe(false);

    store.searchTerm.set('login');
    expect(store.hasActiveFilters()).toBe(true);

    store.searchTerm.set('');
    store.setPriorityFilter('low');
    expect(store.hasActiveFilters()).toBe(true);
    expectList().flush([]);
    await settle();

    store.setPriorityFilter(null);
    store.setStatusFilter('done');
    expect(store.hasActiveFilters()).toBe(true);
    expectList().flush([]);
    await settle();

    store.searchTerm.set('x');
    store.clearFilters();
    expect(store.filters()).toEqual({ status: null, priority: null });
    expect(store.searchTerm()).toBe('');
    expect(store.hasActiveFilters()).toBe(false);
    expectList().flush([FIRST, SECOND]);
    await settle();
  });

  it('filters the loaded issues by title, description or author ignoring case', async () => {
    await load();

    store.searchTerm.set('  GUARDAR ');
    expect(store.issues().map((issue) => issue.id)).toEqual(['first']);

    store.searchTerm.set('reportes');
    expect(store.issues().map((issue) => issue.id)).toEqual(['second']);

    store.searchTerm.set('juan');
    expect(store.issues().map((issue) => issue.id)).toEqual(['second']);

    store.searchTerm.set('inexistente');
    expect(store.issues()).toEqual([]);
  });

  it('exposes a readable error when the issues cannot be loaded', async () => {
    expectList().flush({ error: { code: 'boom', message: 'Servicio caído' } }, { status: 500, statusText: 'Error' });
    expectSummary().flush(buildSummaryDto());
    await settle();

    expect(store.loadError()).toBe('Servicio caído');
    expect(store.issues()).toEqual([]);
  });

  it('uses a default message for unexpected load errors', async () => {
    expectList().flush('oops', { status: 500, statusText: 'Error' });
    expectSummary().flush(buildSummaryDto());
    await settle();

    expect(store.loadError()).toBe('No fue posible cargar las incidencias.');
  });

  it('reloads issues and summary on refresh', async () => {
    await load();

    store.refresh();

    await load([FIRST]);
    expect(store.issues().map((issue) => issue.id)).toEqual(['first']);
  });

  it('creates an issue and refreshes the data', async () => {
    await load();
    const created = vi.fn();

    store.create({ title: 'Nueva', description: 'Detalle', priority: 'low' }).subscribe(created);
    const request = http.expectOne((req) => req.method === 'POST' && req.url === '/api/issues');
    expect(request.request.body).toEqual({ title: 'Nueva', description: 'Detalle', priority: 'low' });
    request.flush(buildIssueDto({ id: 'third', title: 'Nueva' }));

    expect(created).toHaveBeenCalledWith(buildIssue({ id: 'third', title: 'Nueva' }));
    await load([FIRST, SECOND]);
  });

  it('applies updates optimistically and refreshes on success', async () => {
    await load();
    const updated = vi.fn();

    store.update('first', { status: 'done' }).subscribe(updated);

    expect(store.issues().find((issue) => issue.id === 'first')?.status).toBe('done');
    expect(store.pendingIds().has('first')).toBe(true);

    const request = http.expectOne('/api/issues/first');
    expect(request.request.body).toEqual({ status: 'done' });
    request.flush({ ...FIRST, status: 'done' });

    expect(updated).toHaveBeenCalled();
    expect(store.pendingIds().size).toBe(0);
    await load([{ ...FIRST, status: 'done' }, SECOND]);
  });

  it('rolls back the optimistic update when the request fails', async () => {
    await load();
    const failed = vi.fn();

    store.update('second', { priority: 'low' }).subscribe({ error: failed });
    expect(store.issues().find((issue) => issue.id === 'second')?.priority).toBe('low');

    http.expectOne('/api/issues/second').flush(null, { status: 500, statusText: 'Error' });

    expect(failed).toHaveBeenCalled();
    expect(store.issues().find((issue) => issue.id === 'second')?.priority).toBe('high');
    expect(store.pendingIds().has('second')).toBe(false);
  });
});
