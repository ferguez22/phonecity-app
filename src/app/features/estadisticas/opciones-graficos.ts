import { ChartOptions, Scale, TooltipItem } from 'chart.js';
import { FlujoEstadisticas } from '../../core/models/estadisticas.model';

export const COLOR_FLUJO: Record<FlujoEstadisticas, string> = {
  reparacion: '#A7D479',
  pieza: '#F3CB63',
  accesorio: '#5FA0E0',
  venta: '#8E8E93',
};

export const NOMBRE_FLUJO: Record<FlujoEstadisticas, string> = {
  reparacion: 'Reparación',
  pieza: 'Pieza',
  accesorio: 'Accesorio',
  venta: 'Venta',
};

export const COLOR_ACENTO = '#0071e3';
export const COLOR_VENTAS = '#1a7f37';
export const COLOR_COMPRAS = '#e8590c';

const MAX_ETIQUETA = 20;
const RADIO_BARRA = 6;

type Opciones = ChartOptions<'bar'>;
type Extra = (indice: number) => string[];

function recortar(texto: string): string {
  return texto.length > MAX_ETIQUETA ? `${texto.slice(0, MAX_ETIQUETA - 1)}…` : texto;
}

const ejeValor = {
  beginAtZero: true,
  border: { display: false },
  grid: { color: 'rgba(0, 0, 0, 0.05)' },
  ticks: { precision: 0 },
};

const ejeCategoria = {
  border: { display: false },
  grid: { display: false },
};

const tooltip = {
  backgroundColor: 'rgba(29, 29, 31, 0.92)',
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
  titleFont: { weight: 600 as const },
};

const base: Opciones = {
  locale: 'es-ES',
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutCubic' },
  elements: { bar: { borderRadius: RADIO_BARRA, borderSkipped: false } },
};

export function opcionesHorizontales(extra: Extra): Opciones {
  return {
    ...base,
    indexAxis: 'y',
    scales: {
      x: ejeValor,
      y: {
        ...ejeCategoria,
        ticks: {
          autoSkip: false,
          callback(this: Scale, valor: string | number) {
            return recortar(String(this.getLabelForValue(Number(valor))));
          },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: { afterBody: (items: TooltipItem<'bar'>[]) => extra(items[0].dataIndex) },
      },
    },
  };
}

export function opcionesVerticales(
  titulo?: (indice: number) => string,
  etiqueta?: (indice: number) => string[],
): Opciones {
  return {
    ...base,
    scales: { x: ejeCategoria, y: { ...ejeValor, ticks: {} } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          ...(titulo && { title: (items: TooltipItem<'bar'>[]) => titulo(items[0].dataIndex) }),
          ...(etiqueta && { label: (item: TooltipItem<'bar'>) => etiqueta(item.dataIndex) }),
        },
      },
    },
  };
}

export function opcionesSeries({ apilado = true, horizontal = false } = {}): Opciones {
  const categoria = {
    ...ejeCategoria,
    stacked: apilado,
    ...(horizontal && {
      ticks: {
        autoSkip: false,
        callback(this: Scale, valor: string | number) {
          return recortar(String(this.getLabelForValue(Number(valor))));
        },
      },
    }),
  };
  const valor = { ...ejeValor, stacked: apilado };
  return {
    ...base,
    indexAxis: horizontal ? 'y' : 'x',
    elements: { bar: { borderRadius: 4, borderSkipped: false } },
    interaction: { mode: 'index', intersect: false },
    scales: horizontal ? { x: valor, y: categoria } : { x: categoria, y: valor },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 16 },
      },
      tooltip: {
        ...tooltip,
        displayColors: true,
        boxPadding: 4,
        callbacks: apilado
          ? {
              footer: (items: TooltipItem<'bar'>[]) =>
                `Total: ${items.reduce((suma, i) => suma + Number(i.raw ?? 0), 0)}`,
            }
          : {},
      },
    },
  };
}
