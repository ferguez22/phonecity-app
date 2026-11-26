import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { IconoComponent } from '../icono/icono.component';
import { ENLACES } from '../navegacion';
import { SelectorDivisorComponent } from '../selector-divisor/selector-divisor.component';

@Component({
  selector: 'app-barra-superior',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconoComponent, SelectorDivisorComponent],
  templateUrl: './barra-superior.component.html',
  styleUrl: './barra-superior.component.scss',
})
export class BarraSuperiorComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly enlaces = ENLACES.filter((e) => e.barra);
  readonly menuAbierto = signal(false);

  constructor() {
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.menuAbierto()) return;
      e.stopPropagation();
      this.cerrarMenu();
    };
    const alPulsarFuera = (e: PointerEvent) => {
      if (this.menuAbierto() && !this.host.nativeElement.querySelector('.ajustes')?.contains(e.target as Node)) {
        this.cerrarMenu();
      }
    };
    window.addEventListener('keydown', alPulsarTecla, true);
    document.addEventListener('pointerdown', alPulsarFuera, true);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('keydown', alPulsarTecla, true);
      document.removeEventListener('pointerdown', alPulsarFuera, true);
    });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.cerrarMenu());
  }

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
