import { Component, Input, inject, signal, computed } from '@angular/core';
import { Subject, switchMap, catchError, of } from 'rxjs';

import { LineaService } from '../../core/services/linea.service';
import { Linea } from '../../core/models/linea.model';
import { esTerminal, getColor, getEtiqueta } from '../../core/estados/estados';

const RECIENTES = 8;

@Component({
  selector: 'app-cliente-resumen',
  standalone: true,
  templateUrl: './cliente-resumen.component.html',
  styleUrl: './cliente-resumen.component.scss',
})
export class ClienteResumenComponent {
  @Input({ required: true }) set clienteId(id: number) {
    this.cargando.set(true);
    this.error.set(false);
    this.expandido.set(false);
    this.id$.next(id);
  }

  private readonly lineaSvc = inject(LineaService);
  private readonly id$ = new Subject<number>();

  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly lineas = signal<Linea[]>([]);
  readonly expandido = signal(false);

  readonly ordenadas = computed(() =>
    [...this.lineas()].sort((a, b) => {
      const fa = a.fecha_entrada ?? '';
      const fb = b.fecha_entrada ?? '';
      if (fa !== fb) return fa < fb ? 1 : -1;
      return b.id - a.id;
    }),
  );
  readonly activas = computed(() => this.lineas().filter((l) => this.esActiva(l)));
  readonly enTienda = computed(() => this.activas().filter((l) => !!l.movil_en_tienda).length);
  private readonly plegadas = computed(() =>
    this.ordenadas().filter((l, i) => i < RECIENTES || this.esActiva(l)),
  );
  readonly ocultas = computed(() => this.ordenadas().length - this.plegadas().length);
  readonly filas = computed(() => (this.expandido() ? this.ordenadas() : this.plegadas()));

  alternar(): void {
    this.expandido.update((v) => !v);
  }

  constructor() {
    this.id$
      .pipe(
        switchMap((id) =>
          this.lineaSvc.list({ cliente_id: id, orderBy: 'id', order: 'desc' }).pipe(
            catchError(() => {
              this.error.set(true);
              return of([] as Linea[]);
            }),
          ),
        ),
      )
      .subscribe((data) => {
        this.lineas.set(data);
        this.cargando.set(false);
      });
  }

  esActiva(l: Linea): boolean {
    return !esTerminal(l);
  }

  etiqueta(l: Linea): string {
    return getEtiqueta(l);
  }

  color(l: Linea): string {
    return getColor(l);
  }

  detalle(l: Linea): string {
    return [l.modelo, l.problema_o_pieza].filter((v) => !!v).join(' · ') || '—';
  }

  fecha(valor: string | null): string {
    if (!valor) return '—';
    const [a, m, d] = valor.slice(0, 10).split('-');
    if (!a || !m || !d) return '—';
    return `${d}/${m}/${a.slice(2)}`;
  }
}
