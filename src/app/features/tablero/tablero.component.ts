import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LineaService, LineaFiltros } from '../../core/services/linea.service';
import { CredencialesService } from '../../core/services/credenciales.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { Linea, Flujo, Fase } from '../../core/models/linea.model';
import { Credenciales } from '../../core/models/credenciales.model';
import { getColor, getEtiqueta } from './color.util';

export interface EstadoOption {
  label: string;
  flujo: Flujo;
  fase: Fase;
  avisado: boolean;
  movil_en_tienda: boolean;
  subtipo?: 'venta' | 'compra' | null;
}

export const ESTADO_OPTIONS: EstadoOption[] = [
  // Pieza
  { label: 'Pedir Pieza - Móvil en tienda', flujo: 'pieza',      fase: 'por_pedir', avisado: false, movil_en_tienda: true  },
  { label: 'Pieza pedida - Móvil en tienda',flujo: 'pieza',      fase: 'pedido',    avisado: false, movil_en_tienda: true  },
  { label: 'Pedir pieza',                   flujo: 'pieza',      fase: 'por_pedir', avisado: false, movil_en_tienda: false },
  { label: 'Pieza pedida',                  flujo: 'pieza',      fase: 'pedido',    avisado: false, movil_en_tienda: false },
  { label: 'Pieza en tienda - Avisado',     flujo: 'pieza',      fase: 'en_tienda', avisado: true,  movil_en_tienda: false },
  // Accesorio
  { label: 'Pedir Accesorio',               flujo: 'accesorio',  fase: 'por_pedir', avisado: false, movil_en_tienda: false },
  { label: 'Accesorio Pedido',              flujo: 'accesorio',  fase: 'pedido',    avisado: false, movil_en_tienda: false },
  { label: 'Accesorio en tienda - Avisado', flujo: 'accesorio',  fase: 'en_tienda', avisado: true,  movil_en_tienda: false },
  // Reparación
  { label: 'Reparar',                       flujo: 'reparacion', fase: 'por_reparar',        avisado: false, movil_en_tienda: false },
  { label: 'Reparado - Avisado',            flujo: 'reparacion', fase: 'reparado',           avisado: true,  movil_en_tienda: false },
  { label: 'Enviar a taller',               flujo: 'reparacion', fase: 'por_enviar_taller',  avisado: false, movil_en_tienda: false },
  { label: 'Enviado a taller',              flujo: 'reparacion', fase: 'en_taller',          avisado: false, movil_en_tienda: false },
  { label: 'Cancelado', flujo: 'reparacion', fase: 'cancelado', avisado: false, movil_en_tienda: false },
  { label: 'No se puede reparar', flujo: 'reparacion', fase: 'no_reparable', avisado: false, movil_en_tienda: false },
  { label: 'No se puede reparar - Entregado', flujo: 'reparacion', fase: 'no_reparable', avisado: true, movil_en_tienda: false }, { label: 'Finalizado', flujo: 'reparacion', fase: 'entregado', avisado: false, movil_en_tienda: false },
  // Venta / Compra
  { label: 'Venta de Dispositivo',          flujo: 'venta',      fase: 'entregado',          avisado: false, movil_en_tienda: false, subtipo: 'venta'  },
  { label: 'Compra de Dispositivo',         flujo: 'venta',      fase: 'entregado',          avisado: false, movil_en_tienda: false, subtipo: 'compra' },
];

interface Boton { label: string; filtros: LineaFiltros; }

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
  
export class TableroComponent implements OnInit, AfterViewInit {
  @ViewChild('controlsRef') controlsRef!: ElementRef<HTMLElement>;

  private readonly auth    = inject(AuthService);
  private readonly lineas$ = inject(LineaService);
  private readonly credSvc = inject(CredencialesService);
  private readonly histSvc = inject(HistorialService);
  private readonly router  = inject(Router);

  readonly lineas       = signal<Linea[]>([]);
  readonly cargando     = signal(false);
  readonly error        = signal<string | null>(null);
  readonly busqueda     = signal('');
  readonly orderDir     = signal<'asc' | 'desc'>('asc');
  readonly orderBy      = signal<'fecha_entrada' | 'dias_reparacion' | 'id'>('id');
  readonly botonActivo  = signal('Todo');
  private filtrosActivos: LineaFiltros = {};

