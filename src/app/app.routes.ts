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
  {
    path: 'linea/nueva',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/linea-form/linea-form.component').then((m) => m.LineaFormComponent),
  },
  {
    path: 'linea/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/linea-form/linea-form.component').then((m) => m.LineaFormComponent),
  },
  {
    path: 'linea/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/linea-detalle/linea-detalle.component').then(
        (m) => m.LineaDetalleComponent,
      ),
  },
  { path: '**', redirectTo: 'tablero' },
];
