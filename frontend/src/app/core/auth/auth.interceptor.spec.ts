import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  const auth = { loginUrl: '/api/auth/login', accessToken: vi.fn<() => string | null>(), logout: vi.fn() };
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    auth.accessToken.mockReset().mockReturnValue('jwt-token');
    auth.logout.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not touch requests outside the API', () => {
    client.get('/assets/logo.svg').subscribe();

    const request = http.expectOne('/assets/logo.svg');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush('');
  });

  it('does not touch the login request', () => {
    client.post('/api/auth/login', {}).subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('adds the bearer token to API requests', () => {
    client.get('/api/issues').subscribe();

    const request = http.expectOne('/api/issues');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('sends API requests without a token when there is no session', () => {
    auth.accessToken.mockReturnValue(null);
    client.get('/api/issues').subscribe();

    const request = http.expectOne('/api/issues');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('logs out with the expired reason on a 401 response and rethrows', () => {
    const error = vi.fn();
    client.get('/api/issues').subscribe({ error });

    http.expectOne('/api/issues').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalledWith('expired');
    expect(error).toHaveBeenCalled();
  });

  it('keeps the session on other errors', () => {
    const error = vi.fn();
    client.get('/api/issues').subscribe({ error });

    http.expectOne('/api/issues').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('keeps the session on network errors', () => {
    const error = vi.fn();
    client.get('/api/issues').subscribe({ error });

    http.expectOne('/api/issues').error(new ProgressEvent('error'));

    expect(auth.logout).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
