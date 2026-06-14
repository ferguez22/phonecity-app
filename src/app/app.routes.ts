import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tablero' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'tablero',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tablero/tablero.component').then((m) => m.TableroComponent),
  },
  { path: '**', redirectTo: 'tablero' },
];
