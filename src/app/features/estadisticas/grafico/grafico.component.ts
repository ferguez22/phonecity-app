import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, untracked, viewChild } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6e6e73';

type Datos = ChartData<'bar'>;
type Opciones = ChartOptions<'bar'>;

function copiar(datos: Datos): Datos {
  return {
    labels: [...(datos.labels ?? [])],
    datasets: datos.datasets.map((d) => ({ ...d, data: [...d.data] })),
  };
}

@Component({
  selector: 'app-grafico',
  standalone: true,
  template: `
    <div class="lienzo" [style.height.px]="alto()">
      <canvas #lienzo role="img" [attr.aria-label]="etiqueta()"></canvas>
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .lienzo { position: relative; width: 100%; }
  `,
})
export class GraficoComponent implements OnDestroy {
  readonly datos = input.required<Datos>();
  readonly opciones = input.required<Opciones>();
  readonly alto = input(260);
  readonly etiqueta = input('');

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private chart?: Chart<'bar'>;
  private opcionesAplicadas?: Opciones;

  constructor() {
    afterNextRender(() => {
      const opciones = untracked(this.opciones);
      this.opcionesAplicadas = opciones;
      this.chart = new Chart(this.lienzo().nativeElement, {
        type: 'bar',
        data: copiar(untracked(this.datos)),
        options: this.conMovimiento(opciones),
      });
    });

    effect(() => {
      const datos = this.datos();
      const opciones = this.opciones();
      if (this.chart) untracked(() => this.actualizar(datos, opciones));
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private actualizar(datos: Datos, opciones: Opciones): void {
    const chart = this.chart!;
    const nuevos = copiar(datos);
    chart.data.labels = nuevos.labels;
    nuevos.datasets.forEach((ds, i) => {
      const actual = chart.data.datasets[i];
      if (actual) Object.assign(actual, ds);
      else chart.data.datasets.push(ds);
    });
    chart.data.datasets.splice(nuevos.datasets.length);
    if (opciones !== this.opcionesAplicadas) {
      this.opcionesAplicadas = opciones;
      chart.options = this.conMovimiento(opciones);
    }
    chart.update();
  }

  private conMovimiento(opciones: Opciones): Opciones {
    return this.reducido ? { ...opciones, animation: false } : opciones;
  }
}