  readonly editingId       = signal<number | null>(null);
  readonly guardandoInline = signal(false);
  readonly estadoOptions   = ESTADO_OPTIONS;
  readonly menuStyle       = signal<{ top: string; left: string; maxHeight: string }>({ top: '0', left: '0', maxHeight: '520px' });
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;

  readonly lineaModal        = signal<Linea | null>(null);
  readonly modalHistorial    = signal<EntradaHistorial[]>([]);
  readonly modalCredenciales = signal<Credenciales | null>(null);
  readonly modalCargando     = signal(false);
  readonly modalEditField    = signal<string | null>(null);
  readonly modalEditValue    = signal<string>('');

  readonly botones: Boton[] = [
    { label: 'Todo',                      filtros: {} },
    { label: '📱 Móviles en tienda',      filtros: { vista: 'moviles_en_tienda' } },
    { label: 'Reparar',                   filtros: { flujo: 'reparacion', fase: 'por_reparar' } },
    { label: 'Reparado - Avisado',        filtros: { flujo: 'reparacion', fase: 'reparado', avisado: true } },
    { label: 'Enviar a taller',           filtros: { fase: 'por_enviar_taller' } },
    { label: 'Enviado a taller', filtros: { fase: 'en_taller' } },
    { label: 'No se puede reparar', filtros: { fase: 'no_reparable', avisado: false } },
    { label: 'No se puede reparar - Entregado', filtros: { fase: 'no_reparable', avisado: true } },
    { label: 'Venta de Dispositivo', filtros: { flujo: 'venta', subtipo: 'venta' } },
    { label: 'Compra de Dispositivo',     filtros: { flujo: 'venta', subtipo: 'compra' } },
  ];

