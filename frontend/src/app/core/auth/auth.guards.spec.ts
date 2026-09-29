import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Route, Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: authenticated } }],
    });
  });

  function run(guard: CanMatchFn): ReturnType<CanMatchFn> {
    return TestBed.runInInjectionContext(() => guard({} as Route, [], {} as Parameters<CanMatchFn>[2]));
  }

  function serialize(result: ReturnType<CanMatchFn>): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('lets authenticated users through the auth guard', () => {
    authenticated.set(true);
    expect(run(authGuard)).toBe(true);
  });

  it('redirects anonymous users to the login page', () => {
    authenticated.set(false);
    expect(serialize(run(authGuard))).toBe('/login');
  });

  it('lets anonymous users through the guest guard', () => {
    authenticated.set(false);
    expect(run(guestGuard)).toBe(true);
  });

  it('redirects authenticated users away from guest pages', () => {
    authenticated.set(true);
    expect(serialize(run(guestGuard))).toBe('/issues');
  });
});
