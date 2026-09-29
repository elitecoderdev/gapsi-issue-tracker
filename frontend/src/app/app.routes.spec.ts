import { Route } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guards';
import { Shell } from '@core/layout/shell/shell';
import { LoginPage } from '@features/auth/login-page/login-page';
import { ISSUES_ROUTES } from '@features/issues/issues.routes';
import { routes } from './app.routes';

function findRoute(candidates: readonly Route[], path: string): Route {
  const route = candidates.find((candidate) => candidate.path === path);
  if (!route) {
    throw new Error(`Route "${path}" not found`);
  }
  return route;
}

describe('app routes', () => {
  it('lazy loads the login page behind the guest guard', async () => {
    const login = findRoute(routes, 'login');

    expect(login.canMatch).toEqual([guestGuard]);
    expect(await login.loadComponent?.()).toBe(LoginPage);
  });

  it('lazy loads the shell behind the auth guard', async () => {
    const shell = findRoute(routes, '');

    expect(shell.canMatch).toEqual([authGuard]);
    expect(await shell.loadComponent?.()).toBe(Shell);
  });

  it('lazy loads the issues feature routes inside the shell', async () => {
    const children = findRoute(routes, '').children ?? [];

    expect(await findRoute(children, 'issues').loadChildren?.()).toBe(ISSUES_ROUTES);
    expect(findRoute(children, '')).toEqual({ path: '', pathMatch: 'full', redirectTo: 'issues' });
  });

  it('redirects unknown urls to the issues page', () => {
    expect(findRoute(routes, '**').redirectTo).toBe('issues');
  });
});
