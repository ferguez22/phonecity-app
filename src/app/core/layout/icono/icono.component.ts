import { Component, computed, input } from '@angular/core';

import { ICONOS, IMAGENES, NombreIcono } from './iconos';

@Component({
  selector: 'app-icono',
  standalone: true,
  template: `
    @if (imagen(); as src) {
      <img [src]="src" alt="" />
    } @else {
      <svg viewBox="0 0 24 24" aria-hidden="true">
        @for (d of trazos(); track $index) {
          <path [attr.d]="d" />
        }
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly imagen = computed(() => {
    const n = this.nombre();
    return n in IMAGENES ? IMAGENES[n as keyof typeof IMAGENES] : null;
  });
  readonly trazos = computed(() => {
    const n = this.nombre();
    return n in ICONOS ? ICONOS[n as keyof typeof ICONOS] : [];
  });
}
