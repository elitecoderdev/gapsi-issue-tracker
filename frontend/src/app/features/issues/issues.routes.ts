import { Routes } from '@angular/router';

export const ISSUES_ROUTES: Routes = [
  {
    path: '',
    title: 'Incidencias',
    loadComponent: () => import('./pages/issues-page/issues-page').then((m) => m.IssuesPage),
  },
];