  readonly lineasFiltradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.lineas();
    return this.lineas().filter((l) =>
      String(l.id).includes(q) ||
      l.modelo?.toLowerCase().includes(q) ||
      l.cliente_nombre?.toLowerCase().includes(q) ||
      l.cliente_telefono?.includes(q) ||
      l.problema_o_pieza?.toLowerCase().includes(q),
    );
  });

  readonly total       = computed(() => this.lineasFiltradas().length);
  
  readonly activeLinea = computed(() => {
    const id = this.editingId();
    return id !== null ? (this.lineas().find(l => l.id === id) ?? null) : null;
  });

  ngOnInit(): void { this.cargar(); }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const h = this.controlsRef?.nativeElement?.offsetHeight ?? 148;
      document.documentElement.style.setProperty('--controls-h', `${h}px`);
    }, 100);
  }

  seleccionarBoton(boton: Boton): void {
    this.filtrosActivos = boton.filtros;
    this.botonActivo.set(boton.label);
    this.busqueda.set('');
    this.cargar();
  }

  toggleOrder(): void { this.orderDir.update(d => d === 'desc' ? 'asc' : 'desc'); this.cargar(); }
  
  toggleOrderBy(): void {
    this.orderBy.update(o => o === 'id' ? 'fecha_entrada' : o === 'fecha_entrada' ? 'dias_reparacion' : 'id');
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.editingId.set(null);
    this.lineas$.list({ ...this.filtrosActivos, orderBy: this.orderBy(), order: this.orderDir() }).subscribe({
      next: (data) => {
        this.lineas.set(data);
        this.cargando.set(false);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }), 80);
        setTimeout(() => {
          const h = this.controlsRef?.nativeElement?.offsetHeight ?? 148;
          document.documentElement.style.setProperty('--controls-h', `${h}px`);
        }, 100);
      },
      error: () => { this.error.set('Error al cargar'); this.cargando.set(false); },
    });
  }

  // ── Hover estado ─────────────────────────────────────────────────────────

  onEstadoHover(event: MouseEvent, id: number): void {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    const badge = (event.currentTarget as HTMLElement).querySelector('.badge-estado') as HTMLElement;
    if (badge) {
      const rect  = badge.getBoundingClientRect();
      const maxH  = Math.max(150, window.innerHeight - rect.top - 12);
      this.menuStyle.set({ top: `${rect.top}px`, left: `${rect.right + 4}px`, maxHeight: `${maxH}px` });
    }
    this.editingId.set(id);
  }

  onEstadoLeave(): void {
    this.hoverTimer = setTimeout(() => this.editingId.set(null), 300);
  }

  onMenuHover(): void {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
  }

  esOpcionActual(opt: EstadoOption, linea: Linea): boolean {
    const subtipoMatch = opt.subtipo != null
      ? opt.subtipo === (linea as any).subtipo
      : true;
    return opt.flujo === linea.flujo && opt.fase === linea.fase &&
           opt.avisado === !!linea.avisado && opt.movil_en_tienda === !!linea.movil_en_tienda &&
           subtipoMatch;
  }

  seleccionarEstado(event: Event, opt: EstadoOption, linea: Linea): void {
    event.stopPropagation();
    this.editingId.set(null);
    if (this.esOpcionActual(opt, linea)) return;

    if (opt.fase === 'entregado' && linea.fase !== 'entregado') {
      if (!window.confirm('⚠️ Al marcar como Finalizado se eliminarán las credenciales (RGPD). ¿Continuar?')) return;
    }

    this.guardandoInline.set(true);
    this.lineas$.update(linea.id, {
      flujo: opt.flujo, fase: opt.fase,
      avisado: opt.avisado as any, movil_en_tienda: opt.movil_en_tienda as any,
      subtipo: opt.subtipo ?? null,
    }).subscribe({
      next: (updated) => {
        const merge = (l: Linea) => l.id === linea.id ? { ...l, ...updated } : l;
        this.lineas.update(c => c.map(merge));
        if (this.lineaModal()?.id === linea.id) this.lineaModal.update(l => l ? { ...l, ...updated } : null);
        this.guardandoInline.set(false);
      },
      error: (err) => { this.guardandoInline.set(false); this.error.set(err?.error?.error?.message ?? 'Error'); },
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  abrirModal(linea: Linea): void {
    this.lineaModal.set(linea);
    this.modalHistorial.set([]);
    this.modalCredenciales.set(null);
    this.modalCargando.set(true);
    this.modalEditField.set(null);
    this.histSvc.get(linea.id).subscribe({
      next: h => { this.modalHistorial.set(h); this.modalCargando.set(false); },
      error: () => this.modalCargando.set(false),
    });
    this.credSvc.get(linea.id).subscribe({
      next: c => this.modalCredenciales.set(c),
      error: () => this.modalCredenciales.set(null),
    });
  }

  cerrarModal(): void { this.lineaModal.set(null); this.modalEditField.set(null); }

  openModalEdit(field: string, value: any): void {
    this.modalEditField.set(field);
    this.modalEditValue.set(value != null ? String(value) : '');
    setTimeout(() => (document.querySelector('.edit-input') as HTMLInputElement)?.focus(), 0);
  }

  saveModalField(field: string, lineaId: number): void {
    if (this.modalEditField() !== field) return;
    const raw = this.modalEditValue().trim();
    const payload: Record<string, any> = {};
    if (field === 'importe') {
      payload['importe'] = raw ? parseFloat(raw.replace(',', '.')) : null;
    } else {
      payload[field] = raw || null;
    }
    this.modalEditField.set(null);
    this.lineas$.update(lineaId, payload).subscribe({
      next: (updated) => {
        this.lineaModal.update(l => l ? { ...l, ...updated } : null);
        this.lineas.update(c => c.map(l => l.id === lineaId ? { ...l, ...updated } : l));
      },
    });
  }

  cancelModalEdit(): void { this.modalEditField.set(null); }

  etiquetaHistorial(h: EntradaHistorial): string {
    const map: Record<string, string> = {
      por_pedir: 'Pedir', pedido: 'Pedido', en_tienda: 'En tienda',
      por_reparar: 'Reparando', por_enviar_taller: 'Enviar a taller',
      en_taller: 'En taller', reparado: 'Reparado - Avisado',
      entregado: 'Finalizado', cancelado: 'Cancelado', no_reparable: 'No se puede reparar',
    };
    let label = map[h.fase] ?? h.fase;
    if (h.avisado && h.fase === 'no_reparable') label = 'No se puede reparar - Entregado';
    if (h.movil_en_tienda) label += ' · 📱';
    return label;
  }

  getColor    = getColor;
  getEtiqueta = getEtiqueta;

  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}