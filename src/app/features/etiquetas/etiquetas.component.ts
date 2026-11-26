import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';

import { EtiquetaService } from '../../core/etiquetas/etiqueta.service';
import { AlineacionLinea, LineaEtiqueta, construirEtiquetaLibre } from '../../core/etiquetas/etiqueta.plantillas';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { NombreIcono } from '../../core/layout/icono/iconos';

type TamanoLinea = 'p' | 'm' | 'g' | 'ajustar';
type Interlineado = 'junto' | 'normal' | 'amplio';

interface FormatoLinea {
  negrita: boolean;
  tamano: TamanoLinea;
  alineacion: AlineacionLinea;
}

const FORMATO_DEFECTO: FormatoLinea = { negrita: false, tamano: 'm', alineacion: 'centro' };
const PT_FIJO: Record<Exclude<TamanoLinea, 'ajustar'>, number> = { p: 8, m: 11, g: 15 };
const AJUSTAR_MIN_PT = 5;
const AJUSTAR_MAX_PT = 40;
const INTERLINEADO: Record<Interlineado, number> = { junto: 1, normal: 1.15, amplio: 1.5 };

function reconciliar(antes: string[], ahora: string[], formatos: FormatoLinea[]): FormatoLinea[] {
  const de = (i: number) => formatos[i] ?? FORMATO_DEFECTO;
  let prefijo = 0;
  while (prefijo < antes.length && prefijo < ahora.length && antes[prefijo] === ahora[prefijo]) prefijo++;
  let sufijo = 0;
  while (
    sufijo < antes.length - prefijo &&
    sufijo < ahora.length - prefijo &&
    antes[antes.length - 1 - sufijo] === ahora[ahora.length - 1 - sufijo]
  ) {
    sufijo++;
  }
  const medioAntes = antes.length - prefijo - sufijo;
  const medioAhora = ahora.length - prefijo - sufijo;
  const resultado: FormatoLinea[] = [];
  for (let i = 0; i < prefijo; i++) resultado.push(de(i));
  for (let j = 0; j < medioAhora; j++) resultado.push(j < medioAntes ? de(prefijo + j) : FORMATO_DEFECTO);
  for (let k = sufijo; k > 0; k--) resultado.push(de(antes.length - k));
  return resultado;
}

@Component({
  selector: 'app-etiquetas',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './etiquetas.component.html',
  styleUrl: './etiquetas.component.scss',
})
export class EtiquetasComponent {
  private readonly etiquetaSvc = inject(EtiquetaService);
  private readonly vista = viewChild<ElementRef<HTMLIFrameElement>>('vista');

  readonly tamanos: { valor: TamanoLinea; texto: string; titulo: string }[] = [
    { valor: 'p', texto: 'P', titulo: 'Pequeño · 8 pt' },
    { valor: 'm', texto: 'M', titulo: 'Mediano · 11 pt' },
    { valor: 'g', texto: 'G', titulo: 'Grande · 15 pt' },
    { valor: 'ajustar', texto: 'Ajustar', titulo: 'El mayor tamaño que cabe en el ancho' },
  ];
  readonly alineaciones: { valor: AlineacionLinea; icono: NombreIcono; titulo: string }[] = [
    { valor: 'izquierda', icono: 'alinear-izquierda', titulo: 'Izquierda' },
    { valor: 'centro', icono: 'alinear-centro', titulo: 'Centro' },
    { valor: 'derecha', icono: 'alinear-derecha', titulo: 'Derecha' },
  ];

  readonly interlineados: { valor: Interlineado; texto: string }[] = [
    { valor: 'junto', texto: 'Junto' },
    { valor: 'normal', texto: 'Normal' },
    { valor: 'amplio', texto: 'Amplio' },
  ];

  readonly texto = signal('');
  readonly interlineado = signal<Interlineado>('normal');
  readonly repartir = signal(false);
  readonly formatos = signal<FormatoLinea[]>([FORMATO_DEFECTO]);
  readonly ptAjustados = signal<Map<number, number>>(new Map());
  readonly aviso = signal<string | null>(null);
  readonly imprimiendo = signal(false);
  readonly error = signal<string | null>(null);

  private readonly crudas = computed(() => this.texto().split('\n'));

  readonly lineasEscritas = computed(() => {
    const formatos = this.formatos();
    return this.crudas()
      .map((texto, indice) => ({ indice, texto, formato: formatos[indice] ?? FORMATO_DEFECTO }))
      .filter((l) => l.texto.trim() !== '');
  });

  readonly hayTexto = computed(() => this.lineasEscritas().length > 0);

