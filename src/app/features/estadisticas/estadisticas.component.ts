import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { ChartData } from 'chart.js';

import { EstadisticasService } from '../../core/services/estadisticas.service';
import {
  Estadisticas,
  FlujoEstadisticas,
  KpisEstadisticas,
  MesesEstadisticas,
  TiempoProveedor,
} from '../../core/models/estadisticas.model';
import { colorEstado } from '../../core/estados/estados';
import { GraficoComponent } from './grafico/grafico.component';
import {
  COLOR_ACENTO,
  COLOR_COMPRAS,
  COLOR_FLUJO,
  COLOR_VENTAS,
  NOMBRE_FLUJO,
  opcionesHorizontales,
  opcionesSeries,
  opcionesVerticales,
} from './opciones-graficos';

const CLAVES_CIFRAS = [
  'reparaciones',
  'ingresos',
  'ticket',
  'dias',
  'ventas',
  'compras',
  'ingresoVentas',
  'gastoCompras',
  'diasEnvio',
] as const;

const CIFRAS_DECIMALES: readonly string[] = ['dias', 'diasEnvio'];

type Cifras = Record<(typeof CLAVES_CIFRAS)[number], number>;

interface Variacion {
  texto: string;
  clase: 'bueno' | 'malo' | 'neutro';
}

const MENOS_ES_MEJOR: (keyof KpisEstadisticas)[] = ['diasMediosEntrega'];
const OCULTO = '•••';
const PROVEEDORES_TIEMPO: { clave: keyof TiempoProveedor; nombre: string }[] = [
  { clave: 'wephone', nombre: 'Wephone' },
  { clave: 'apokin', nombre: 'Apokin' },
  { clave: 'piezas', nombre: 'Piezas' },
];

