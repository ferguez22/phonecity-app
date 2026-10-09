import {Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LineaService, LineaFiltros, LineaPayload } from '../../core/services/linea.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { ClienteSelectorComponent } from '../cliente-selector/cliente-selector.component';
import { ProveedorService, Proveedor } from '../../core/services/proveedor.service';
import { Linea, TipoCobro, Pieza } from '../../core/models/linea.model';
import { PedidoModalComponent } from '../pedido-modal/pedido-modal.component';
import { ConsultaTallerModalComponent } from '../consulta-taller-modal/consulta-taller-modal.component';
import { AvisarModalComponent } from '../avisar-modal/avisar-modal.component';
import { TicketService } from '../../core/tickets/ticket.service';
import { EtiquetaService } from '../../core/etiquetas/etiqueta.service';
import { Cliente } from '../../core/models/cliente.model';
import { normalizar, soloDigitos, terminosDe, casaTodos } from '../../core/utils/texto.util';
import { ESTADO_OPTIONS, EstadoDef, esEstadoActual, getColor, getEtiqueta, etiquetaHistorialCompleta, estadoActualDef, siguientesDe, mensajeWhatsapp, tieneMensajeEspecifico} from '../../core/estados/estados';

interface Boton { label: string; filtros: LineaFiltros; filtroClient?: (l: Linea) => boolean; aplicaHistorial?: boolean; fasesHistorial?: string[];}

type FilaTablero =
  | { tipo: 'divisor'; fecha: string; key: string }
  | { tipo: 'linea'; linea: Linea };

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PedidoModalComponent, ConsultaTallerModalComponent, AvisarModalComponent, ClienteSelectorComponent],
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
  
