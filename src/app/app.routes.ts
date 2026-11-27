import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { sinCambiosGuard } from './core/guards/sin-cambios.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tablero' },
  
  {path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)},
  {path: 'tablero', canActivate: [authGuard], loadComponent: () => import('./features/tablero/tablero.component').then((m) => m.TableroComponent)},
  {path: 'reparaciones', canActivate: [authGuard], loadComponent: () => import('./features/reparaciones/reparaciones.component').then((m) => m.ReparacionesComponent) },
  { path: 'notas', loadComponent: () => import('./features/notas/notas.component').then((m) => m.NotasComponent), canActivate: [authGuard] },
  {path: 'clientes', loadComponent: () => import('./features/clientes/clientes.component').then((m) => m.ClientesComponent), canActivate: [authGuard]},
  {path: 'linea/nueva', canActivate: [authGuard], canDeactivate: [sinCambiosGuard], loadComponent: () => import('./features/linea-form/linea-form.component').then((m) => m.LineaFormComponent)},
  {path: 'linea/:id/editar', canActivate: [authGuard], loadComponent: () => import('./features/linea-form/linea-form.component').then((m) => m.LineaFormComponent)},
  {path: 'etiquetas', loadComponent: () => import('./features/etiquetas/etiquetas.component').then((m) => m.EtiquetasComponent), canActivate: [authGuard]},
  {path: 'importar', loadComponent: () => import('./features/import/import.component').then((m) => m.ImportComponent), canActivate: [authGuard]},  
  {path: 'modelos/limpiar', canActivate: [authGuard, adminGuard], loadComponent: () => import('./features/limpiar-modelos/limpiar-modelos.component').then((m) => m.LimpiarModelosComponent)},
  {path: 'linea/:id', canActivate: [authGuard], loadComponent: () => import('./features/linea-detalle/linea-detalle.component').then((m) => m.LineaDetalleComponent)},
  
  { path: '**', redirectTo: 'tablero' },
];