const FLUJOS: FlujoEstadisticas[] = ['reparacion', 'pieza', 'accesorio', 'venta'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DURACION_CONTADOR = 900;
const ALTO_FILA = 34;
const ALTO_EJES = 70;
const ALTO_FILA_TOP = 30;
const ALTO_EJES_TOP = 40;
const FILAS_MINIMAS_TOP = 3;
const TOP_LARGO = 20;

type Top = 'modelos' | 'accesorios' | 'vendidos' | 'comprados';

const TOP_CORTO: Record<Top, number> = { modelos: 10, accesorios: 10, vendidos: 5, comprados: 5 };
const TOPS_CORTOS: Record<Top, boolean> = { modelos: false, accesorios: false, vendidos: false, comprados: false };
const CERO = Object.fromEntries(CLAVES_CIFRAS.map((c) => [c, 0])) as Cifras;

const entero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function etiquetaMes(clave: string): string {
  const [a, m] = clave.split('-');
  return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`;
}

type Pestana = 'reparaciones' | 'accesorios' | 'compraventa' | 'taller' | 'todo';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'reparaciones', texto: 'Reparaciones' },
  { id: 'accesorios', texto: 'Accesorios' },
  { id: 'compraventa', texto: 'Compraventa' },
  { id: 'taller', texto: 'Taller' },
  { id: 'todo', texto: 'Todo' },
];

const DIAS_ABIERTO = 6;
const TRAMOS = ['1–7', '8–14', '15–21', '22–28', '29–31'];

function contarDias(desde: string, hasta: string): { porDia: number[]; porTramo: number[] } {
  const porDia = Array(7).fill(0);
  const porTramo = Array(5).fill(0);
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  const fin = Date.UTC(a2, m2 - 1, d2);
  for (let t = Date.UTC(a1, m1 - 1, d1); t <= fin; t += 86400000) {
    const fecha = new Date(t);
    const dia = (fecha.getUTCDay() + 6) % 7;
    porDia[dia] += 1;
    if (dia < DIAS_ABIERTO) porTramo[Math.min(Math.ceil(fecha.getUTCDate() / 7), 5) - 1] += 1;
  }
  return { porDia, porTramo };
}

function altoTop(filas: number): number {
  return Math.max(filas, FILAS_MINIMAS_TOP) * ALTO_FILA_TOP + ALTO_EJES_TOP;
}

function media(total: number, dias: number): number {
  return dias ? Math.round((total / dias) * 10) / 10 : 0;
}

function textoMedia(m?: { media: number; total: number; dias: number }): string[] {
  if (!m) return [];
  return [`${decimal.format(m.media)} entradas por día`, `${m.total} entradas en ${m.dias} días`];
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [GraficoComponent, RouterLink, NgTemplateOutlet],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.scss',
})
export class EstadisticasComponent {
  private readonly api = inject(EstadisticasService);
  private readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private raf = 0;

  readonly opcionesMeses: MesesEstadisticas[] = [3, 6, 12];
  readonly meses = signal<MesesEstadisticas>(3);
  readonly datos = signal<Estadisticas | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly cifras = signal<Cifras>(CERO);
  readonly mostrarImportes = signal(false);
  readonly pestanas = PESTANAS;
  readonly pestana = signal<Pestana>('reparaciones');
  readonly ampliados = signal<Record<Top, boolean>>(TOPS_CORTOS);
  private readonly intento = signal(0);
  private readonly peticion = computed(() => ({ meses: this.meses(), intento: this.intento() }));

  readonly recomendacionesReparacion = computed(() =>
    (this.datos()?.recomendaciones ?? []).filter((r) => r.tipo === 'modelo' || r.tipo === 'dia'),
  );

  readonly recomendacionesAccesorio = computed(() =>
    (this.datos()?.recomendaciones ?? []).filter((r) => r.tipo === 'accesorio'),
  );

  readonly periodo = computed(() => {
    const p = this.datos()?.periodo;
    return p ? `Del ${fechaCorta(p.desde)} al ${fechaCorta(p.hasta)} · ${p.dias} días` : '';
  });

  readonly textoCifras = computed(() => {
    const c = this.cifras();
    const sinDias = this.datos()?.kpis.diasMediosEntrega === null;
    const euros = (n: number) => (this.mostrarImportes() ? `${entero.format(n)} €` : OCULTO);
    return {
      reparaciones: entero.format(c.reparaciones),
      ingresos: euros(c.ingresos),
      ticket: euros(c.ticket),
      dias: sinDias ? null : `${decimal.format(c.dias)} días`,
      ventas: entero.format(c.ventas),
      compras: entero.format(c.compras),
      ingresoVentas: euros(c.ingresoVentas),
      gastoCompras: euros(c.gastoCompras),
      diasEnvio: this.datos()?.taller.diasHastaEnvio === null ? null : `${decimal.format(c.diasEnvio)} días`,
    };
  });

  readonly variaciones = computed(() => {
    const v = this.datos()?.variacion;
    if (!v) return null;
    const una = (clave: keyof KpisEstadisticas): Variacion | null => {
      const pct = v[clave];
      if (pct === null || pct === undefined) return null;
      if (pct === 0) return { texto: `${decimal.format(0)}%`, clase: 'neutro' };
      const sube = pct > 0;
      const bueno = MENOS_ES_MEJOR.includes(clave) ? !sube : sube;
      return { texto: `${sube ? '↑' : '↓'} ${decimal.format(Math.abs(pct))}%`, clase: bueno ? 'bueno' : 'malo' };
    };
    return {
      reparaciones: una('reparaciones'),
      ingresos: una('ingresosEstimados'),
      ticket: una('ticketMedio'),
      dias: una('diasMediosEntrega'),
    };
  });

  readonly textoAnterior = computed(() => {
    const desde = this.datos()?.periodoAnterior.desdeEfectivo;
    return desde ? `vs. periodo anterior (desde ${fechaCorta(desde).slice(0, 5)})` : 'vs. periodo anterior';
  });

  readonly textoSinComparacion = computed(() => {
    const fiable = this.datos()?.periodoAnterior.fiableDesde;
    if (!fiable) return 'Comparación disponible con datos desde junio 2026';
    const [a, m] = fiable.split('-').map(Number);
    return `Comparación disponible con datos desde ${MESES_LARGOS[m - 1]} ${a}`;
  });

  readonly talleres = computed(() =>
    (this.datos()?.taller.porTaller ?? []).map((t) => ({
      ...t,
      textoDias: t.diasMedios === null ? '—' : `~${decimal.format(t.diasMedios)} días en taller`,
      textoExito: t.exito === null ? '—' : `${decimal.format(t.exito)}%`,
    })),
  );

  readonly talleresRetrasados = computed(() => (this.datos()?.taller.enTallerAhora ?? []).filter((t) => t.mas15 > 0));

  readonly olvidados = computed(() => this.datos()?.olvidados ?? { total: 0, mas60: 0 });

  readonly textoNoReparable = computed(() => {
    const t = this.datos()?.tasaNoReparable;
    return t === null || t === undefined ? null : `${decimal.format(t)}%`;
  });

  readonly tiemposProveedor = computed(() => {
    const t = this.datos()?.tiempoProveedor;
    return PROVEEDORES_TIEMPO.map(({ clave, nombre }) => {
      const dias = t?.[clave];
      return { nombre, texto: dias === null || dias === undefined ? '—' : `~${decimal.format(dias)}` };
    });
  });

  readonly tiposAccesorio = computed(() => (this.datos()?.accesoriosPorTipo ?? []).filter((t) => t.total > 0));

  readonly altoTiposAccesorio = computed(() => Math.max(1, this.tiposAccesorio().length) * ALTO_FILA + ALTO_EJES);

  readonly graficoTiposAccesorio = computed<ChartData<'bar'>>(() => {
    const tipos = this.tiposAccesorio();
    return {
      labels: tipos.map((t) => t.tipo),
      datasets: [
        { label: 'Wephone', data: tipos.map((t) => t.wephone), backgroundColor: colorEstado('acc_pedido_wephone') },
        { label: 'Apokin', data: tipos.map((t) => t.apokin), backgroundColor: colorEstado('acc_pedido_apokin') },
      ],
    };
  });

  readonly graficoCompraventa = computed<ChartData<'bar'>>(() => {
    const meses = this.datos()?.compraventa.porMes ?? [];
    return {
      labels: meses.map((m) => etiquetaMes(m.mes)),
      datasets: [
        { label: 'Ventas', data: meses.map((m) => m.ventas), backgroundColor: COLOR_VENTAS },
        { label: 'Compras', data: meses.map((m) => m.compras), backgroundColor: COLOR_COMPRAS },
      ],
    };
  });

  private readonly listasTop = computed<Record<Top, unknown[]>>(() => {
    const d = this.datos();
    return {
      modelos: d?.topModelos ?? [],
      accesorios: d?.topAccesorios ?? [],
      vendidos: d?.compraventa.topVendidos ?? [],
      comprados: d?.compraventa.topComprados ?? [],
    };
  });

  readonly topVendidos = computed(() => (this.datos()?.compraventa.topVendidos ?? []).slice(0, this.limite('vendidos')));
  readonly topComprados = computed(() => (this.datos()?.compraventa.topComprados ?? []).slice(0, this.limite('comprados')));

  readonly altoModelos = computed(() => altoTop(this.graficoModelos().labels?.length ?? 0));
  readonly topAccesoriosLista = computed(() => {
    const top = (this.datos()?.topAccesorios ?? []).slice(0, this.limite('accesorios'));
    const maximo = top[0]?.unidades || 1;
    return top.map((a) => ({
      articulo: a.articulo,
      unidades: entero.format(a.unidades),
      proporcion: Math.max(0, Math.min(100, (a.unidades / maximo) * 100)),
      modelos: a.modelos.map((m) => `${m.modelo}: ${entero.format(m.unidades)} uds`).join(' · '),
    }));
  });

  readonly graficoModelos = computed<ChartData<'bar'>>(() => {
    const top = (this.datos()?.topModelos ?? []).slice(0, this.limite('modelos'));
    return {
      labels: top.map((m) => m.modelo),
      datasets: [{ label: 'Reparaciones', data: top.map((m) => m.total), backgroundColor: COLOR_FLUJO.reparacion }],
    };
  });

  readonly graficoMeses = computed<ChartData<'bar'>>(() => {
    const meses = this.datos()?.porMes ?? [];
    return {
      labels: meses.map((m) => etiquetaMes(m.mes)),
      datasets: FLUJOS.map((f) => ({
        label: NOMBRE_FLUJO[f],
        data: meses.map((m) => m[f]),
        backgroundColor: COLOR_FLUJO[f],
      })),
    };
  });

  private readonly diasDelPeriodo = computed(() => {
    const p = this.datos()?.periodo;
    return p ? contarDias(p.desde, p.hasta) : { porDia: Array(7).fill(0), porTramo: Array(5).fill(0) };
  });

  readonly mediasDia = computed(() => {
    const dias = this.datos()?.porDiaSemana ?? [];
    const cuenta = this.diasDelPeriodo().porDia;
    return dias.slice(0, DIAS_ABIERTO).map((d, i) => ({
      etiqueta: capitalizar(d.dia.slice(0, 3)),
      nombre: capitalizar(d.dia),
      total: d.total,
      dias: cuenta[i],
      media: media(d.total, cuenta[i]),
    }));
  });

  readonly mediasTramo = computed(() => {
    const tramos = this.datos()?.porSemanaMes ?? [];
    const cuenta = this.diasDelPeriodo().porTramo;
    return tramos.map((t, i) => ({
      etiqueta: TRAMOS[i] ?? `${t.semana}`,
      total: t.total,
      dias: cuenta[i] ?? 0,
      media: media(t.total, cuenta[i] ?? 0),
    }));
  });

  readonly graficoDias = computed<ChartData<'bar'>>(() => {
    const dias = this.mediasDia();
    return {
      labels: dias.map((d) => d.etiqueta),
      datasets: [{ label: 'Media por día', data: dias.map((d) => d.media), backgroundColor: COLOR_ACENTO }],
    };
  });

  readonly graficoSemanas = computed<ChartData<'bar'>>(() => {
    const tramos = this.mediasTramo();
    return {
      labels: tramos.map((t) => t.etiqueta),
      datasets: [{ label: 'Media por día', data: tramos.map((t) => t.media), backgroundColor: COLOR_ACENTO }],
    };
  });

  readonly opcionesModelos = opcionesHorizontales((i) =>
    (this.datos()?.topModelos[i]?.tipos ?? []).map((t) => `${t.tipo}: ${t.total}`),
  );

  readonly opcionesMesesGrafico = opcionesSeries();
  readonly opcionesTiposAccesorio = opcionesSeries({ horizontal: true });
  readonly opcionesCompraventa = opcionesSeries({ apilado: false });
  readonly opcionesDias = opcionesVerticales(
    (i) => this.mediasDia()[i]?.nombre ?? '',
    (i) => textoMedia(this.mediasDia()[i]),
  );
  readonly opcionesSemanas = opcionesVerticales(
    (i) => `Días ${this.mediasTramo()[i]?.etiqueta ?? ''} de cada mes`,
    (i) => textoMedia(this.mediasTramo()[i]),
  );

  constructor() {
    toObservable(this.peticion)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(({ meses }) =>
          this.api.obtener(meses).pipe(
            catchError(() => {
              this.cargando.set(false);
              this.error.set('No se han podido cargar las estadísticas.');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((d) => {
        this.datos.set(d);
        this.cargando.set(false);
        this.animarCifras(d);
      });

    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
  }

  ver(p: Pestana): boolean {
    const actual = this.pestana();
    return actual === p || actual === 'todo';
  }

  elegir(m: MesesEstadisticas): void {
    if (m === this.meses()) return;
    this.ampliados.set(TOPS_CORTOS);
    this.meses.set(m);
  }

  cambiarPestana(p: Pestana): void {
    if (p === this.pestana()) return;
    this.ampliados.set(TOPS_CORTOS);
    this.pestana.set(p);
  }

  puedeAmpliar(t: Top): boolean {
    return this.listasTop()[t].length > TOP_CORTO[t];
  }

  estaAmpliado(t: Top): boolean {
    return this.ampliados()[t];
  }

  textoTop(t: Top): string {
    if (this.estaAmpliado(t)) return 'Ver menos';
    const total = Math.min(this.listasTop()[t].length, TOP_LARGO);
    return total >= TOP_LARGO ? `Ver top ${TOP_LARGO}` : `Ver todos (${total})`;
  }

  alternarTop(t: Top): void {
    this.ampliados.update((a) => ({ ...a, [t]: !a[t] }));
  }

  private limite(t: Top): number {
    return this.ampliados()[t] ? TOP_LARGO : TOP_CORTO[t];
  }

  reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  private animarCifras(d: Estadisticas): void {
    const { kpis: k, compraventa: cv } = d;
    const destino: Cifras = {
      reparaciones: k.reparaciones,
      ingresos: k.ingresosEstimados,
      ticket: k.ticketMedio,
      dias: k.diasMediosEntrega ?? 0,
      ventas: cv.totales.ventas,
      compras: cv.totales.compras,
      ingresoVentas: cv.totales.ingresoVentas,
      gastoCompras: cv.totales.gastoCompras,
      diasEnvio: d.taller.diasHastaEnvio ?? 0,
    };
    cancelAnimationFrame(this.raf);
    if (this.reducido) {
      this.cifras.set(destino);
      return;
    }
    const origen = this.cifras();
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_CONTADOR);
      const e = 1 - Math.pow(1 - t, 3);
      const siguiente = { ...destino };
      for (const c of CLAVES_CIFRAS) {
        const valor = origen[c] + (destino[c] - origen[c]) * e;
        siguiente[c] = CIFRAS_DECIMALES.includes(c) ? Math.round(valor * 10) / 10 : Math.round(valor);
      }
      this.cifras.set(siguiente);
      if (t < 1) this.raf = requestAnimationFrame(paso);
    };
    this.raf = requestAnimationFrame(paso);
  }
}
