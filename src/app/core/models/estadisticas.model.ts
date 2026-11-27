export type MesesEstadisticas = 3 | 6 | 12;

export type FlujoEstadisticas = 'reparacion' | 'pieza' | 'accesorio' | 'venta';

export interface PeriodoEstadisticas {
  meses: MesesEstadisticas;
  desde: string;
  hasta: string;
  dias: number;
}

export interface KpisEstadisticas {
  reparaciones: number;
  ingresosEstimados: number;
  ticketMedio: number;
  diasMediosEntrega: number | null;
}

export type VariacionKpis = Record<keyof KpisEstadisticas, number | null>;

export interface Olvidados {
  total: number;
  mas60: number;
}

export interface TiempoProveedor {
  wephone: number | null;
  apokin: number | null;
  piezas: number | null;
}

export interface TipoPiezaTotal {
  tipo: string;
  total: number;
}

export interface TopModelo {
  modelo: string;
  total: number;
  tipos: TipoPiezaTotal[];
}

export type MesEstadisticas = Record<FlujoEstadisticas, number> & {
  mes: string;
  total: number;
};

export interface DiaSemanaTotal {
  dia: string;
  total: number;
}

export interface SemanaMesTotal {
  semana: number;
  total: number;
}

export interface ModeloAccesorio {
  modelo: string;
  unidades: number;
}

export interface TopAccesorio {
  articulo: string;
  unidades: number;
  lineas: number;
  modelos: ModeloAccesorio[];
}

export interface AccesorioPorTipo {
  tipo: string;
  wephone: number;
  apokin: number;
  total: number;
}

export interface MesCompraventa {
  mes: string;
  ventas: number;
  compras: number;
}

export interface TotalesCompraventa {
  ventas: number;
  compras: number;
  ingresoVentas: number;
  gastoCompras: number;
}

export interface ModeloTotal {
  modelo: string;
  total: number;
}

export interface Compraventa {
  porMes: MesCompraventa[];
  totales: TotalesCompraventa;
  topVendidos: ModeloTotal[];
  topComprados: ModeloTotal[];
}

export interface ResumenTaller {
  taller: string;
  envios: number;
  diasMedios: number | null;
  reparados: number;
  noReparables: number;
  exito: number | null;
}

export interface EnTallerAhora {
  taller: string;
  total: number;
  mas15: number;
}

export interface TallerEstadisticas {
  porTaller: ResumenTaller[];
  diasHastaEnvio: number | null;
  enTallerAhora: EnTallerAhora[];
}

export interface Recomendacion {
  tipo: 'modelo' | 'accesorio' | 'dia';
  titulo: string;
  texto: string;
}

export interface Estadisticas {
  periodo: PeriodoEstadisticas;
  kpis: KpisEstadisticas;
  kpisAnterior: KpisEstadisticas | null;
  periodoAnterior: {
    desde: string;
    hasta: string;
    desdeEfectivo: string | null;
    diasEfectivos: number;
    fiableDesde: string | null;
  };
  variacion: VariacionKpis | null;
  tasaNoReparable: number | null;
  olvidados: Olvidados;
  tiempoProveedor: TiempoProveedor;
  topModelos: TopModelo[];
  porMes: MesEstadisticas[];
  porDiaSemana: DiaSemanaTotal[];
  porSemanaMes: SemanaMesTotal[];
  topAccesorios: TopAccesorio[];
  accesoriosPorTipo: AccesorioPorTipo[];
  compraventa: Compraventa;
  taller: TallerEstadisticas;
  recomendaciones: Recomendacion[];
  aproximado: boolean;
  nota: string;
}
