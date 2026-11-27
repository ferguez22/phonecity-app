import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportService, PreviewData, ExecuteData, Conteo } from './import.service';
import { ESTADOS } from '../../core/estados/estados';
import { normalizar } from '../../core/utils/texto.util';
import { VentanaComponent } from '../../core/layout/ventana/ventana.component';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { RevisionModelosComponent } from '../revision-modelos/revision-modelos.component';
import { CambioModelo } from '../../core/modelos/normalizador';

const PALABRA_CONFIRMACION = 'IMPORTAR';
const COLOR_NEUTRO = '#c7c7cc';

const clave = (texto: string) => normalizar(texto).replace(/[^a-z0-9]/g, '');
const COLORES = new Map(ESTADOS.map((e) => [clave(e.label), e.color]));

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [RouterLink, VentanaComponent, IconoComponent, RevisionModelosComponent],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
})
export class ImportComponent {
  private importService = inject(ImportService);

  readonly palabra = PALABRA_CONFIRMACION;

  file = signal<File | null>(null);
  analizado = signal<File | null>(null);
  preview = signal<PreviewData | null>(null);
  result = signal<ExecuteData | null>(null);
  loading = signal(false);
  ejecutando = signal(false);
  error = signal<string | null>(null);
  dragOver = signal(false);

  cambiosModelos = signal<CambioModelo[]>([]);

  conteo = signal<Conteo | null>(null);
  confirmando = signal(false);
  textoConfirmacion = signal('');

  readonly puedeImportar = computed(
    () => !this.loading() && this.file() !== null && this.analizado() === this.file() && this.preview() !== null,
  );

  readonly puedeEjecutar = computed(
    () => !this.ejecutando() && this.puedeImportar() && this.textoConfirmacion().trim() === PALABRA_CONFIRMACION,
  );

  readonly lineasCambiadas = computed(() => {
    const mapa = new Map((this.preview()?.modelos ?? []).map((m) => [m.modelo, m.lineas]));
    return this.cambiosModelos().reduce((total, c) => total + (mapa.get(c.de) ?? 0), 0);
  });

  readonly estadosReconocidos = computed(() => {
    const p = this.preview();
    if (!p) return [];
    return Object.entries(p.estados.reconocidos)
      .map(([etiqueta, filas]) => ({ etiqueta, filas, color: COLORES.get(clave(etiqueta)) ?? COLOR_NEUTRO }))
      .sort((a, b) => b.filas - a.filas || a.etiqueta.localeCompare(b.etiqueta, 'es'));
  });

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files && input.files.length ? input.files[0] : null;
    this.setFile(f);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const f = event.dataTransfer && event.dataTransfer.files.length ? event.dataTransfer.files[0] : null;
    this.setFile(f);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  doPreview(): void {
    const f = this.file();
    if (!f) return;
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.preview.set(null);
    this.analizado.set(null);
    this.cambiosModelos.set([]);
    this.importService.preview(f).subscribe({
      next: (data) => {
        if (this.file() === f) {
          this.preview.set(data);
          this.analizado.set(f);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.msg(err));
        this.loading.set(false);
      },
    });
  }

  abrirConfirmacion(): void {
    if (!this.puedeImportar()) return;
    this.loading.set(true);
    this.error.set(null);
    this.importService.conteo().subscribe({
      next: (c) => {
        this.conteo.set(c);
        this.textoConfirmacion.set('');
        this.confirmando.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.msg(err));
        this.loading.set(false);
      },
    });
  }

  cerrarConfirmacion(): void {
    if (this.ejecutando()) return;
    this.confirmando.set(false);
    this.textoConfirmacion.set('');
  }

  doExecute(): void {
    const f = this.file();
    if (!f || !this.puedeEjecutar()) return;
    this.ejecutando.set(true);
    this.error.set(null);
    this.importService.execute(f).subscribe({
      next: (data) => {
        this.result.set(data);
        this.preview.set(null);
        this.analizado.set(null);
        this.ejecutando.set(false);
        this.confirmando.set(false);
        this.textoConfirmacion.set('');
      },
      error: (err) => {
        this.error.set(this.msg(err));
        this.ejecutando.set(false);
        this.confirmando.set(false);
      },
    });
  }

  reset(): void {
    this.file.set(null);
    this.analizado.set(null);
    this.preview.set(null);
    this.result.set(null);
    this.error.set(null);
    this.cambiosModelos.set([]);
    this.conteo.set(null);
    this.confirmando.set(false);
    this.textoConfirmacion.set('');
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setFile(f: File | null): void {
    if (f && !f.name.toLowerCase().endsWith('.csv')) {
      this.error.set('El archivo debe ser .csv');
      return;
    }
    this.file.set(f);
    this.analizado.set(null);
    this.cambiosModelos.set([]);
    this.preview.set(null);
    this.result.set(null);
    this.error.set(null);
  }

  private msg(err: unknown): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    if (e && e.error && e.error.error && e.error.error.message) return e.error.error.message;
    if (e && e.message) return e.message;
    return 'Error inesperado en la importación';
  }
}