export class TableroComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('controlsRef') controlsRef!: ElementRef<HTMLElement>;
  @ViewChild('busquedaInput') busquedaInput!: ElementRef<HTMLInputElement>;
  
  edModelo = '';
  edPiezas: Pieza[] = [{ descripcion: '', importe: null }];
  edTipoCobro: TipoCobro = 'normal';
  edFechaEntrada = '';
  edRecogida = '';
  edTelAlt = '';
  edNotas = '';

  private readonly auth = inject(AuthService);
  private readonly lineas$ = inject(LineaService);
  private readonly histSvc = inject(HistorialService);
  private readonly proveedorSvc = inject(ProveedorService);
  private readonly router = inject(Router);
  private readonly ticketSvc = inject(TicketService);
  private readonly etiquetaSvc = inject(EtiquetaService);  private filtrosActivos: LineaFiltros = {};
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObs: ResizeObserver | null = null;
  private readonly busqueda$ = new Subject<string>();
  private readonly cacheIndice = new WeakMap<Linea, string>();
  private indiceDe(l: Linea): string {
    const cacheado = this.cacheIndice.get(l);
    if (cacheado !== undefined) return cacheado;
    const texto = normalizar([
      l.id,
      l.modelo,
      l.cliente_nombre,
      l.cliente_telefono,
      l.problema_o_pieza,
      l.notas,
      l.importe,
      getEtiqueta(l),
    ].filter((v) => v !== null && v !== undefined && v !== '').join(' '));
    const digitos = soloDigitos(`${l.id} ${l.cliente_telefono ?? ''} ${l.importe ?? ''}`);
    const completo = `${texto} ${digitos}`;
    this.cacheIndice.set(l, completo);
    return completo;
  }

  readonly lineas = signal<Linea[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly busquedaAplicada = signal('');
  readonly proveedores = signal<Proveedor[]>([]);
  readonly estadoOptions = ESTADO_OPTIONS;
  readonly guardando = signal(false);
  readonly expandedId = signal<number | null>(null);
  readonly verTodos = signal(false);
  readonly estadoActivo = signal<EstadoDef | null>(null);
  readonly filtrosExpandidos = signal(false); readonly ajustesAbierto = signal(false);
  readonly incluirHistorial = signal(false);
  readonly pedidoAbierto = signal(false);
  readonly tallerAbierto = signal(false);
  readonly avisarAbierto = signal(false);
  readonly filtrosAvisar = signal<LineaFiltros>({});
  readonly toastWa = signal<Linea | null>(null);
  readonly divisorModo = signal<'todos' | 'solo_todo' | 'off'>(this.leerDivisorModo());
  readonly panelHistorial = signal<EntradaHistorial[]>([]);
  readonly panelCargando = signal(false);
  readonly edPiezasCargando = signal(false);
  readonly filasVacias = [0, 1, 2, 3, 4];

  readonly clienteSelec = signal<Cliente | null>(null);
  readonly botonActivo = signal('Todo');

  readonly botones: Boton[] = [
    { label: 'Todo', filtros: {} },
    { label: 'Móviles en tienda', filtros: { vista: 'moviles_en_tienda' } },
    {
      label: 'Reparar + Avisado',
      filtros: { flujo: 'reparacion' },
      filtroClient: (l) => l.fase === 'por_reparar' || (l.fase === 'reparado' && !!l.avisado),
    },
    {
      label: 'Piezas',
      filtros: { flujo: 'pieza' },
      filtroClient: (l) => !!l.es_historico || (l.fase !== 'entregado' && l.fase !== 'cancelado'),
      aplicaHistorial: true,
    },
    {
      label: 'Accesorios',
      filtros: { flujo: 'accesorio' },
      filtroClient: (l) => !!l.es_historico || (l.fase !== 'entregado' && l.fase !== 'cancelado'),
      aplicaHistorial: true,
    },
    { label: 'No reparable', filtros: { flujo: 'reparacion', fase: 'no_reparable' }, aplicaHistorial: true, fasesHistorial: ['no_reparable'] },
    {
      label: 'Taller',
      filtros: { flujo: 'reparacion' },
      filtroClient: (l) => !!l.es_historico || l.fase === 'por_enviar_taller' || l.fase === 'en_taller',
      aplicaHistorial: true,
      fasesHistorial: ['por_enviar_taller', 'en_taller'],
    },
    { label: 'Venta/Compra', filtros: { flujo: 'venta' } },
  ];

  readonly mostrarToggleHistorial = computed(() => {
    const bt = this.botones.find((b) => b.label === this.botonActivo());
    return !!bt?.aplicaHistorial;
  });

  readonly mostrarBotonTaller = computed(() => {
    if (this.botonActivo() === 'Taller') return true;
    const est = this.estadoActivo();
    return est?.fase === 'por_enviar_taller' || est?.fase === 'en_taller';
  });
  
  readonly mostrarBotonAvisar = computed(() => {
    const est = this.estadoActivo();
    return est?.id === 'reparado_avisado' || est?.id === 'no_reparable_avisado';
  });

  readonly lineasFiltradas = computed(() => {
    const terminos = terminosDe(this.busquedaAplicada());
    if (terminos.length === 0) return this.lineas();
    return this.lineas().filter((l) => casaTodos(this.indiceDe(l), terminos));
  });
  
  readonly total = computed(() => this.lineasFiltradas().length);

  readonly mostrarDivisor = computed(() => {
    const modo = this.divisorModo();
    if (modo === 'off') return false;
    if (modo === 'todos') return true;
    return this.botonActivo() === 'Todo';
  });

  readonly filas = computed<FilaTablero[]>(() => {
    const ls = this.lineasFiltradas();
    const conDivisor = this.mostrarDivisor();
    const out: FilaTablero[] = [];
    let ultimaFecha: string | null = null;
    for (const l of ls) {
      const f = l.fecha_entrada;
      if (conDivisor && f && f !== ultimaFecha) {
        out.push({ tipo: 'divisor', fecha: f, key: `div-${f}-${l.id}` });
        ultimaFecha = f;
      }
      out.push({ tipo: 'linea', linea: l });
    }
    return out;
  });

  getColor = getColor;
  getEtiqueta = getEtiqueta;

  onBuscar(q: string): void {
    this.busqueda.set(q);
    this.busqueda$.next(q);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
    this.busquedaAplicada.set('');
    this.busqueda$.next('');
  }

  ngOnInit(): void {
    this.cargar();
    this.proveedorSvc.list().subscribe({ next: (p) => this.proveedores.set(p), error: () => {} });
    this.busqueda$
      .pipe(debounceTime(150), distinctUntilChanged())
      .subscribe((q) => this.busquedaAplicada.set(q));
  }

  ngAfterViewInit(): void {
    const el = this.controlsRef?.nativeElement;
    if (!el) return;
    this.resizeObs = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--controls-h', `${el.offsetHeight}px`);
    });
    this.resizeObs.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect();
    this.resizeObs = null;
  }

  seleccionarBoton(boton: Boton): void {
    this.filtrosActivos = boton.filtros;
    this.botonActivo.set(boton.label);
    this.estadoActivo.set(null);
    this.limpiarBusqueda();
    this.expandedId.set(null);
    this.cargar();
  }

  seleccionarEstado(est: EstadoDef): void {
    this.filtrosActivos = {};
    this.botonActivo.set('');
    this.estadoActivo.set(est);
    this.limpiarBusqueda();
    this.expandedId.set(null);
    this.cargar();
  }

  resetEstado(): void {
    this.seleccionarBoton(this.botones[0]);
  }

  toggleFiltrosExpandidos(): void {
    this.filtrosExpandidos.update((v) => !v);
  }

  toggleIncluirHistorial(): void {
    this.incluirHistorial.update((v) => !v);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.expandedId.set(null);
    const filtros: LineaFiltros = { ...this.filtrosActivos };
    const bt = this.botones.find((b) => b.label === this.botonActivo());
    if (this.incluirHistorial() && bt?.aplicaHistorial) {
      filtros.incluir_historial = true;
      if (bt.fasesHistorial?.length) filtros.fases_historial = bt.fasesHistorial.join(',');
    }
    this.lineas$.list(filtros).subscribe({
      next: (data) => {
        let filtradas = data;
        if (bt?.filtroClient) filtradas = filtradas.filter(bt.filtroClient);
        const est = this.estadoActivo();
        if (est) filtradas = filtradas.filter((l) => esEstadoActual(est, l));
        this.lineas.set(filtradas);
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
    this.verTodos.set(false);


    this.edModelo = linea.modelo ?? '';
    this.edTipoCobro = linea.tipo_cobro;
    this.edFechaEntrada = linea.fecha_entrada ?? '';
    this.edRecogida = linea.fecha_recogida_prevista ?? '';
    this.edNotas = linea.notas ?? '';

      if (linea.cliente_nombre) {
      this.clienteSelec.set({ id: linea.cliente_id!, nombre: linea.cliente_nombre, telefono: linea.cliente_telefono });
    } else {
      this.clienteSelec.set(null);
    }

    this.edPiezas = [{ descripcion: linea.problema_o_pieza ?? '', importe: linea.importe }];
    this.edPiezasCargando.set(true);
    this.lineas$.getById(linea.id).subscribe({
      next: (l) => {
        if (this.expandedId() !== linea.id) return;
        const ps = l.piezas ?? [];
        this.edPiezas = ps.length
          ? ps.map((p) => ({
              descripcion: p.descripcion,
              importe: p.importe === null || p.importe === undefined ? null : Number(p.importe),
            }))
          : [{ descripcion: l.problema_o_pieza ?? '', importe: l.importe }];
        this.edPiezasCargando.set(false);
      },
      error: () => this.edPiezasCargando.set(false),
    });

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
        const merged = { ...linea, ...updated } as Linea;
        this.lineas.update((c) => c.map((x) => x.id === linea.id ? merged : x));
        this.guardando.set(false);
        if (tieneMensajeEspecifico(merged) && merged.cliente_telefono) {
          this.mostrarToastWa(merged);
        }
      },
      error: (err) => { this.guardando.set(false); this.error.set(err?.error?.error?.message ?? 'Error'); },
    });
  }

  etiquetaPiezasDe(linea: Linea): string {
    if (linea.flujo === 'pieza')     return 'Piezas';
    if (linea.flujo === 'accesorio') return 'Accesorios';
    if (linea.flujo === 'venta')     return 'Artículos';
    return 'Problema';
  }

  get totalEdPiezas(): number | null {
    let hay = false;
    let suma = 0;
    for (const p of this.edPiezas) {
      const n = Number(p.importe);
      if (p.importe !== null && p.importe !== undefined && String(p.importe) !== '' && !Number.isNaN(n)) {
        hay = true;
        suma += n;
      }
    }
    return hay ? Math.round(suma * 100) / 100 : null;
  }

  anadirEdPieza(): void {
    this.edPiezas.push({ descripcion: '', importe: null });
    this.focoEnEdPieza(this.edPiezas.length - 1);
  }

  quitarEdPieza(i: number): void {
    if (this.edPiezas.length === 1) {
      this.edPiezas[0] = { descripcion: '', importe: null };
      return;
    }
    this.edPiezas.splice(i, 1);
  }

  onEnterEdPieza(ev: Event, i: number): void {
    ev.preventDefault();
    if (i < this.edPiezas.length - 1) {
      this.focoEnEdPieza(i + 1);
      return;
    }
    if (!(this.edPiezas[i].descripcion ?? '').trim()) return;
    this.anadirEdPieza();
  }

  private focoEnEdPieza(i: number): void {
    setTimeout(() => {
      document.querySelector<HTMLInputElement>(`[data-pieza-panel="${i}"]`)?.focus();
    });
  }

  private edPiezasLimpias(): Pieza[] {
    return this.edPiezas
      .map((p, i) => ({
        descripcion: (p.descripcion ?? '').trim(),
        importe: p.importe === null || p.importe === undefined || String(p.importe) === ''
          ? null
          : Number(p.importe),
        orden: i,
      }))
      .filter((p) => p.descripcion !== '');
  }

  guardarDatos(linea: Linea): void {
    const payload: LineaPayload = {
      modelo: this.edModelo || null,
      piezas: this.edPiezasLimpias(),
      tipo_cobro: this.edTipoCobro,
      fecha_entrada: this.edFechaEntrada || null,
      fecha_recogida_prevista: this.edRecogida || null,
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

  onClienteChange(c: Cliente | null): void {
    this.clienteSelec.set(c);
  }

  esEstadoActual(opt: EstadoDef, linea: Linea): boolean {
    return esEstadoActual(opt, linea);
  }
// Tweak para tener los dias de antiguedad y duracion de cada entrada del historial de la linea. Para un vistazo rapido
  etiquetaHistorial(h: EntradaHistorial): string {
    return etiquetaHistorialCompleta(h);
  }

  duracionHist(i: number): string {
    const hs = this.panelHistorial();
    const sig = hs[i + 1];
    if (!sig) return '';
    const d = this.diasEntre(hs[i].fecha, sig.fecha);
    return d === 0 ? '<1d' : `${d}d`;
  }

  antiguedadHist(i: number): string {
    const hs = this.panelHistorial();
    const h = hs[i];
    if (!h) return '';
    const d = this.diasEntre(h.fecha, new Date().toISOString());
    return d === 0 ? 'hoy' : `hace ${d}d`;
  }

  private diasEntre(a: unknown, b: unknown): number {
    const ta = new Date(String(a).replace(' ', 'T')).getTime();
    const tb = new Date(String(b).replace(' ', 'T')).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return Math.max(0, Math.floor((tb - ta) / 86_400_000));
  }
  // fin de Tweark para tener los dias de.....
  
  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  chipsParaLinea(linea: Linea): EstadoDef[] {
    if (this.verTodos()) return this.estadoOptions;
    const actual = estadoActualDef(linea);
    const sig = siguientesDe(linea);
    return actual ? [actual, ...sig] : sig;
  }

  toggleVerTodos(): void {
    this.verTodos.update((v) => !v);
  }

  toggleAjustes(): void {
    this.ajustesAbierto.update((v) => !v);
  }

  abrirPedido(): void {
    this.pedidoAbierto.set(true);
  }

  enviarWhatsapp(linea: Linea): void {
    const tel = this.limpiarTelefono(linea.cliente_telefono);
    if (!tel) {
      this.error.set('Esta línea no tiene número de teléfono');
      return;
    }
    const texto = mensajeWhatsapp(linea);
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  imprimirTicket(linea: Linea): void {
    const err = this.ticketSvc.imprimirCompleto(linea);
    if (err) this.error.set(err);
  }

  imprimirTicketSimple(linea: Linea): void {
    const err = this.ticketSvc.imprimirSimple(linea);
    if (err) this.error.set(err);
  }

  imprimirEtiqueta(linea: Linea): void {
    const err = this.etiquetaSvc.imprimirDispositivo(linea);
    if (err) this.error.set(err);
  }

  imprimirEtiquetaEnvio(linea: Linea): void {
    const err = this.etiquetaSvc.imprimirEnvio(linea);
    if (err) this.error.set(err);
  }

  mostrarToastWa(linea: Linea): void {
    this.toastWa.set(linea);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastWa.set(null), 6000);
  }

  enviarDesdeToast(): void {
    const l = this.toastWa();
    if (l) this.enviarWhatsapp(l);
    this.cerrarToast();
  }

  cerrarToast(): void {
    this.toastWa.set(null);
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
  }

  private limpiarTelefono(tel: string | null): string | null {
    if (!tel) return null;
    let s = tel.replace(/\D/g, '');
    if (!s || s.length < 6) return null;
    if (s.length === 9) s = '34' + s;        // móvil español sin prefijo
    // si ya viene con 34 (11-12 díg) se deja tal cual
    return s;
  }

  cerrarPedido(recargar: boolean): void {
    this.pedidoAbierto.set(false);
    if (recargar) this.cargar();
  }

  abrirTaller(): void { this.tallerAbierto.set(true); }

  cerrarTaller(): void { this.tallerAbierto.set(false); }

  abrirAvisar(): void {
    const est = this.estadoActivo();
    if (est) {
      this.filtrosAvisar.set({
        flujo: est.flujo,
        fase: est.fase,
        avisado: est.avisado,
        movil_en_tienda: est.movil_en_tienda,
      });
    } else if (this.botonActivo() === 'Reparar + Avisado') {
      this.filtrosAvisar.set({ flujo: 'reparacion', fase: 'reparado', avisado: true });
    } else {
      const b = this.botones.find((x) => x.label === this.botonActivo());
      this.filtrosAvisar.set(b ? { ...b.filtros } : {});
    }
    this.avisarAbierto.set(true);
  }

  cerrarAvisar(recargar: boolean): void {
    this.avisarAbierto.set(false);
    if (recargar) this.cargar();
  }

  setDivisorModo(modo: 'todos' | 'solo_todo' | 'off'): void {
    this.divisorModo.set(modo);
    try { localStorage.setItem('phonecity_divisor_modo', modo); } catch {}
  }

  private leerDivisorModo(): 'todos' | 'solo_todo' | 'off' {
    try {
      const v = localStorage.getItem('phonecity_divisor_modo');
      if (v === 'todos' || v === 'solo_todo' || v === 'off') return v;
    } catch {}
    return 'solo_todo';
  }

  formatoDivisor(fecha: string): string {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) d = new Date(fecha);
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(fecha)) {
      const [dd, mm, yyyy] = fecha.split('/').map(Number);
      d = new Date(yyyy, mm - 1, dd);
    } else d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    return `${dias[d.getDay()]} ${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const enInput = (() => {
      const t = e.target as HTMLElement;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    })();
    if (((e.ctrlKey || e.metaKey) && e.key === 'f') || (e.key === '/' && !enInput)) {
      e.preventDefault();
      this.busquedaInput?.nativeElement?.focus();
    }
    if (e.key === 'Escape') {
      if (this.ajustesAbierto()) this.ajustesAbierto.set(false);
      else if (this.expandedId() !== null) this.expandedId.set(null);
      else if (this.busqueda()) this.limpiarBusqueda();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.ajustesAbierto()) return;
    const t = e.target as HTMLElement;
    if (t && !t.closest('.ajustes-wrap')) this.ajustesAbierto.set(false);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

  private proveedorIdPorNombre(nombre?: string | null): number | null {
    if (!nombre) return null;
    const p = this.proveedores().find((x) => normalizar(x.nombre) === normalizar(nombre));
    return p ? p.id : null;
  }
}
