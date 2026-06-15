import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

import { LineaService, LineaPayload } from '../../core/services/linea.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ProveedorService, Proveedor } from '../../core/services/proveedor.service';
import { Linea, Flujo, Fase, TipoCobro } from '../../core/models/linea.model';
import { Cliente } from '../../core/models/cliente.model';

@Component({
  selector: 'app-linea-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './linea-form.component.html',
  styleUrl: './linea-form.component.scss',
})
export class LineaFormComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly lineaSvc  = inject(LineaService);
  private readonly clienteSvc = inject(ClienteService);
  private readonly proveedorSvc = inject(ProveedorService);

  // Modo
  readonly modoEdicion = signal(false);
  lineaId: number | null = null;

  // Estado UI
  readonly cargando   = signal(false);
  readonly guardando  = signal(false);
  readonly error      = signal<string | null>(null);

  // Opciones
  readonly proveedores = signal<Proveedor[]>([]);

  // Busqueda de cliente
  readonly busqCliente   = signal('');
  readonly resultClientes = signal<Cliente[]>([]);
  readonly clienteSelec  = signal<Cliente | null>(null);
  readonly mostrarNuevoCliente = signal(false);
  readonly nuevoClienteNombre  = signal('');
  readonly nuevoClienteTel     = signal('');
  private readonly busq$ = new Subject<string>();

  // --- CAMPOS DEL FORMULARIO ---
  flujo: Flujo = 'reparacion';
  fase: Fase   = 'por_reparar';
  avisado      = false;
  movil_en_tienda = false;
  modelo       = '';
  problema_o_pieza = '';
  notas        = '';
  telefono_alternativo = '';
  codigo_dispositivo   = '';
  importe: number | null = null;
  tipo_cobro: TipoCobro = 'normal';
  fecha_entrada  = this.hoy();
  fecha_pedido   = '';
  fecha_recogida_prevista = '';
  proveedor_id: number | null = null;
  taller: 'Phonestorm' | 'Infotec' | '' = '';
  fecha_envio_taller   = '';
  fecha_retorno_taller = '';

  // Opciones de selects
  readonly flujos: { val: Flujo; label: string }[] = [
    { val: 'reparacion', label: 'Reparación' },
    { val: 'pieza',      label: 'Pieza' },
    { val: 'accesorio',  label: 'Accesorio' },
    { val: 'venta',      label: 'Venta' },
  ];

  readonly fasesPorFlujo: Record<Flujo, { val: Fase; label: string }[]> = {
    reparacion: [
      { val: 'por_reparar',       label: 'Reparando' },
      { val: 'por_enviar_taller', label: 'Enviar a taller' },
      { val: 'en_taller',         label: 'En taller' },
      { val: 'reparado',          label: 'Reparado - Avisado' },
      { val: 'entregado',         label: 'Finalizado' },
      { val: 'no_reparable',      label: 'No se puede reparar' },
      { val: 'cancelado',         label: 'Cancelado' },
    ],
    pieza: [
      { val: 'por_pedir', label: 'Pedir pieza' },
      { val: 'pedido',    label: 'Pieza pedida' },
      { val: 'en_tienda', label: 'Pieza en tienda - Avisado' },
      { val: 'entregado', label: 'Finalizado' },
      { val: 'cancelado', label: 'Cancelado' },
    ],
    accesorio: [
      { val: 'por_pedir', label: 'Pedir accesorio' },
      { val: 'pedido',    label: 'Accesorio pedido' },
      { val: 'en_tienda', label: 'Accesorio en tienda - Avisado' },
      { val: 'entregado', label: 'Finalizado' },
      { val: 'cancelado', label: 'Cancelado' },
    ],
    venta: [
      { val: 'entregado', label: 'Vendido' },
      { val: 'cancelado', label: 'Cancelado' },
    ],
  };

  get fases() { return this.fasesPorFlujo[this.flujo]; }
  get esPieza()      { return this.flujo === 'pieza' || this.flujo === 'accesorio'; }
  get esReparacion() { return this.flujo === 'reparacion'; }

  ngOnInit(): void {
    this.cargarProveedores();
    this.configurarBusquedaCliente();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion.set(true);
      this.lineaId = Number(id);
      this.cargarLinea(this.lineaId);
    }
  }

  private hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private cargarProveedores(): void {
    this.proveedorSvc.list().subscribe({
      next: (p) => this.proveedores.set(p),
      error: () => {},
    });
  }

  private configurarBusquedaCliente(): void {
    this.busq$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => this.clienteSvc.buscar(q)),
      )
      .subscribe((res) => this.resultClientes.set(res));
  }

  private cargarLinea(id: number): void {
    this.cargando.set(true);
    this.lineaSvc.getById(id).subscribe({
      next: (l) => {
        this.flujo     = l.flujo;
        this.fase      = l.fase;
        this.avisado   = !!l.avisado;
        this.movil_en_tienda = !!l.movil_en_tienda;
        this.modelo    = l.modelo ?? '';
        this.problema_o_pieza = l.problema_o_pieza ?? '';
        this.notas     = l.notas ?? '';
        this.telefono_alternativo = l.telefono_alternativo ?? '';
        this.codigo_dispositivo   = l.codigo_dispositivo ?? '';
        this.importe   = l.importe;
        this.tipo_cobro = l.tipo_cobro;
        this.fecha_entrada = l.fecha_entrada ?? this.hoy();
        this.fecha_pedido  = l.fecha_pedido ?? '';
        this.fecha_recogida_prevista = l.fecha_recogida_prevista ?? '';
        this.proveedor_id  = l.proveedor_id;
        this.taller    = (l.taller as 'Phonestorm' | 'Infotec') ?? '';
        this.fecha_envio_taller   = l.fecha_envio_taller ?? '';
        this.fecha_retorno_taller = l.fecha_retorno_taller ?? '';

        if (l.cliente_nombre) {
          this.clienteSelec.set({
            id: l.cliente_id!,
            nombre: l.cliente_nombre,
            telefono: l.cliente_telefono,
          });
          this.busqCliente.set(l.cliente_nombre);
        }
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la línea');
        this.cargando.set(false);
      },
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

  crearCliente(): void {
    const nombre = this.nuevoClienteNombre().trim();
    const tel    = this.nuevoClienteTel().trim();
    if (!nombre) return;
    this.clienteSvc.crear(nombre, tel).subscribe({
      next: (c) => {
        this.seleccionarCliente(c);
        this.mostrarNuevoCliente.set(false);
        this.nuevoClienteNombre.set('');
        this.nuevoClienteTel.set('');
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Error al crear cliente');
      },
    });
  }

  onFlujoChange(): void {
    // Resetear fase al primer valor valido del nuevo flujo
    this.fase = this.fases[0].val;
  }

  toggleNuevoCliente(): void {
    this.mostrarNuevoCliente.update((v) => !v);
  }

  onSubmit(): void {
    // Alerta RGPD si se pasa a entregado en modo edicion
    if (this.modoEdicion() && this.fase === 'entregado') {
      const ok = window.confirm(
        '⚠️ Al marcar como Finalizado se eliminarán las credenciales del cliente (RGPD). ¿Continuar?'
      );
      if (!ok) return;
    }

    const payload: LineaPayload = {
      tienda_id: 1,
      flujo:     this.flujo,
      fase:      this.fase,
      avisado:   this.avisado as any,
      movil_en_tienda: this.movil_en_tienda as any,
      modelo:    this.modelo || null,
      problema_o_pieza: this.problema_o_pieza || null,
      notas:     this.notas || null,
      telefono_alternativo: this.telefono_alternativo || null,
      codigo_dispositivo:   this.codigo_dispositivo || null,
      importe:   this.importe,
      tipo_cobro: this.tipo_cobro,
      fecha_entrada: this.fecha_entrada || null,
      fecha_pedido:  this.fecha_pedido || null,
      fecha_recogida_prevista: this.fecha_recogida_prevista || null,
      proveedor_id: this.proveedor_id,
      taller: this.taller || null,
      fecha_envio_taller:   this.fecha_envio_taller || null,
      fecha_retorno_taller: this.fecha_retorno_taller || null,
      cliente_id: this.clienteSelec()?.id ?? null,
    };

    this.guardando.set(true);
    this.error.set(null);

    const op$ = this.modoEdicion()
      ? this.lineaSvc.update(this.lineaId!, payload)
      : this.lineaSvc.create(payload);

    op$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/tablero']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al guardar');
      },
    });
  }

  volver(): void {
    this.router.navigate(['/tablero']);
  }
}
