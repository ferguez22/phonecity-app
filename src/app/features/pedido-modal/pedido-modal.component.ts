import { Component, EventEmitter, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PedidosService, GrupoPedido, HistorialDia, HistorialDetalle, FilaHistorial } from '../../core/services/pedidos.service';
import { colorEstado } from '../../core/estados/estados';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { PantallaService } from '../../core/layout/pantalla.service';
import { VentanaComponent } from '../../core/layout/ventana/ventana.component';

const GRUPOS: GrupoPedido[] = ['wephone', 'apokin', 'piezas'];

@Component({
  selector: 'app-pedido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconoComponent, VentanaComponent],
  templateUrl: './pedido-modal.component.html',
  styleUrl: './pedido-modal.component.scss',
})
export class PedidoModalComponent implements OnInit {
  @Output() cerrado = new EventEmitter<boolean>();
  @Output() fallo = new EventEmitter<string>();

  private readonly pedidosSvc = inject(PedidosService);
  readonly pantalla = inject(PantallaService);

  readonly grupos: { id: GrupoPedido; nombre: string; corto: string; filas: number; color: string }[] = [
    { id: 'wephone', nombre: 'Wephone Infotec', corto: 'Wephone', filas: 5, color: colorEstado('acc_pedido_wephone') ?? '' },
    { id: 'apokin', nombre: 'Apokin', corto: 'Apokin', filas: 5, color: colorEstado('acc_pedido_apokin') ?? '' },
    { id: 'piezas', nombre: 'Piezas', corto: 'Piezas', filas: 6, color: colorEstado('pieza_pedida') ?? '' },
  ];

  readonly vista = signal<'pendientes' | 'historial'>('pendientes');
  readonly hoy = fechaLocal(new Date());
  readonly dias = signal<HistorialDia[] | null>(null);
  readonly cargandoDias = signal(false);
  readonly falloDias = signal(false);
  readonly fechaAbierta = signal<string | null>(null);
  readonly detalle = signal<HistorialDetalle | null>(null);
  readonly cargandoDetalle = signal(false);
  readonly falloDetalle = signal(false);
  readonly abiertas = signal<Set<string>>(new Set());
  private subDetalle: Subscription | null = null;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal<GrupoPedido | 'todos' | null>(null);
  readonly copiado = signal<string | null>(null);

  readonly conteos = signal<Record<GrupoPedido, number>>({ wephone: 0, apokin: 0, piezas: 0 });
  readonly marcados = signal<Record<GrupoPedido, number | null>>({ wephone: null, apokin: null, piezas: null });

  readonly algoMarcado = computed(() => GRUPOS.some((g) => this.marcados()[g] !== null));
  readonly nadaQueMarcar = computed(() =>
    GRUPOS.every((g) => this.marcados()[g] !== null || this.conteos()[g] === 0)
  );

  textos: Record<GrupoPedido, string> = { wephone: '', apokin: '', piezas: '' };

  ngOnInit(): void {
    this.pedidosSvc.pendientes().subscribe({
      next: (d) => {
        this.textos = { ...d.bloques };
        this.conteos.set(d.conteos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error al cargar pendientes');
        this.cargando.set(false);
      },
    });
  }

  async copiar(texto: string, cual: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.copiado.set(cual);
      setTimeout(() => this.copiado.set(null), 1500);
    } catch {
      const msg = 'No se pudo copiar (permite el portapapeles)';
      if (this.vista() === 'historial') this.fallo.emit(msg);
      else this.error.set(msg);
    }
  }

  cambiarVista(v: 'pendientes' | 'historial'): void {
    this.vista.set(v);
    if (v === 'historial' && this.dias() === null && !this.cargandoDias()) this.cargarDias();
  }

  cargarDias(): void {
    this.cargandoDias.set(true);
    this.falloDias.set(false);
    this.pedidosSvc.historialDias().subscribe({
      next: (d) => {
        this.dias.set(d);
        this.cargandoDias.set(false);
      },
      error: () => {
        this.falloDias.set(true);
        this.cargandoDias.set(false);
        this.fallo.emit('Error al cargar el historial de pedidos');
      },
    });
  }

  abrirDia(fecha: string): void {
    if (!fecha) return;
    this.subDetalle?.unsubscribe();
    this.fechaAbierta.set(fecha);
    this.detalle.set(null);
    this.abiertas.set(new Set());
    this.falloDetalle.set(false);
    this.cargandoDetalle.set(true);
    this.subDetalle = this.pedidosSvc.historialDia(fecha).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.falloDetalle.set(true);
        this.cargandoDetalle.set(false);
        this.fallo.emit('Error al cargar los pedidos del día');
      },
    });
  }

  volverDias(): void {
    this.subDetalle?.unsubscribe();
    this.subDetalle = null;
    this.fechaAbierta.set(null);
    this.detalle.set(null);
    this.cargandoDetalle.set(false);
    this.falloDetalle.set(false);
  }

  alternarFila(clave: string): void {
    this.abiertas.update((s) => {
      const out = new Set(s);
      if (out.has(clave)) out.delete(clave);
      else out.add(clave);
      return out;
    });
  }

  unidades(filas: FilaHistorial[]): number {
    return filas.reduce((n, f) => n + f.cantidad, 0);
  }

  marcar(grupo: GrupoPedido): void {
    if (this.guardando() !== null) return;
    this.error.set(null);
    this.guardando.set(grupo);
    this.pedidosSvc.marcarPedido(grupo).subscribe({
      next: (res) => {
        this.marcados.update((m) => ({ ...m, [grupo]: res.actualizadas }));
        this.guardando.set(null);
      },
      error: () => {
        this.error.set(`Error al marcar ${grupo}`);
        this.guardando.set(null);
      },
    });
  }

  marcarTodo(): void {
    if (this.guardando() !== null) return;
    this.error.set(null);
    this.guardando.set('todos');
    this.pedidosSvc.marcarPedido('todos').subscribe({
      next: (res) => {
        const detalle = res.detalle ?? {};
        this.marcados.update((m) => {
          const out = { ...m };
          for (const g of GRUPOS) {
            if (out[g] === null && this.conteos()[g] > 0) out[g] = detalle[g] ?? 0;
          }
          return out;
        });
        this.guardando.set(null);
      },
      error: () => {
        this.error.set('Error al marcar todo');
        this.guardando.set(null);
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit(this.algoMarcado());
  }
}

function fechaLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}