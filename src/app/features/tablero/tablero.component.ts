import {
  Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LineaService, LineaFiltros, LineaPayload } from '../../core/services/linea.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ProveedorService, Proveedor } from '../../core/services/proveedor.service';
import { Linea, TipoCobro } from '../../core/models/linea.model';
import { Cliente } from '../../core/models/cliente.model';
import {
  ESTADO_OPTIONS, EstadoDef, esEstadoActual,
  getColor, getEtiqueta, etiquetaHistorialFase,
} from '../../core/estados/estados';

interface Boton { label: string; filtros: LineaFiltros; }

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: '0', opacity: 0 }),
        animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('160ms ease', style({ height: '0', opacity: 0 })),
      ]),
    ]),
  ],
})
export class TableroComponent implements OnInit, AfterViewInit {
  @ViewChild('controlsRef') controlsRef!: ElementRef<HTMLElement>;

  private readonly auth = inject(AuthService);
  private readonly lineas$ = inject(LineaService);
  private readonly histSvc = inject(HistorialService);
  private readonly clienteSvc = inject(ClienteService);
  private readonly proveedorSvc = inject(ProveedorService);
  private readonly router = inject(Router);

  readonly lineas = signal<Linea[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly orderDir = signal<'asc' | 'desc'>('asc');
  readonly orderBy = signal<'fecha_entrada' | 'dias_reparacion' | 'id'>('id');
  readonly botonActivo = signal('Todo');
  private filtrosActivos: LineaFiltros = {};

  readonly proveedores = signal<Proveedor[]>([]);
  readonly estadoOptions = ESTADO_OPTIONS;
  readonly guardando = signal(false);

  readonly expandedId = signal<number | null>(null);
  readonly panelHistorial = signal<EntradaHistorial[]>([]);
  readonly panelCargando = signal(false);

  edModelo = '';
  edProblema = '';
  edImporte: number | null = null;
  edTipoCobro: TipoCobro = 'normal';
  edFechaEntrada = '';
  edRecogida = '';
  edTelAlt = '';
  edCodigo = '';
  edNotas = '';

  readonly busqCliente = signal('');
  readonly resultClientes = signal<Cliente[]>([]);
  readonly clienteSelec = signal<Cliente | null>(null);
  readonly mostrarNuevoCliente = signal(false);
  readonly nuevoNombre = signal('');
  readonly nuevoTel = signal('');
  private readonly busq$ = new Subject<string>();

  readonly botones: Boton[] = [
    { label: 'Todo', filtros: {} },
    { label: 'Móviles en tienda', filtros: { vista: 'moviles_en_tienda' } },
    { label: 'Reparar', filtros: { flujo: 'reparacion', fase: 'por_reparar' } },
    { label: 'Reparado - Avisado', filtros: { flujo: 'reparacion', fase: 'reparado', avisado: true } },
    { label: 'Enviar a taller', filtros: { fase: 'por_enviar_taller' } },
    { label: 'Enviado a taller', filtros: { fase: 'en_taller' } },
    { label: 'No se puede reparar - Avisado', filtros: { fase: 'no_reparable', avisado: true, movil_en_tienda: true } },
    { label: 'No se puede reparar - Entregado', filtros: { fase: 'no_reparable', avisado: true, movil_en_tienda: false } },
    { label: 'Accesorios', filtros: { flujo: 'accesorio' } },
    { label: 'Venta de Dispositivo', filtros: { flujo: 'venta', subtipo: 'venta' } },
    { label: 'Compra de Dispositivo', filtros: { flujo: 'venta', subtipo: 'compra' } },
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

  readonly total = computed(() => this.lineasFiltradas().length);

  getColor = getColor;
  getEtiqueta = getEtiqueta;

  ngOnInit(): void {
    this.cargar();
    this.proveedorSvc.list().subscribe({ next: (p) => this.proveedores.set(p), error: () => {} });
    this.busq$
      .pipe(debounceTime(300), distinctUntilChanged(), switchMap((q) => this.clienteSvc.buscar(q)))
      .subscribe((res) => this.resultClientes.set(res));
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
    this.expandedId.set(null);
    this.cargar();
  }

  toggleOrder(): void { this.orderDir.update((d) => d === 'desc' ? 'asc' : 'desc'); this.cargar(); }

  toggleOrderBy(): void {
    this.orderBy.update((o) => o === 'id' ? 'fecha_entrada' : o === 'fecha_entrada' ? 'dias_reparacion' : 'id');
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.expandedId.set(null);
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

  toggleExpand(linea: Linea): void {
    if (this.expandedId() === linea.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(linea.id);

    this.edModelo = linea.modelo ?? '';
    this.edProblema = linea.problema_o_pieza ?? '';
    this.edImporte = linea.importe;
    this.edTipoCobro = linea.tipo_cobro;
    this.edFechaEntrada = linea.fecha_entrada ?? '';
    this.edRecogida = linea.fecha_recogida_prevista ?? '';
    this.edTelAlt = linea.telefono_alternativo ?? '';
    this.edCodigo = linea.codigo_dispositivo ?? '';
    this.edNotas = linea.notas ?? '';

    if (linea.cliente_nombre) {
      this.clienteSelec.set({ id: linea.cliente_id!, nombre: linea.cliente_nombre, telefono: linea.cliente_telefono });
      this.busqCliente.set(linea.cliente_nombre);
    } else {
      this.clienteSelec.set(null);
      this.busqCliente.set('');
    }
    this.resultClientes.set([]);
    this.mostrarNuevoCliente.set(false);
    this.nuevoNombre.set('');
    this.nuevoTel.set('');

    this.panelHistorial.set([]);
    this.panelCargando.set(true);
    this.histSvc.get(linea.id).subscribe({
      next: (h) => { this.panelHistorial.set(h); this.panelCargando.set(false); },
      error: () => this.panelCargando.set(false),
    });
  }

  cambiarEstado(opt: EstadoDef, linea: Linea): void {
    if (this.esEstadoActual(opt, linea)) return;

    const payload: LineaPayload = {
      fase: opt.fase,
      avisado: (opt.avisado ? 1 : 0) as unknown as number,
      movil_en_tienda: (opt.movil_en_tienda ? 1 : 0) as unknown as number,
    };
    if (!opt.preservaFlujo) {
      payload.flujo = opt.flujo;
      payload.subtipo = opt.subtipo ?? null;
      payload.taller = opt.taller ?? null;
      payload.proveedor_id = opt.flujo === 'accesorio' ? this.proveedorIdPorNombre(opt.proveedor) : null;
    }

    this.guardando.set(true);
    this.lineas$.update(linea.id, payload).subscribe({
      next: (updated) => {
        this.lineas.update((c) => c.map((x) => x.id === linea.id ? { ...x, ...updated } : x));
        this.guardando.set(false);
      },
      error: (err) => { this.guardando.set(false); this.error.set(err?.error?.error?.message ?? 'Error'); },
    });
  }

  guardarDatos(linea: Linea): void {
    const payload: LineaPayload = {
      modelo: this.edModelo || null,
      problema_o_pieza: this.edProblema || null,
      importe: this.edImporte,
      tipo_cobro: this.edTipoCobro,
      fecha_entrada: this.edFechaEntrada || null,
      fecha_recogida_prevista: this.edRecogida || null,
      telefono_alternativo: this.edTelAlt || null,
      codigo_dispositivo: this.edCodigo || null,
      notas: this.edNotas || null,
      cliente_id: this.clienteSelec()?.id ?? null,
    };
    this.guardando.set(true);
    this.lineas$.update(linea.id, payload).subscribe({
      next: (updated) => {
        this.lineas.update((c) => c.map((x) => x.id === linea.id ? { ...x, ...updated } : x));
        this.guardando.set(false);
      },
      error: (err) => { this.guardando.set(false); this.error.set(err?.error?.error?.message ?? 'Error'); },
    });
  }

  onBuscarCliente(q: string): void {
    this.busqCliente.set(q);
    this.clienteSelec.set(null);
    if (q.trim().length >= 2) this.busq$.next(q.trim());
    else this.resultClientes.set([]);
  }

  seleccionarCliente(c: Cliente): void {
    this.clienteSelec.set(c);
    this.busqCliente.set(c.nombre);
    this.resultClientes.set([]);
  }

  toggleNuevoCliente(): void { this.mostrarNuevoCliente.update((v) => !v); }

  crearCliente(): void {
    const nombre = this.nuevoNombre().trim();
    const tel = this.nuevoTel().trim();
    if (!nombre) return;
    this.clienteSvc.crear(nombre, tel).subscribe({
      next: (c) => {
        this.seleccionarCliente(c);
        this.mostrarNuevoCliente.set(false);
        this.nuevoNombre.set('');
        this.nuevoTel.set('');
      },
      error: (err) => this.error.set(err?.error?.error?.message ?? 'Error al crear cliente'),
    });
  }

  esEstadoActual(opt: EstadoDef, linea: Linea): boolean {
    return esEstadoActual(opt, linea);
  }

  etiquetaHistorial(h: EntradaHistorial): string {
    return etiquetaHistorialFase(h.fase, h.avisado, h.movil_en_tienda);
  }

  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

  private proveedorIdPorNombre(nombre?: string | null): number | null {
    if (!nombre) return null;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const p = this.proveedores().find((x) => norm(x.nombre) === norm(nombre));
    return p ? p.id : null;
  }
}
