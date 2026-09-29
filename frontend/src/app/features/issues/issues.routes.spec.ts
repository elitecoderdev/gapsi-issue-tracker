import { ISSUES_ROUTES } from './issues.routes';
import { IssuesPage } from './pages/issues-page/issues-page';

describe('ISSUES_ROUTES', () => {
  it('lazy loads the issues page with its title', async () => {
    const [route] = ISSUES_ROUTES;

    expect(route?.path).toBe('');
    expect(route?.title).toBe('Incidencias');
    expect(await route?.loadComponent?.()).toBe(IssuesPage);
  });
});
