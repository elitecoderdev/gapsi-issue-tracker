import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoginResponseDto, Session } from './auth.models';
import { AuthService } from './auth.service';
import { SessionStorage } from './session-storage';

const LOGIN_RESPONSE: LoginResponseDto = {
  access_token: 'jwt-token',
  token_type: 'bearer',
  expires_in: 60,
  user: { username: 'admin', full_name: 'Ada Lovelace' },
};

describe('AuthService', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(storedSession: Session | null = null): AuthService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionStorage, useValue: { read: () => storedSession, write: vi.fn(), clear: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const service = TestBed.inject(AuthService);
    TestBed.tick();
    return service;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('starts unauthenticated when no session is stored', () => {
    const auth = setup();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(auth.accessToken()).toBeNull();
    expect(auth.loginUrl).toBe('/api/auth/login');
  });

  it('logs in, persists the session and exposes the user', async () => {
    const auth = setup();
    const storage = TestBed.inject(SessionStorage);

    const result = firstValueFrom(auth.login({ username: 'admin', password: 'secret123' }));
    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'admin', password: 'secret123' });
    request.flush(LOGIN_RESPONSE);

    const expected: Session = {
      accessToken: 'jwt-token',
      expiresAt: Date.now() + 60_000,
      user: { username: 'admin', fullName: 'Ada Lovelace' },
    };
    expect(await result).toEqual(expected.user);
    expect(storage.write).toHaveBeenCalledWith(expected);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()).toEqual(expected.user);
    expect(auth.accessToken()).toBe('jwt-token');
  });

  it('restores a stored session and returns no token once it has expired', () => {
    const auth = setup({
      accessToken: 'stored-token',
      expiresAt: Date.now() + 1000,
      user: { username: 'admin', fullName: 'Ada Lovelace' },
    });

    expect(auth.accessToken()).toBe('stored-token');
    vi.setSystemTime(Date.now() + 1000);
    expect(auth.accessToken()).toBeNull();
  });

  it('logs out manually and navigates to the login page', () => {
    const auth = setup({
      accessToken: 'stored-token',
      expiresAt: Date.now() + 60_000,
      user: { username: 'admin', fullName: 'Ada Lovelace' },
    });

    auth.logout();

    expect(TestBed.inject(SessionStorage).clear).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: {} });
  });

  it('logs out automatically with the expired reason when the session expires', () => {
    const auth = setup({
      accessToken: 'stored-token',
      expiresAt: Date.now() + 5000,
      user: { username: 'admin', fullName: 'Ada Lovelace' },
    });

    vi.advanceTimersByTime(4999);
    expect(auth.isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { session: 'expired' } });
  });

  it('cancels the expiry timer after a manual logout', () => {
    const auth = setup({
      accessToken: 'stored-token',
      expiresAt: Date.now() + 5000,
      user: { username: 'admin', fullName: 'Ada Lovelace' },
    });

    auth.logout();
    TestBed.tick();
    vi.advanceTimersByTime(10_000);

    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