  private readonly visibles = computed(() => {
    const crudas = this.crudas();
    let inicio = 0;
    let fin = crudas.length;
    while (inicio < fin && crudas[inicio].trim() === '') inicio++;
    while (fin > inicio && crudas[fin - 1].trim() === '') fin--;
    const formatos = this.formatos();
    const out: { indice: number; texto: string; formato: FormatoLinea }[] = [];
    for (let i = inicio; i < fin; i++) {
      const vacia = crudas[i].trim() === '';
      out.push({ indice: i, texto: crudas[i], formato: vacia ? FORMATO_DEFECTO : formatos[i] ?? FORMATO_DEFECTO });
    }
    return out;
  });

  constructor() {
    effect(() => {
      const doc = this.vista()?.nativeElement.contentDocument;
      if (!doc) return;

      const visibles = this.visibles();
      const interlineado = INTERLINEADO[this.interlineado()];
      const repartir = this.repartir();
      const lineas = visibles.map((v) => this.aLineaEtiqueta(v.texto, v.formato, AJUSTAR_MAX_PT));
      doc.open();
      doc.write(construirEtiquetaLibre({ lineas, interlineado, repartir, vista: true }));
      doc.close();

      const caja = doc.querySelector<HTMLElement>('.libre');
      const filas = Array.from(doc.querySelectorAll<HTMLElement>('.linea'));
      const altoUtil = caja ? this.altoUtil(caja) : Infinity;
      const ajustados = new Map<number, number>();
      let algunaNoCabe = false;

      visibles.forEach((v, k) => {
        if (v.formato.tamano !== 'ajustar' || !filas[k]) return;
        const fila = filas[k];
        let bajo = AJUSTAR_MIN_PT * 2;
        let alto = AJUSTAR_MAX_PT * 2;
        while (bajo < alto) {
          const medio = Math.ceil((bajo + alto) / 2);
          fila.style.fontSize = `${medio / 2}pt`;
          if (fila.scrollWidth <= fila.clientWidth + 0.5 && fila.offsetHeight <= altoUtil + 0.5) bajo = medio;
          else alto = medio - 1;
        }
        const pt = bajo / 2;
        fila.style.fontSize = `${pt}pt`;
        if (fila.scrollWidth > fila.clientWidth + 0.5 || fila.offsetHeight > altoUtil + 0.5) algunaNoCabe = true;
        ajustados.set(v.indice, pt);
      });

      this.ptAjustados.set(ajustados);
      const altoLineas = filas.reduce((suma, f) => suma + f.offsetHeight, 0);
      const desborda = altoLineas > altoUtil + 0.5;
      this.aviso.set(desborda || algunaNoCabe ? 'No cabe: se cortará al imprimir.' : null);
    });
  }

  onTexto(valor: string): void {
    const ahora = valor.split('\n');
    this.formatos.set(reconciliar(this.crudas(), ahora, this.formatos()));
    this.texto.set(valor);
    this.error.set(null);
  }

  cambiarFormato(indice: number, cambio: Partial<FormatoLinea>): void {
    this.formatos.update((a) => {
      const n = [...a];
      n[indice] = { ...(n[indice] ?? FORMATO_DEFECTO), ...cambio };
      return n;
    });
  }

  ptDe(indice: number, formato: FormatoLinea): number | null {
    return formato.tamano === 'ajustar' ? this.ptAjustados().get(indice) ?? null : PT_FIJO[formato.tamano];
  }

  async imprimir(): Promise<void> {
    if (!this.hayTexto() || this.imprimiendo()) return;
    this.imprimiendo.set(true);
    this.error.set(null);
    const ajustados = this.ptAjustados();
    const lineas = this.visibles().map((v) =>
      this.aLineaEtiqueta(v.texto, v.formato, ajustados.get(v.indice) ?? PT_FIJO.m),
    );
    const err = await this.etiquetaSvc.imprimirLibre({
      lineas,
      interlineado: INTERLINEADO[this.interlineado()],
      repartir: this.repartir(),
    });
    this.imprimiendo.set(false);
    if (err) this.error.set(err);
  }

  private altoUtil(caja: HTMLElement): number {
    const estilo = getComputedStyle(caja);
    return caja.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  }

  private aLineaEtiqueta(texto: string, formato: FormatoLinea, ptAjustar: number): LineaEtiqueta {
    const ajustar = formato.tamano === 'ajustar';
    return {
      texto,
      negrita: formato.negrita,
      alineacion: formato.alineacion,
      ajustar,
      tamanoPt: ajustar ? ptAjustar : PT_FIJO[formato.tamano as Exclude<TamanoLinea, 'ajustar'>],
    };
  }
}
