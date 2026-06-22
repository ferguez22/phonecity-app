import { Linea, Flujo, Fase } from '../models/linea.model';

export type ProveedorAccesorio = 'Apokin' | 'Wephone';
export type TallerEstado = 'Phonestorm' | 'Infotec';

export interface EstadoDef {
  id: string;
  label: string;
  flujo: Flujo;
  fase: Fase;
  avisado: boolean;
  movil_en_tienda: boolean;
  subtipo?: 'venta' | 'compra' | null;
  proveedor?: ProveedorAccesorio | null;
  taller?: TallerEstado | null;
  color: string;
  preservaFlujo?: boolean;
}

const COLOR_VENTA = '#e9e9e9';
const COLOR_COMPRA = '#e1e1e1';
const COLOR_FINALIZADO = '#6AA84F';

export const ESTADOS: EstadoDef[] = [
  { id: 'reparar', label: 'Reparar', flujo: 'reparacion', fase: 'por_reparar', avisado: false, movil_en_tienda: true, color: '#B6D7A8' },
  { id: 'reparado_avisado', label: 'Reparado - Avisado', flujo: 'reparacion', fase: 'reparado', avisado: true, movil_en_tienda: true, color: '#93C47D' },

  { id: 'pedir_pieza_movil', label: 'Pedir Pieza Movil en tienda', flujo: 'pieza', fase: 'por_pedir', avisado: false, movil_en_tienda: true, color: '#FFF2CC' },
  { id: 'pedir_pieza', label: 'Pedir Pieza', flujo: 'pieza', fase: 'por_pedir', avisado: false, movil_en_tienda: false, color: '#FFF2CC' },
  { id: 'pieza_pedida_movil', label: 'Pieza pedida - Movil en tienda', flujo: 'pieza', fase: 'pedido', avisado: false, movil_en_tienda: true, color: '#FFD966' },
  { id: 'pieza_pedida', label: 'Pieza pedida', flujo: 'pieza', fase: 'pedido', avisado: false, movil_en_tienda: false, color: '#FFD966' },
  { id: 'pieza_en_tienda', label: 'Pieza en tienda - avisado', flujo: 'pieza', fase: 'en_tienda', avisado: true, movil_en_tienda: false, color: '#F6B26B' },

  { id: 'pedir_acc_apokin', label: 'Pedir accesorio APOKIN', flujo: 'accesorio', fase: 'por_pedir', avisado: false, movil_en_tienda: false, proveedor: 'Apokin', color: '#BBD7F0' },
  { id: 'pedir_acc_wephone', label: 'Pedir accesorio WEPHONE', flujo: 'accesorio', fase: 'por_pedir', avisado: false, movil_en_tienda: false, proveedor: 'Wephone', color: '#9FC5E8' },
  { id: 'acc_pedido_apokin', label: 'Accesorio Pedido APOKIN', flujo: 'accesorio', fase: 'pedido', avisado: false, movil_en_tienda: false, proveedor: 'Apokin', color: '#9FC5E8' },
  { id: 'acc_pedido_wephone', label: 'Accesorio Pedido WEPHONE', flujo: 'accesorio', fase: 'pedido', avisado: false, movil_en_tienda: false, proveedor: 'Wephone', color: '#6FA8DC' },
  { id: 'acc_en_tienda_apokin', label: 'Accesorio en tienda Avisado APOKIN', flujo: 'accesorio', fase: 'en_tienda', avisado: true, movil_en_tienda: false, proveedor: 'Apokin', color: '#6FA8DC' },
  { id: 'acc_en_tienda_wephone', label: 'Accesorio en tienda Avisado WEPHONE', flujo: 'accesorio', fase: 'en_tienda', avisado: true, movil_en_tienda: false, proveedor: 'Wephone', color: '#4A86C8' },

  { id: 'no_reparable_avisado', label: 'No se puede reparar - avisado', flujo: 'reparacion', fase: 'no_reparable', avisado: true, movil_en_tienda: true, color: '#E06666' },
  { id: 'no_reparable_entregado', label: 'No se puede Reparar - Entregado', flujo: 'reparacion', fase: 'no_reparable', avisado: true, movil_en_tienda: false, color: '#F4AAAA' },
  { id: 'cancelado', label: 'Cancelado', flujo: 'reparacion', fase: 'cancelado', avisado: false, movil_en_tienda: false, color: '#EA9999' },

  { id: 'compra', label: 'Compra de Dispositivo', flujo: 'venta', fase: 'entregado', avisado: false, movil_en_tienda: false, subtipo: 'compra', color: COLOR_COMPRA },
  { id: 'venta', label: 'Venta de Dispositivo', flujo: 'venta', fase: 'entregado', avisado: false, movil_en_tienda: false, subtipo: 'venta', color: COLOR_VENTA },

  { id: 'enviar_taller_phonestorm', label: 'Enviar a Taller - Phonestorm', flujo: 'reparacion', fase: 'por_enviar_taller', avisado: false, movil_en_tienda: true, taller: 'Phonestorm', color: '#E0DAF0' },
  { id: 'enviar_taller_infotec', label: 'Enviar a Taller - Infotec', flujo: 'reparacion', fase: 'por_enviar_taller', avisado: false, movil_en_tienda: true, taller: 'Infotec', color: '#D9D2E9' },
  { id: 'enviado_taller_phonestorm', label: 'Enviado a Taller - Phonestorm', flujo: 'reparacion', fase: 'en_taller', avisado: false, movil_en_tienda: false, taller: 'Phonestorm', color: '#C7BEE3' },
  { id: 'enviado_taller_infotec', label: 'Enviado a Taller - Infotec', flujo: 'reparacion', fase: 'en_taller', avisado: false, movil_en_tienda: false, taller: 'Infotec', color: '#B4A7D6' },

  { id: 'finalizado', label: 'Finalizado', flujo: 'reparacion', fase: 'entregado', avisado: false, movil_en_tienda: false, color: COLOR_FINALIZADO, preservaFlujo: true },
];

