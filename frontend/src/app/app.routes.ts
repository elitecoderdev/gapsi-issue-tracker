import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión',
    canMatch: [guestGuard],
    loadComponent: () => import('@features/auth/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('@core/layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'issues',
        loadChildren: () => import('@features/issues/issues.routes').then((m) => m.ISSUES_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'issues' },
    ],
  },
  { path: '**', redirectTo: 'issues' },
];
