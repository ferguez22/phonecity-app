import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ConexionService } from './core/services/conexion.service';
import { BarraSuperiorComponent } from './core/layout/barra-superior/barra-superior.component';
import { PestanasComponent } from './core/layout/pestanas/pestanas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BarraSuperiorComponent, PestanasComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly conexion = inject(ConexionService);
  private readonly router = inject(Router);

  readonly esLogin = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/login')),
    ),
    { initialValue: true },
  );
}
