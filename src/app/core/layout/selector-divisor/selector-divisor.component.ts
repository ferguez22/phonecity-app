import { Component, inject } from '@angular/core';

import { DivisorModo, PreferenciasService } from '../../preferencias/preferencias.service';

@Component({
  selector: 'app-selector-divisor',
  standalone: true,
  template: `
    <div class="segmentado" role="radiogroup" aria-label="Divisor de fecha">
      @for (o of opciones; track o.valor) {
        <button
          type="button"
          role="radio"
          class="opcion"
          [class.activa]="prefs.divisorModo() === o.valor"
          [attr.aria-checked]="prefs.divisorModo() === o.valor"
          (click)="prefs.setDivisorModo(o.valor)"
        >
          {{ o.texto }}
        </button>
      }
    </div>
  `,
  styles: `
    @use 'breakpoints' as *;

    :host {
      display: block;
    }

    .segmentado {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      padding: 2px;
      border-radius: var(--radio-s);
      background: rgba(0, 0, 0, 0.05);
    }

    .opcion {
      min-height: 32px;
      padding: 0 var(--esp-2);
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--color-texto);
      font: inherit;
      font-size: 13px;
      white-space: nowrap;
      cursor: pointer;
      transition: background-color 150ms, transform 150ms;

      &:active {
        transform: scale(0.97);
      }

      &:focus-visible {
        outline: 3px solid var(--color-acento);
        outline-offset: -1px;
      }

      &.activa {
        background: var(--color-superficie);
        box-shadow: var(--sombra-1);
        font-weight: 600;
      }

      @include movil {
        min-height: 40px;
        font-size: 14px;
      }
    }
  `,
})
export class SelectorDivisorComponent {
  readonly prefs = inject(PreferenciasService);

  readonly opciones: { valor: DivisorModo; texto: string }[] = [
    { valor: 'todos', texto: 'Siempre' },
    { valor: 'solo_todo', texto: 'Solo en Todo' },
    { valor: 'off', texto: 'Nunca' },
  ];
}
