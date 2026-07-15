import {Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import JsBarcode from 'jsbarcode';
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
import { PedidoModalComponent } from '../pedido-modal/pedido-modal.component';
import { ConsultaTallerModalComponent } from '../consulta-taller-modal/consulta-taller-modal.component';
import { AvisarModalComponent } from '../avisar-modal/avisar-modal.component';

import { Cliente } from '../../core/models/cliente.model';
import { ESTADO_OPTIONS, EstadoDef, esEstadoActual, getColor, getEtiqueta, etiquetaHistorialCompleta, estadoActualDef, siguientesDe, mensajeWhatsapp, tieneMensajeEspecifico} from '../../core/estados/estados';

interface Boton { label: string; filtros: LineaFiltros; filtroClient?: (l: Linea) => boolean; aplicaHistorial?: boolean; fasesHistorial?: string[];}

type FilaTablero =
  | { tipo: 'divisor'; fecha: string; key: string }
  | { tipo: 'linea'; linea: Linea };

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PedidoModalComponent, ConsultaTallerModalComponent, AvisarModalComponent],
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
  edProblema = '';
  edImporte: number | null = null;
  edTipoCobro: TipoCobro = 'normal';
  edFechaEntrada = '';
  edRecogida = '';
  edTelAlt = '';
  edNotas = '';

  private readonly auth = inject(AuthService);
  private readonly lineas$ = inject(LineaService);
  private readonly histSvc = inject(HistorialService);
  private readonly clienteSvc = inject(ClienteService);
  private readonly proveedorSvc = inject(ProveedorService);
  private readonly router = inject(Router);
  private filtrosActivos: LineaFiltros = {};
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObs: ResizeObserver | null = null;
  private readonly busq$ = new Subject<string>();

  readonly lineas = signal<Linea[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly botonActivo = signal('Todo');
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
  readonly filasVacias = [0, 1, 2, 3, 4];
  readonly busqCliente = signal('');
  readonly resultClientes = signal<Cliente[]>([]);
  readonly clienteSelec = signal<Cliente | null>(null);
  readonly mostrarNuevoCliente = signal(false);
  readonly nuevoNombre = signal('');
  readonly nuevoTel = signal('');

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
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.lineas();
    return this.lineas().filter((l) =>
      String(l.id).includes(q) ||
      l.modelo?.toLowerCase().includes(q) ||
      l.cliente_nombre?.toLowerCase().includes(q) ||
      l.cliente_telefono?.includes(q) ||
      l.problema_o_pieza?.toLowerCase().includes(q) ||
      l.notas?.toLowerCase().includes(q) ||
      String(l.importe ?? '').includes(q) ||
      getEtiqueta(l).toLowerCase().includes(q),
    );
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

  ngOnInit(): void {
    this.cargar();
    this.proveedorSvc.list().subscribe({ next: (p) => this.proveedores.set(p), error: () => {} });
    this.busq$
      .pipe(debounceTime(300), distinctUntilChanged(), switchMap((q) => this.clienteSvc.buscar(q)))
      .subscribe((res) => this.resultClientes.set(res));
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
    this.busqueda.set('');
    this.expandedId.set(null);
    this.cargar();
  }

  seleccionarEstado(est: EstadoDef): void {
    this.filtrosActivos = {};
    this.botonActivo.set('');
    this.estadoActivo.set(est);
    this.busqueda.set('');
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
    this.edProblema = linea.problema_o_pieza ?? '';
    this.edImporte = linea.importe;
    this.edTipoCobro = linea.tipo_cobro;
    this.edFechaEntrada = linea.fecha_entrada ?? '';
    this.edRecogida = linea.fecha_recogida_prevista ?? '';
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

  guardarDatos(linea: Linea): void {
    const payload: LineaPayload = {
      modelo: this.edModelo || null,
      problema_o_pieza: this.edProblema || null,
      importe: this.edImporte,
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
    return etiquetaHistorialCompleta(h);
  }
  
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
    const esc = (s: string | null | undefined) =>
      (s ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const cliente = esc(linea.cliente_nombre);
    const telefono = esc(linea.cliente_telefono);
    const modelo = esc(linea.modelo);
    const problema = esc(linea.problema_o_pieza);
    const nPedido = linea.id;

    const importeNum = linea.importe != null ? Number(linea.importe) : null;
    const precio = importeNum != null && !Number.isNaN(importeNum)
      ? (Number.isInteger(importeNum) ? `${importeNum}€` : `${importeNum.toFixed(2)}€`)
      : '-';

    const fecha = linea.fecha_entrada
      ? new Date(linea.fecha_entrada.replace(' ', 'T')).toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : '-';

    let barcodeImg = '';
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(nPedido), {
        format: 'CODE128', width: 2, height: 60, displayValue: false, margin: 0,
      });
      barcodeImg = `<div class="barcode-wrap"><img class="barcode" src="${canvas.toDataURL('image/png')}" alt="No ${nPedido}"></div>`;
    } catch {
      barcodeImg = '';
    }

    const legal = [
      'La recogida del dispositivo se realiza presentando este resguardo. En su defecto, será necesario acreditar identidad y titularidad, pudiendo demorarse la entrega.',
      'No se devolverá el importe de liberaciones o reparaciones si el terminal resulta bloqueado por la operadora.',
      'Los plazos de entrega son orientativos y pueden retrasarse. Una vez solicitadas, las reparaciones no se pueden anular.',
      'El cliente declara ser el propietario legítimo del terminal y autoriza su manipulación, desbloqueo o liberación.',
      'La empresa no se responsabiliza de la pérdida de datos del dispositivo; se recomienda realizar una copia de seguridad. Tampoco se responden por tarjetas SIM, SD o accesorios que no hayan sido retirados.',
      'El dispositivo debe recogerse en un plazo máximo de tres meses desde la fecha del presente documento. Pasado dicho plazo podrá ser desmontado o reciclado para cubrir gastos.',
    ].map((p) => `<p class="legal">${p}</p>`).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket-${nPedido}</title>
<style>
  @page { size: 80mm 297mm; margin: 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; width: 74mm; }
  .titulo-doc { font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 2px; }
  .tienda { font-size: 18px; font-weight: bold; text-align: center; margin: 3px 0; }
  .copia-label { font-size: 9px; font-weight: bold; text-align: center; letter-spacing: 1px; margin-bottom: 2px; }
  .sep { border-top: 2px solid #000; margin: 6px 0; }
  .barcode-wrap { text-align: center; margin: 8px 0 2px; }
  .barcode { max-width: 60mm; height: auto; }
  .pedido { font-size: 17px; font-weight: bold; text-align: center; margin: 2px 0 8px; }
  .aviso { border: 2px solid #000; padding: 8px 6px; margin: 8px 0; text-align: center; }
  .aviso-titulo { font-size: 13px; font-weight: bold; }
  .aviso-texto { font-size: 11px; margin-top: 4px; line-height: 1.35; }
  .sec-titulo { font-size: 10px; font-weight: bold; letter-spacing: 1px; margin: 10px 0 4px; padding-bottom: 2px; border-bottom: 1px solid #000; }
  .dato { font-size: 13px; font-weight: bold; margin: 3px 0; }
  .gracias { font-size: 15px; font-weight: bold; text-align: center; margin: 12px 0; }
  .cond-titulo { font-size: 10px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 8px 0 4px; }
  .legal { font-size: 9px; text-align: justify; line-height: 1.4; margin: 4px 0; }
  .contacto { font-size: 11px; text-align: center; line-height: 1.6; margin: 2px 0; }
  .corte { border-top: 2px dashed #000; margin: 14px 0 6px; text-align: center; }
  .corte-label { font-size: 10px; font-weight: bold; letter-spacing: 2px; background: #fff; padding: 0 6px; position: relative; top: -8px; }
  .rg-pedido { font-size: 15px; font-weight: bold; margin: 4px 0; }
  .rg-dato { font-size: 12px; font-weight: bold; margin: 2px 0; }
  .rg-precio { font-size: 14px; font-weight: bold; margin: 4px 0; }
  .conforme { border: 1px solid #000; padding: 8px; margin: 10px 0; font-size: 11px; font-weight: bold; }
  .firma { font-size: 12px; font-weight: bold; margin-top: 16px; }
  .firma-linea { border-top: 1px solid #000; margin-top: 40px; }
</style></head>
<body>
  <div class="titulo-doc">RESGUARDO DE RECOGIDA</div>
  <div class="tienda">📱 PHONE CITY 📱</div>
  <div class="copia-label">— COPIA CLIENTE —</div>
  <div class="sep"></div>

  ${barcodeImg}
  <div class="pedido">Nº Pedido: ${nPedido}</div>

  <div class="aviso">
    <div class="aviso-titulo">⚠ CONSERVE ESTE RESGUARDO</div>
    <div class="aviso-texto">En su ausencia, acreditar identidad y titularidad con DNI. Puede demorar la entrega del dispositivo.</div>
  </div>

  <div class="sec-titulo">DATOS DEL CLIENTE</div>
  <p class="dato">Cliente: ${cliente}</p>
  <p class="dato">Teléfono: ${telefono}</p>

  <div class="sec-titulo">DISPOSITIVO</div>
  <p class="dato">Dispositivo: ${modelo}</p>
  <p class="dato">Problema: ${problema}</p>
  <p class="dato">Precio: ${precio}</p>
  <p class="dato">Fecha entrada: ${fecha}</p>

  <div class="gracias">¡Gracias por confiar en nosotros!</div>

  <div class="cond-titulo">CONDICIONES DE REPARACIÓN</div>
  ${legal}

  <div class="sec-titulo">CONTACTO</div>
  <div class="contacto">
    Phone City · Avenida España 11<br>
    Tel: 603 378 555<br>
    L-V 10:00-14:00 y 17:00-20:30<br>
    Sábados 10:00-14:00
  </div>

  <div class="corte"><span class="corte-label">✂ COPIA TIENDA</span></div>

  <p class="rg-pedido">Nº Pedido: ${nPedido}</p>
  <p class="rg-dato">Cliente: ${cliente}</p>
  <p class="rg-dato">Teléfono: ${telefono}</p>
  <p class="rg-dato">Dispositivo: ${modelo}</p>
  <p class="rg-dato">Problema/Pieza: ${problema}</p>
  <p class="rg-precio">Precio: ${precio}</p>

  <div class="conforme">☐&nbsp;&nbsp;&nbsp;Estoy de acuerdo con las condiciones de reparación</div>

  <p class="firma">Firma del cliente:</p>
  <div class="firma-linea"></div>
</body></html>`;

    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) {
      this.error.set('Bloqueado por el navegador. Permite las ventanas emergentes.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      setTimeout(() => { try { win.close(); } catch {} }, 500);
    }, 300);
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
    return `${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
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
      else if (this.busqueda()) this.busqueda.set('');
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
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const p = this.proveedores().find((x) => norm(x.nombre) === norm(nombre));
    return p ? p.id : null;
  }
}
