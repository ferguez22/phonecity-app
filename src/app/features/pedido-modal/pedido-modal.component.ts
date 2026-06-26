import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../core/services/pedidos.service';

@Component({
  selector: 'app-pedido-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-modal-component.html',
  styleUrl: './pedido-modal.component.scss',
})
export class PedidoModalComponent implements OnInit {
  @Output() cerrado = new EventEmitter<boolean>(); // true si marcó pedido (recargar tablero)

  private readonly pedidosSvc = inject(PedidosService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly marcado = signal(false);

  txtWephone = '';
  txtApokin = '';
  txtPiezas = '';
  private ids: number[] = [];

  copiado = signal<string | null>(null);

  ngOnInit(): void {
    this.pedidosSvc.pendientes().subscribe({
      next: (d) => {
        this.txtWephone = d.bloques.wephone;
        this.txtApokin = d.bloques.apokin;
        this.txtPiezas = d.bloques.piezas;
        this.ids = [...d.ids.wephone, ...d.ids.apokin, ...d.ids.piezas];
        this.cargando.set(false);
      },
      error: () => { this.error.set('Error al cargar pendientes'); this.cargando.set(false); },
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

  marcarPedido(): void {
    if (this.ids.length === 0) { this.cerrar(false); return; }
    this.guardando.set(true);
    this.pedidosSvc.marcarPedido(this.ids).subscribe({
      next: () => { this.guardando.set(false); this.marcado.set(true); this.cerrar(true); },
      error: () => { this.guardando.set(false); this.error.set('Error al marcar como pedido'); },
    });
  }

  cerrar(recargar: boolean): void {
    this.cerrado.emit(recargar);
  }
}