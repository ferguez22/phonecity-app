import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LineaService, LineaFiltros } from '../../core/services/linea.service';
import { Linea } from '../../core/models/linea.model';
import { getColor, getEtiqueta } from './color.util';

interface Boton {
  label: string;
  filtros: LineaFiltros;
}

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly lineas$ = inject(LineaService);
  private readonly router = inject(Router);

  readonly lineas     = signal<Linea[]>([]);
  readonly cargando   = signal(false);
  readonly error      = signal<string | null>(null);
  readonly busqueda   = signal('');
  readonly orderDir   = signal<'asc' | 'desc'>('desc');
  readonly orderBy    = signal<'fecha_entrada' | 'dias_reparacion'>('fecha_entrada');
  readonly botonActivo = signal<string>('Todo');

  // Filtros actuales (se actualizan al pulsar un boton)
  private filtrosActivos: LineaFiltros = {};

  readonly botones: Boton[] = [
    { label: 'Todo',                    filtros: {} },
    { label: '📱 En tienda ahora',      filtros: { movil_en_tienda: true } },
    { label: 'Reparando',               filtros: { flujo: 'reparacion', fase: 'por_reparar' } },
    { label: 'Reparado - Avisado',      filtros: { flujo: 'reparacion', fase: 'reparado', avisado: true } },
    { label: 'Enviar a taller',         filtros: { fase: 'por_enviar_taller' } },
    { label: 'Enviado a taller',        filtros: { fase: 'en_taller' } },
    { label: 'Pedir pieza',             filtros: { flujo: 'pieza', fase: 'por_pedir' } },
    { label: 'Pieza pedida',            filtros: { flujo: 'pieza', fase: 'pedido' } },
    { label: 'Pieza en tienda',         filtros: { flujo: 'pieza', fase: 'en_tienda', avisado: true } },
    { label: 'Pedir accesorio',         filtros: { flujo: 'accesorio', fase: 'por_pedir' } },
    { label: 'Accesorio pedido',        filtros: { flujo: 'accesorio', fase: 'pedido' } },
    { label: 'Accesorio en tienda',     filtros: { flujo: 'accesorio', fase: 'en_tienda', avisado: true } },
    { label: 'No reparable (en tienda)',filtros: { fase: 'no_reparable', movil_en_tienda: true } },
    { label: 'No reparable (recogido)', filtros: { fase: 'no_reparable', movil_en_tienda: false } },
    { label: 'Cancelado',               filtros: { fase: 'cancelado' } },
    { label: 'Finalizado',              filtros: { fase: 'entregado' } },
  ];

  // Filtro de busqueda rapida (L-id, modelo, cliente, telefono)
  readonly lineasFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.lineas();
    return this.lineas().filter(
      (l) =>
        String(l.id).includes(q) ||
        (l.modelo?.toLowerCase().includes(q)) ||
        (l.cliente_nombre?.toLowerCase().includes(q)) ||
        (l.cliente_telefono?.includes(q)) ||
        (l.problema_o_pieza?.toLowerCase().includes(q)),
    );
  });

  readonly total = computed(() => this.lineasFiltradas().length);

  ngOnInit(): void {
    this.cargar();
  }

  seleccionarBoton(boton: Boton): void {
    this.filtrosActivos = boton.filtros;
    this.botonActivo.set(boton.label);
    this.busqueda.set('');
    this.cargar();
  }

  toggleOrder(): void {
    this.orderDir.update((d) => (d === 'desc' ? 'asc' : 'desc'));
    this.cargar();
  }

  toggleOrderBy(): void {
    this.orderBy.update((o) =>
      o === 'fecha_entrada' ? 'dias_reparacion' : 'fecha_entrada',
    );
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const filtros: LineaFiltros = {
      ...this.filtrosActivos,
      orderBy: this.orderBy(),
      order: this.orderDir(),
    };
    this.lineas$.list(filtros).subscribe({
      next: (data) => {
        this.lineas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error al cargar las líneas');
        this.cargando.set(false);
      },
    });
  }

  getColor  = getColor;
  getEtiqueta = getEtiqueta;

  verDetalle(id: number): void {
    this.router.navigate(['/linea', id]);
  }

  diasDesde(fecha: string): number {
    const ms = Date.now() - new Date(fecha).getTime();
    return Math.floor(ms / 86_400_000);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
