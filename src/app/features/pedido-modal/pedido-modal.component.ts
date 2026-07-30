import { Component, EventEmitter, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService, GrupoPedido } from '../../core/services/pedidos.service';

const GRUPOS: GrupoPedido[] = ['wephone', 'apokin', 'piezas'];

@Component({
  selector: 'app-pedido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-modal.component.html',
  styleUrl: './pedido-modal.component.scss',
})
export class PedidoModalComponent implements OnInit {
  @Output() cerrado = new EventEmitter<boolean>();

  private readonly pedidosSvc = inject(PedidosService);

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

  txtWephone = '';
  txtApokin = '';
  txtPiezas = '';

  ngOnInit(): void {
    this.pedidosSvc.pendientes().subscribe({
      next: (d) => {
        this.txtWephone = d.bloques.wephone;
        this.txtApokin = d.bloques.apokin;
        this.txtPiezas = d.bloques.piezas;
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
      this.error.set('No se pudo copiar (permite el portapapeles)');
    }
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