import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { IconoComponent } from '../icono/icono.component';
import { ENLACES } from '../navegacion';
import { SelectorDivisorComponent } from '../selector-divisor/selector-divisor.component';

@Component({
  selector: 'app-pestanas',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent, SelectorDivisorComponent],
  templateUrl: './pestanas.component.html',
  styleUrl: './pestanas.component.scss',
})
export class PestanasComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pestanas = ENLACES.filter((e) => e.movil === 'pestana');
  readonly enMas = computed(() => ENLACES.filter((e) => e.movil === 'mas' && (!e.admin || this.auth.esAdmin())));

  readonly masAbierto = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly masActiva = computed(() => this.enMas().some((e) => this.url().startsWith(e.ruta)));
  readonly enAlta = computed(() => this.url().startsWith('/linea/nueva'));

  abrirMas(): void {
    this.masAbierto.set(true);
  }

  @HostListener('document:keydown.escape')
  cerrarMas(): void {
    this.masAbierto.set(false);
  }

  cerrarSesion(): void {
    this.cerrarMas();
    this.router.navigate(['/login']).then((ok) => {
      if (ok) this.auth.logout();
    });
  }
}
