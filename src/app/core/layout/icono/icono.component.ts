import { Component, computed, input } from '@angular/core';

import { ICONOS, NombreIcono } from './iconos';

@Component({
  selector: 'app-icono',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      @for (d of trazos(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
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
  readonly trazos = computed(() => ICONOS[this.nombre()]);
}
