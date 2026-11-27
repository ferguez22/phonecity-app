import { Component, WritableSignal, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { marcaSola, nombreExacto } from '../../core/modelos/buscar-modelo';
import { CambioModelo, EstadoModelo, ModeloDistinto, clasificar, limpiarModelo } from '../../core/modelos/normalizador';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { ModeloInputComponent } from '../modelo-input/modelo-input.component';

type EstadoRevisable = Exclude<EstadoModelo, 'correcto'>;

interface Fila {
  modelo: string;
  lineas: number;
  estado: EstadoRevisable;
  candidatos: string[];
  motivo: string | null;
  marca: string | null;
  propuesta: WritableSignal<string>;
  marcado: WritableSignal<boolean>;
}

interface Grupo {
  clave: EstadoRevisable;
  titulo: string;
  filas: Fila[];
}

const GRUPOS: { clave: EstadoRevisable; titulo: string }[] = [
  { clave: 'seguro', titulo: 'Seguros' },
  { clave: 'dudoso', titulo: 'Dudosos' },
  { clave: 'desconocido', titulo: 'Desconocidos' },
  { clave: 'cantidad', titulo: 'Con cantidad en el texto' },
];

const MODELO_MAX = 120;

@Component({
  selector: 'app-revision-modelos',
  standalone: true,
  imports: [FormsModule, IconoComponent, ModeloInputComponent],
  templateUrl: './revision-modelos.component.html',
  styleUrl: './revision-modelos.component.scss',
})
export class RevisionModelosComponent {
  readonly modelos = input.required<ModeloDistinto[]>();
  readonly cambios = output<CambioModelo[]>();

  readonly editando = signal<string | null>(null);
  readonly plegados = signal<ReadonlySet<EstadoRevisable>>(new Set(['cantidad']));

  private readonly editor = viewChild(ModeloInputComponent);
  private abrirSugerencias = false;

  private readonly clasificados = computed(() =>
    this.modelos()
      .map((m) => ({ ...m, c: clasificar(m.modelo) }))
      .sort((a, b) => b.lineas - a.lineas || a.modelo.localeCompare(b.modelo, 'es')),
  );

  readonly correctos = computed(() => this.clasificados().filter((m) => m.c.estado === 'correcto').length);

  readonly filas = computed<Fila[]>(() =>
    this.clasificados()
      .filter((m) => m.c.estado !== 'correcto')
      .map((m) => ({
        modelo: m.modelo,
        lineas: m.lineas,
        estado: m.c.estado as EstadoRevisable,
        candidatos: m.c.candidatos ?? [],
        motivo: m.c.motivo ?? null,
        marca: m.c.marca ?? null,
        propuesta: signal(m.c.propuesta ?? ''),
        marcado: signal(m.c.estado === 'seguro'),
      })),
  );

  readonly grupos = computed<Grupo[]>(() =>
    GRUPOS.map((g) => ({ ...g, filas: this.filas().filter((f) => f.estado === g.clave) })),
  );

  readonly desconocidos = computed(() => this.filas().filter((f) => f.estado === 'desconocido'));

  private readonly conflictos = computed(() => {
    const marcados = new Set(this.filas().filter((f) => f.marcado()).map((f) => f.modelo));
    return new Set(
      this.filas()
        .filter((f) => f.marcado() && marcados.has(limpiarModelo(f.propuesta())))
        .map((f) => f.modelo),
    );
  });

  readonly seleccion = computed<CambioModelo[]>(() =>
    this.filas()
      .filter((f) => f.estado !== 'cantidad' && f.marcado() && this.avisoDe(f) === null)
      .map((f) => ({ de: f.modelo, a: limpiarModelo(f.propuesta()) })),
  );

  constructor() {
    effect(() => this.cambios.emit(this.seleccion()));
    effect(() => {
      const editor = this.editor();
      if (!editor) return;
      editor.campo.nativeElement.focus();
      if (this.abrirSugerencias) editor.abrir();
      this.abrirSugerencias = false;
    });
  }

  avisoDe(f: Fila): string | null {
    if (!f.marcado()) return null;
    const a = limpiarModelo(f.propuesta());
    if (!a) return 'Sin propuesta';
    if (a === f.modelo) return 'Igual que el original';
    if (marcaSola(a)) return 'Falta el modelo';
    if ([...a].length > MODELO_MAX) return `Máximo ${MODELO_MAX} caracteres`;
    if (this.conflictos().has(f.modelo)) return 'El destino también se va a cambiar';
    return null;
  }

  marcadosDe(g: Grupo): number {
    return g.filas.filter((f) => f.marcado()).length;
  }

  alternarGrupo(g: Grupo): void {
    const todos = g.filas.length > 0 && this.marcadosDe(g) === g.filas.length;
    for (const f of g.filas) f.marcado.set(!todos);
  }

  alternarPlegado(clave: EstadoRevisable): void {
    this.plegados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  }

  abrirEdicion(f: Fila): void {
    this.cerrarEdicion();
    if (f.marca && !limpiarModelo(f.propuesta())) {
      f.propuesta.set(`${f.marca} `);
      this.abrirSugerencias = true;
    }
    this.editando.set(f.modelo);
  }

  cerrarEdicion(): void {
    const modelo = this.editando();
    if (modelo === null) return;
    const f = this.filas().find((x) => x.modelo === modelo);
    if (f) {
      const canonico = nombreExacto(f.propuesta());
      if (canonico) f.propuesta.set(canonico);
      else if (f.marca && marcaSola(f.propuesta())) f.propuesta.set('');
    }
    this.editando.set(null);
  }

  editar(f: Fila, valor: string): void {
    f.propuesta.set(valor);
    if (limpiarModelo(valor)) f.marcado.set(true);
  }

  elegirCandidato(f: Fila, valor: string): void {
    f.propuesta.set(valor);
    f.marcado.set(true);
  }

  exportarDesconocidos(): void {
    const filas = this.desconocidos();
    if (filas.length === 0) return;
    const lineas = ['modelo,lineas', ...filas.map((f) => `"${f.modelo.replace(/"/g, '""')}",${f.lineas}`)];
    const blob = new Blob(['﻿' + lineas.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelos-desconocidos-${this.hoy()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private hoy(): string {
    const d = new Date();
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
  }
}
