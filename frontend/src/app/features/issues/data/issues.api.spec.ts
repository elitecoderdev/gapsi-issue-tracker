import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { IssueDto } from './issue.models';
import { IssuesApi } from './issues.api';

const ISSUE_DTO: IssueDto = {
  id: 'abc123',
  title: 'Falla en login',
  description: 'No permite ingresar',
  status: 'open',
  priority: 'high',
  created_by: 'admin',
  created_at: '2026-09-29T10:00:00Z',
  updated_at: '2026-09-29T11:00:00Z',
};

describe('IssuesApi', () => {
  let api: IssuesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(IssuesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the active filters and maps the response to the domain model', async () => {
    const result = firstValueFrom(api.list({ status: 'open', priority: null }));

    const request = http.expectOne((req) => req.url === '/api/issues');
    expect(request.request.params.get('status')).toBe('open');
    expect(request.request.params.has('priority')).toBe(false);
    request.flush([ISSUE_DTO]);

    const [issue] = await result;
    expect(issue?.createdBy).toBe('admin');
    expect(issue?.updatedAt).toBe('2026-09-29T11:00:00Z');
  });

  it('maps the summary counters', async () => {
    const result = firstValueFrom(api.summary());

    http.expectOne('/api/issues/summary').flush({ total: 3, by_status: { open: 1, in_progress: 1, done: 1 } });

    expect(await result).toEqual({ total: 3, byStatus: { open: 1, in_progress: 1, done: 1 } });
  });

  it('patches only the provided changes', () => {
    api.update('abc123', { status: 'done' }).subscribe();

    const request = http.expectOne('/api/issues/abc123');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'done' });
    request.flush({ ...ISSUE_DTO, status: 'done' });
  });
});
