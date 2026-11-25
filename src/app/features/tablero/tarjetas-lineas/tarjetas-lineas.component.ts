import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { Linea } from '../../../core/models/linea.model';
import { getColor, getEtiqueta } from '../../../core/estados/estados';
import { limpiarTelefono } from '../../../core/utils/telefono.util';
import { diasDesde } from '../../../core/utils/fecha.util';

export interface GrupoDia {
  clave: string;
  titulo: string | null;
  lineas: Linea[];
}

interface MenuTelefono {
  telefono: string;
  internacional: string | null;
  top: number;
  left: number;
}

@Component({
  selector: 'app-tarjetas-lineas',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './tarjetas-lineas.component.html',
  styleUrl: './tarjetas-lineas.component.scss',
})
export class TarjetasLineasComponent {
  readonly grupos = input.required<GrupoDia[]>();
  readonly abrir = output<Linea>();

  readonly menu = signal<MenuTelefono | null>(null);

  constructor() {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.menu()) return;
      e.stopPropagation();
      this.cerrarMenu();
    };
    window.addEventListener('keydown', alPulsar, true);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('keydown', alPulsar, true));
  }

  getColor = getColor;
  getEtiqueta = getEtiqueta;
  diasDesde = diasDesde;

  abrirMenuTelefono(ev: MouseEvent, telefono: string): void {
    ev.stopPropagation();
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const ancho = 180;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - ancho - 8);
    this.menu.set({ telefono, internacional: limpiarTelefono(telefono), top: r.bottom + 4, left });
  }

  cerrarMenu(): void {
    this.menu.set(null);
  }
}
