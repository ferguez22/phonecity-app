import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LineaService, LineaFiltros } from '../../core/services/linea.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { Linea } from '../../core/models/linea.model';
import {ESTADO_OPTIONS, EstadoDef, esEstadoActual, getColor, getEtiqueta, etiquetaHistorialFase} from '../../core/estados/estados';
import { ProveedorService, Proveedor } from '../../core/services/proveedor.service';

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
  private readonly histSvc = inject(HistorialService);
  private readonly router = inject(Router);
  private readonly proveedorSvc = inject(ProveedorService);

  readonly lineas       = signal<Linea[]>([]);
  readonly cargando     = signal(false);
  readonly error        = signal<string | null>(null);
  readonly busqueda     = signal('');
  readonly orderDir     = signal<'asc' | 'desc'>('asc');
  readonly orderBy      = signal<'fecha_entrada' | 'dias_reparacion' | 'id'>('id');
  readonly botonActivo = signal('Todo');
  readonly proveedores = signal<Proveedor[]>([]);


  private filtrosActivos: LineaFiltros = {};

  readonly editingId       = signal<number | null>(null);
  readonly guardandoInline = signal(false);
  readonly estadoOptions   = ESTADO_OPTIONS;
  readonly menuStyle       = signal<{ top: string; left: string; maxHeight: string }>({ top: '0', left: '0', maxHeight: '520px' });
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;

  readonly lineaModal        = signal<Linea | null>(null);
  readonly modalHistorial    = signal<EntradaHistorial[]>([]);
  readonly modalCargando     = signal(false);
  readonly modalEditField    = signal<string | null>(null);
  readonly modalEditValue    = signal<string>('');

  readonly botones: Boton[] = [
    { label: 'Todo',                            filtros: {} },
    { label: 'Móviles en Tienda',               filtros: { vista: 'moviles_en_tienda' } },
    { label: 'Reparar',                         filtros: { flujo: 'reparacion', fase: 'por_reparar' } },
    { label: 'Reparado - Avisado',              filtros: { flujo: 'reparacion', fase: 'reparado', avisado: true } },
    { label: 'Enviar a Taller',                 filtros: { fase: 'por_enviar_taller' } },
    { label: 'Enviado a Taller',                filtros: { fase: 'en_taller' } },
    { label: 'No se Puede Reparar - Avisado',   filtros: { fase: 'no_reparable', avisado: true, movil_en_tienda: true } },
    { label: 'No se Puede Reparar - Entregado', filtros: { fase: 'no_reparable', avisado: true, movil_en_tienda: false } },
    { label: 'Accesorios',                      filtros: { flujo: 'accesorio' } },
    { label: 'Venta de Dispositivo',            filtros: { flujo: 'venta', subtipo: 'venta' } },
    { label: 'Compra de Dispositivo',           filtros: { flujo: 'venta', subtipo: 'compra' } },
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

  ngOnInit(): void {
    this.cargar();
    this.proveedorSvc.list().subscribe({ next: (p) => this.proveedores.set(p), error: () => {} });
  }
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

  esOpcionActual(opt: EstadoDef, linea: Linea): boolean {
    return esEstadoActual(opt, linea);
  }

  seleccionarEstado(event: Event, opt: EstadoDef, linea: Linea): void {
    event.stopPropagation();
    this.editingId.set(null);
    if (this.esOpcionActual(opt, linea)) return;

    const payload: any = {
      fase: opt.fase,
      avisado: opt.avisado ? 1 : 0,
      movil_en_tienda: opt.movil_en_tienda ? 1 : 0,
    };
    if (!opt.preservaFlujo) {
      payload.flujo = opt.flujo;
      payload.subtipo = opt.subtipo ?? null;
      payload.taller = opt.taller ?? null;
      payload.proveedor_id = opt.flujo === 'accesorio' ? this.proveedorIdPorNombre(opt.proveedor) : null;
    }

    this.guardandoInline.set(true);
    this.lineas$.update(linea.id, payload).subscribe({
      next: (updated) => {
        const merge = (l: Linea) => l.id === linea.id ? { ...l, ...updated } : l;
        this.lineas.update(c => c.map(merge));
        if (this.lineaModal()?.id === linea.id) this.lineaModal.update(l => l ? { ...l, ...updated } : null);
        this.guardandoInline.set(false);
      },
      error: (err) => { this.guardandoInline.set(false); this.error.set(err?.error?.error?.message ?? 'Error'); },
    });
  }

  private proveedorIdPorNombre(nombre?: string | null): number | null {
    if (!nombre) return null;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const p = this.proveedores().find(x => norm(x.nombre) === norm(nombre));
    return p ? p.id : null;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  abrirModal(linea: Linea): void {
    this.lineaModal.set(linea);
    this.modalHistorial.set([]);
    this.modalCargando.set(true);
    this.modalEditField.set(null);
    this.histSvc.get(linea.id).subscribe({
      next: h => { this.modalHistorial.set(h); this.modalCargando.set(false); },
      error: () => this.modalCargando.set(false),
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
    return etiquetaHistorialFase(h.fase, h.avisado, h.movil_en_tienda);
  }

  getColor    = getColor;
  getEtiqueta = getEtiqueta;

  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}