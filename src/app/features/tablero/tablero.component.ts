import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h4 mb-0">Tablero PhoneCity</h1>
        <button class="btn btn-outline-secondary btn-sm" (click)="logout()">Salir</button>
      </div>
      <p class="text-muted">Tablero de lineas — se construye en la Fase 1.5.</p>
    </div>
  `,
})
export class TableroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
