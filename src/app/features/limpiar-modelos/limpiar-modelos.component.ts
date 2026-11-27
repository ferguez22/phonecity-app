import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CambioModelo, ModeloDistinto } from '../../core/modelos/normalizador';
import { LoteModelos, LoteModelosDetalle, ModelosService } from '../../core/services/modelos.service';
import { ConfirmacionService } from '../../core/layout/confirmacion/confirmacion.service';
import { VentanaComponent } from '../../core/layout/ventana/ventana.component';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { RevisionModelosComponent } from '../revision-modelos/revision-modelos.component';

type Pestana = 'revisar' | 'historial';

interface Aviso {
  texto: string;
  lote?: number;
}

const CAMBIOS_MAX = 500;
const DURACION_AVISO = 10000;

@Component({
  selector: 'app-limpiar-modelos',
  standalone: true,
  imports: [RevisionModelosComponent, VentanaComponent, IconoComponent],
  templateUrl: './limpiar-modelos.component.html',
  styleUrl: './limpiar-modelos.component.scss',
})
export class LimpiarModelosComponent {
  private readonly api = inject(ModelosService);
  private readonly confirmacion = inject(ConfirmacionService);

  readonly maximo = CAMBIOS_MAX;
  readonly pestana = signal<Pestana>('revisar');

  readonly distintos = signal<ModeloDistinto[] | null>(null);
  readonly seleccion = signal<CambioModelo[]>([]);
  readonly aplicando = signal(false);

  readonly lotes = signal<LoteModelos[] | null>(null);
  readonly loteAbierto = signal<LoteModelosDetalle | null>(null);
  readonly cargandoLote = signal<number | null>(null);
  readonly deshaciendo = signal(false);

  readonly error = signal<string | null>(null);
  readonly aviso = signal<Aviso | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  private readonly lineasPorModelo = computed(
    () => new Map((this.distintos() ?? []).map((m) => [m.modelo, m.lineas])),
  );

  readonly totalLineas = computed(() => {
    const mapa = this.lineasPorModelo();
    return this.seleccion().reduce((total, c) => total + (mapa.get(c.de) ?? 0), 0);
  });

  readonly puedeAplicar = computed(
    () => !this.aplicando() && this.seleccion().length > 0 && this.seleccion().length <= CAMBIOS_MAX,
  );

  constructor() {
    this.cargarDistintos();
    this.cargarLotes();
    inject(DestroyRef).onDestroy(() => this.limpiarTemporizador());
  }

  async aplicar(): Promise<void> {
    if (!this.puedeAplicar()) return;
    const cambios = this.seleccion();
    const lineas = this.totalLineas();
    const ok = await this.confirmacion.pedir({
      titulo: 'Aplicar cambios de modelo',
      mensaje: `Se cambiará el modelo de ${lineas} ${lineas === 1 ? 'línea' : 'líneas'} (${cambios.length} ${cambios.length === 1 ? 'modelo' : 'modelos'}). Se puede deshacer desde Historial.`,
      aceptar: 'Aplicar',
      cancelar: 'Cancelar',
    });
    if (!ok) return;

    this.aplicando.set(true);
    this.error.set(null);
    try {
      const r = await firstValueFrom(this.api.normalizar(cambios));
      this.mostrarAviso({ texto: `Lote ${r.lote} · ${r.lineas} ${r.lineas === 1 ? 'línea' : 'líneas'}`, lote: r.lote });
      this.recargar();
    } catch (e) {
      this.error.set(this.mensajeDe(e, 'No se pudieron aplicar los cambios'));
    } finally {
      this.aplicando.set(false);
    }
  }

  async deshacerDesdeAviso(): Promise<void> {
    const lote = this.aviso()?.lote;
    if (!lote) return;
    this.cerrarAviso();
    await this.deshacer(lote);
  }

  async abrirLote(lote: LoteModelos): Promise<void> {
    if (this.cargandoLote() !== null) return;
    this.cargandoLote.set(lote.lote);
    this.error.set(null);
    try {
      this.loteAbierto.set(await firstValueFrom(this.api.lote(lote.lote)));
    } catch (e) {
      this.error.set(this.mensajeDe(e, `No se pudo abrir el lote ${lote.lote}`));
    } finally {
      this.cargandoLote.set(null);
    }
  }

  cerrarLote(): void {
    this.loteAbierto.set(null);
  }

  async deshacerLoteAbierto(): Promise<void> {
    const lote = this.loteAbierto();
    if (!lote || lote.deshecho || this.deshaciendo()) return;
    const ok = await this.confirmacion.pedir({
      titulo: `Deshacer lote ${lote.lote}`,
      mensaje: `Se devolverá su modelo anterior a ${lote.lineas} ${lote.lineas === 1 ? 'línea' : 'líneas'}. Las que se hayan cambiado después no se tocan.`,
      aceptar: 'Deshacer',
      cancelar: 'Cancelar',
      peligro: true,
    });
    if (!ok) return;
    if (await this.deshacer(lote.lote)) this.cerrarLote();
  }

  cerrarAviso(): void {
    this.limpiarTemporizador();
    this.aviso.set(null);
  }

  fecha(valor: string | null): string {
    if (!valor) return '';
    const [dia, hora = ''] = valor.split('T');
    const [a, m, d] = dia.split('-');
    return `${d}/${m}/${a} ${hora.slice(0, 5)}`.trim();
  }

  estadoDe(l: LoteModelos): string {
    if (!l.deshecho) return 'Activo';
    if (l.restauradas < l.lineas) return `Deshecho · ${l.restauradas} de ${l.lineas} restauradas`;
    return 'Deshecho';
  }

  private async deshacer(lote: number): Promise<boolean> {
    this.deshaciendo.set(true);
    this.error.set(null);
    try {
      const r = await firstValueFrom(this.api.deshacer(lote));
      const omitidas = r.omitidas > 0 ? ` · ${r.omitidas} omitidas (cambiadas después)` : '';
      this.mostrarAviso({ texto: `Lote ${lote} deshecho · ${r.restauradas} restauradas${omitidas}` });
      this.recargar();
      return true;
    } catch (e) {
      this.error.set(this.mensajeDe(e, `No se pudo deshacer el lote ${lote}`));
      return false;
    } finally {
      this.deshaciendo.set(false);
    }
  }

  private recargar(): void {
    this.cargarDistintos();
    this.cargarLotes();
  }

  private cargarDistintos(): void {
    this.api.distintos().subscribe({
      next: (d) => this.distintos.set(d),
      error: (e) => this.error.set(this.mensajeDe(e, 'No se pudieron cargar los modelos')),
    });
  }

  private cargarLotes(): void {
    this.api.lotes().subscribe({
      next: (l) => this.lotes.set(l),
      error: (e) => this.error.set(this.mensajeDe(e, 'No se pudo cargar el historial')),
    });
  }

  private mostrarAviso(aviso: Aviso): void {
    this.limpiarTemporizador();
    this.aviso.set(aviso);
    this.temporizador = setTimeout(() => this.aviso.set(null), DURACION_AVISO);
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private mensajeDe(e: unknown, porDefecto: string): string {
    const mensaje = e instanceof HttpErrorResponse ? e.error?.error?.message : null;
    return typeof mensaje === 'string' && mensaje ? mensaje : porDefecto;
  }
}
