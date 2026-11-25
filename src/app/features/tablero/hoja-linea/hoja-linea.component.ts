import { Component, OnChanges, SimpleChanges, computed, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { HojaComponent } from '../../../core/layout/hoja/hoja.component';
import { IconoComponent } from '../../../core/layout/icono/icono.component';
import { Linea, Pieza } from '../../../core/models/linea.model';
import { EstadoDef, esEstadoActual, getColor, getEtiqueta } from '../../../core/estados/estados';
import { diasDesde } from '../../../core/utils/fecha.util';

@Component({
  selector: 'app-hoja-linea',
  standalone: true,
  imports: [HojaComponent, IconoComponent, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './hoja-linea.component.html',
  styleUrl: './hoja-linea.component.scss',
})
export class HojaLineaComponent implements OnChanges {
  readonly linea = input.required<Linea>();
  readonly piezas = input<Pieza[]>([]);
  readonly total = input<number | null>(null);
  readonly cargandoPiezas = input(false);
  readonly etiquetaPiezas = input('Piezas');
  readonly chips = input<EstadoDef[]>([]);
  readonly verTodos = input(false);
  readonly guardando = input(false);

  readonly cerrar = output<void>();
  readonly cambiarEstado = output<EstadoDef>();
  readonly toggleVerTodos = output<void>();
  readonly avisar = output<void>();
  readonly ticket = output<void>();
  readonly ticketSimple = output<void>();
  readonly etiqueta = output<void>();
  readonly etiquetaEnvio = output<void>();
  readonly guardarNotas = output<string>();

  readonly textoNotas = signal('');
  readonly notasCambiadas = computed(() => this.textoNotas() !== (this.linea().notas ?? ''));

  esEstadoActual = esEstadoActual;
  getColor = getColor;
  getEtiqueta = getEtiqueta;
  diasDesde = diasDesde;

  ngOnChanges(cambios: SimpleChanges): void {
    const c = cambios['linea'];
    if (c && c.previousValue?.id !== c.currentValue?.id) {
      this.textoNotas.set(this.linea().notas ?? '');
    }
  }
}
