import { Component, DestroyRef, inject, input, output, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { HojaComponent } from '../hoja/hoja.component';
import { IconoComponent } from '../icono/icono.component';
import { PantallaService } from '../pantalla.service';

@Component({
  selector: 'app-ventana',
  standalone: true,
  imports: [HojaComponent, IconoComponent, NgTemplateOutlet],
  templateUrl: './ventana.component.html',
  styleUrl: './ventana.component.scss',
})
export class VentanaComponent {
  readonly titulo = input.required<string>();
  readonly ancho = input('620px');
  readonly ajustada = input(false);
  readonly conPie = input(false);
  readonly cerrar = output<void>();

  readonly pantalla = inject(PantallaService);
  private readonly hoja = viewChild(HojaComponent);

  constructor() {
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      this.solicitarCierre();
    };
    window.addEventListener('keydown', alPulsarTecla, true);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('keydown', alPulsarTecla, true));
  }

  solicitarCierre(): void {
    const hoja = this.hoja();
    if (hoja) hoja.solicitarCierre();
    else this.cerrar.emit();
  }
}