export const ESTADO_OPTIONS = ESTADOS;

function coincide(def: EstadoDef, l: Linea): boolean {
  if (def.flujo !== l.flujo) return false;
  if (def.fase !== l.fase) return false;
  if (def.avisado !== !!l.avisado) return false;
  if (def.movil_en_tienda !== !!l.movil_en_tienda) return false;
  if (def.subtipo != null && def.subtipo !== l.subtipo) return false;
  if (def.proveedor != null && def.proveedor !== l.proveedor_nombre) return false;
  if (def.taller != null && def.taller !== l.taller) return false;
  return true;
}

function matchEstado(l: Linea): EstadoDef | null {
  for (const def of ESTADOS) {
    if (def.preservaFlujo) continue;
    if (coincide(def, l)) return def;
  }
  return null;
}

export function esEstadoActual(def: EstadoDef, l: Linea): boolean {
  if (def.preservaFlujo) return l.fase === 'entregado' && l.flujo !== 'venta';
  return coincide(def, l);
}

function accesorioGenerico(fase: Fase): string {
  if (fase === 'por_pedir') return 'Pedir Accesorio';
  if (fase === 'pedido') return 'Accesorio Pedido';
  if (fase === 'en_tienda') return 'Accesorio en tienda - Avisado';
  return 'Accesorio';
}

function accesorioColor(fase: Fase): string {
  if (fase === 'por_pedir') return '#9FC5E8';
  if (fase === 'pedido') return '#6FA8DC';
  if (fase === 'en_tienda') return '#6FA8DC';
  return '#9FC5E8';
}

export function getEtiqueta(l: Linea): string {
  if (l.flujo === 'venta' && l.fase === 'entregado') {
    return l.subtipo === 'compra' ? 'Compra de Dispositivo' : 'Venta de Dispositivo';
  }
  if (l.fase === 'entregado') return 'Finalizado';
  const def = matchEstado(l);
  if (def) return def.label;
  if (l.flujo === 'accesorio') return accesorioGenerico(l.fase);
  return faseLabelSimple(l.fase);
}

export function getColor(l: Linea): string {
  if (l.flujo === 'venta' && l.fase === 'entregado') {
    return l.subtipo === 'compra' ? COLOR_COMPRA : COLOR_VENTA;
  }
  if (l.fase === 'entregado') return COLOR_FINALIZADO;
  const def = matchEstado(l);
  if (def) return def.color;
  if (l.flujo === 'accesorio') return accesorioColor(l.fase);
  return '#FFFFFF';
}

function faseLabelSimple(fase: Fase): string {
  const m: Record<string, string> = {
    por_reparar: 'Reparar',
    reparado: 'Reparado - Avisado',
    por_enviar_taller: 'Enviar a taller',
    en_taller: 'Enviado a taller',
    no_reparable: 'No se puede reparar',
    cancelado: 'Cancelado',
    por_pedir: 'Pedir',
    pedido: 'Pedido',
    en_tienda: 'En tienda',
    entregado: 'Finalizado',
  };
  return m[fase] ?? fase;
}

export function etiquetaHistorialFase(fase: string, avisado: number, movil: number): string {
  const base: Record<string, string> = {
    por_pedir: 'Pedir',
    pedido: 'Pedido',
    en_tienda: 'En tienda',
    por_reparar: 'Reparando',
    por_enviar_taller: 'Enviar a taller',
    en_taller: 'En taller',
    reparado: 'Reparado - Avisado',
    entregado: 'Finalizado',
    cancelado: 'Cancelado',
    no_reparable: 'No se puede reparar',
  };
  let label = base[fase] ?? fase;
  if (avisado && fase === 'no_reparable') {
    label = movil ? 'No se puede reparar - Avisado' : 'No se puede reparar - Entregado';
  }
  return label;
}
