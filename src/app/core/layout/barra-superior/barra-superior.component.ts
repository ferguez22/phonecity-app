import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { IconoComponent } from '../icono/icono.component';
import { ENLACES } from '../navegacion';

@Component({
  selector: 'app-barra-superior',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent],
  templateUrl: './barra-superior.component.html',
  styleUrl: './barra-superior.component.scss',
})
export class BarraSuperiorComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly izquierda = ENLACES.filter((e) => e.barra === 'izquierda');
  readonly derecha = ENLACES.filter((e) => e.barra === 'derecha');

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
