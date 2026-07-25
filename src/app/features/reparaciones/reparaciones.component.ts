import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LineaService, LineaPayload } from '../../core/services/linea.service';
import { Linea } from '../../core/models/linea.model';
import { getEtiqueta, estadoActualDef } from '../../core/estados/estados';

interface TimerCard {
  linea: Linea;
  restanteMs: number;
  vencido: boolean;
  texto: string;
  color: string;
  estadoId: string;
  estadoLabel: string;
  estadoColor: string;
}

interface Confirmacion {
  linea: Linea;
  objetivo: string;
  objetivoLabel: string;
  estadoLabel: string;
  yaTieneTimer: boolean;
  fueraDeTimer: boolean;
}

const ESTADOS_TIMER = ['reparar', 'pedir_pieza_movil', 'pieza_pedida_movil'];
const ESTADO_TIMER_LABEL: Record<string, string> = {
  reparar: 'Reparar',
  pedir_pieza_movil: 'Pedir pieza',
  pieza_pedida_movil: 'Pieza pedida',
};

@Component({
  selector: 'app-reparaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reparaciones.component.html',
  styleUrl: './reparaciones.component.scss',
})
  
export class ReparacionesComponent implements OnInit, OnDestroy {
  private readonly lineaSvc = inject(LineaService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly now = signal(Date.now());
  readonly lineas = signal<Linea[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly confirmacionQuitar = signal<Linea | null>(null);
  readonly filtroEstado = signal<string | null>(null);
  readonly mostrarFechaManual = signal(false);
  readonly panelVisible = signal(true);
  readonly getEtiqueta = getEtiqueta;


  nuevoLineaId: string = '';
  fechaManual = '';
  

  private readonly PARADAS: { min: number; rgb: [number, number, number] }[] = [
    { min: 480, rgb: [184, 230, 184] },
    { min: 120, rgb: [205, 234, 168] },
    { min: 60,  rgb: [230, 239, 163] },
    { min: 45,  rgb: [242, 237, 160] },
    { min: 30,  rgb: [247, 224, 163] },
    { min: 20,  rgb: [248, 207, 160] },
    { min: 10,  rgb: [248, 188, 160] },
    { min: 5,   rgb: [245, 169, 160] },
    { min: 0,   rgb: [240, 138, 138] },
  ];

    private parseFecha(s: string): Date {
    return new Date(s.replace(' ', 'T'));
  }

  private fmtEscritura(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
           `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  private fmtLegible(objetivo: string): string {
    const d = this.parseFecha(objetivo);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  fmtFechaCard(s: string | null): string {
    if (!s) return '';
    const d = this.parseFecha(s);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private formatRestante(ms: number): string {
    const signo = ms < 0 ? '+' : '';
    let s = Math.floor(Math.abs(ms) / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600);  s %= 3600;
    const m = Math.floor(s / 60);    s %= 60;
    let cuerpo: string;
    if (d > 0) cuerpo = `${d}d ${h}h ${m}m`;
    else if (h > 0) cuerpo = `${h}h ${m}m`;
    else cuerpo = `${m}m ${s}s`;
    return signo + cuerpo;
  }

  private colorPara(min: number): string {
    const P = this.PARADAS;
    if (min >= P[0].min) return this.rgbStr(P[0].rgb);
    if (min <= P[P.length - 1].min) return this.rgbStr(P[P.length - 1].rgb);
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i];
      const b = P[i + 1];
      if (min <= a.min && min >= b.min) {
        const t = (min - b.min) / (a.min - b.min);
        return this.rgbStr([
          Math.round(b.rgb[0] + (a.rgb[0] - b.rgb[0]) * t),
          Math.round(b.rgb[1] + (a.rgb[1] - b.rgb[1]) * t),
          Math.round(b.rgb[2] + (a.rgb[2] - b.rgb[2]) * t),
        ]);
      }
    }
    return this.rgbStr(P[P.length - 1].rgb);
  }

  private rgbStr(rgb: [number, number, number]): string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  private esEstadoTimer(l: Linea): boolean {
    const def = estadoActualDef(l);
    return !!def && ESTADOS_TIMER.includes(def.id);
  }

  private abrirConfirmacion(objetivo: string): void {
    const id = Number(this.nuevoLineaId);
    if (!id || id < 1) {
      this.error.set('Indica un número de línea válido');
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.lineaSvc.getById(id).subscribe({
      next: (linea) => {
        this.guardando.set(false);
        this.confirmacion.set({
          linea,
          objetivo,
          objetivoLabel: this.fmtLegible(objetivo),
          estadoLabel: getEtiqueta(linea),
          yaTieneTimer: !!linea.fecha_recogida_prevista,
          fueraDeTimer: !this.esEstadoTimer(linea),
        });
      },
      error: () => {
        this.guardando.set(false);
        this.error.set(`La línea ${id} no existe`);
      },
    });
  }

  readonly cards = computed<TimerCard[]>(() => {
    const ahora = this.now();
    return this.lineas()
      .filter((l) => l.fecha_recogida_prevista)
      .map((l) => {
        const objetivo = this.parseFecha(l.fecha_recogida_prevista as string).getTime();
        const restanteMs = objetivo - ahora;
        const def = estadoActualDef(l);
        const estadoId = def?.id ?? '';
        return {
          linea: l,
          restanteMs,
          vencido: restanteMs <= 0,
          texto: this.formatRestante(restanteMs),
          color: this.colorPara(restanteMs / 60000),
          estadoId,
          estadoLabel: ESTADO_TIMER_LABEL[estadoId] ?? getEtiqueta(l),
          estadoColor: def?.color ?? '#ccc',
        };
      })
      .sort((a, b) => a.restanteMs - b.restanteMs);
  });

  readonly cardsFiltradas = computed<TimerCard[]>(() => {
    const f = this.filtroEstado();
    const cs = this.cards();
    return f ? cs.filter((c) => c.estadoId === f) : cs;
  });

  readonly estadosPresentes = computed(() => {
    const vistos = new Map<string, { id: string; label: string; color: string }>();
    for (const c of this.cards()) {
      if (!vistos.has(c.estadoId)) {
        vistos.set(c.estadoId, { id: c.estadoId, label: c.estadoLabel, color: c.estadoColor });
      }
    }
    return [...vistos.values()];
  });

  ngOnInit(): void {
    this.cargar();
    this.intervalId = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.lineaSvc.list({ movil_en_tienda: true }).subscribe({
      next: (data) => {
        this.lineas.set(data.filter((l) => this.esEstadoTimer(l)));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los temporizadores');
        this.cargando.set(false);
      },
    });
  }

  togglePanel(): void {
    this.panelVisible.update((v) => !v);
  }

  toggleFechaManual(): void {
    this.mostrarFechaManual.update((v) => !v);
  }

  toggleFiltroEstado(id: string): void {
    this.filtroEstado.update((f) => (f === id ? null : id));
  }

  onLineaIdInput(v: string): void {
    this.nuevoLineaId = (v ?? '').replace(/\D/g, '');
  }

  seleccionarLineaPanel(linea: Linea): void {
    this.nuevoLineaId = String(linea.id);
    this.error.set(null);
  }

  esSeleccionada(id: number): boolean {
    return this.nuevoLineaId === String(id);
  }

  seleccionarTiempo(minutos: number): void {
    const objetivo = this.fmtEscritura(new Date(Date.now() + minutos * 60000));
    this.abrirConfirmacion(objetivo);
  }

  seleccionarFechaManual(): void {
    if (!this.fechaManual) {
      this.error.set('Selecciona una fecha y hora');
      return;
    }
    const objetivo = this.fmtEscritura(new Date(this.fechaManual));
    this.abrirConfirmacion(objetivo);
  }

  confirmarInicio(): void {
    const c = this.confirmacion();
    if (!c) return;
    const payload: LineaPayload = {
      fecha_recogida_prevista: c.objetivo,
    };
    this.guardando.set(true);
    this.lineaSvc.update(c.linea.id, payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.confirmacion.set(null);
        this.nuevoLineaId = '';
        this.fechaManual = '';
        this.mostrarFechaManual.set(false);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al iniciar la reparación');
      },
    });
  }

  cancelarInicio(): void {
    this.confirmacion.set(null);
  }

  pedirQuitarTimer(linea: Linea): void {
    this.confirmacionQuitar.set(linea);
  }

  cancelarQuitar(): void {
    this.confirmacionQuitar.set(null);
  }

  confirmarQuitarTimer(): void {
    const linea = this.confirmacionQuitar();
    if (!linea) return;
    this.guardando.set(true);
    this.lineaSvc.update(linea.id, { fecha_recogida_prevista: null }).subscribe({
      next: (updated) => {
        this.lineas.update((c) => c.map((l) => (l.id === linea.id ? { ...l, ...updated } : l)));
        this.confirmacionQuitar.set(null);
        this.guardando.set(false);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al quitar el temporizador');
      },
    });
  }


}