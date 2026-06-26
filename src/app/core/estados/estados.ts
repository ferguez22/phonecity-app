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
  esEntrada?: boolean;
  ordenEntrada?: number;
  siguientes: string[];
}

const COLOR_VENTA = '#A2C4C9';
const COLOR_COMPRA = '#76A5AF';
const COLOR_FINALIZADO = '#6AA84F';
const COLOR_TALLER = '#D9D2E9'; 

export const ESTADOS: EstadoDef[] = [
  { id: 'reparar', label: 'Reparar', flujo: 'reparacion', fase: 'por_reparar', avisado: false, movil_en_tienda: true, color: '#B6D7A8',esEntrada: true, ordenEntrada: 1,siguientes: ['pedir_pieza_movil','enviar_taller_infotec', 'enviar_taller_phonestorm', 'reparado_avisado', 'no_reparable_avisado', 'no_reparable_entregado', 'cancelado', 'finalizado'] },
  { id: 'reparado_avisado', label: 'Reparado - Avisado', flujo: 'reparacion', fase: 'reparado', avisado: true, movil_en_tienda: true, color: '#93C47D',siguientes: ['finalizado', 'cancelado'] },
  { id: 'pedir_pieza_movil', label: 'Pedir Pieza Movil en tienda', flujo: 'pieza', fase: 'por_pedir', avisado: false, movil_en_tienda: true, color: '#FFF2CC', esEntrada: true, ordenEntrada: 2, siguientes: ['pieza_pedida_movil', 'cancelado', 'finalizado'] },
  { id: 'pedir_pieza', label: 'Pedir Pieza', flujo: 'pieza', fase: 'por_pedir', avisado: false, movil_en_tienda: false, color: '#FFF2CC', esEntrada: true, ordenEntrada: 3, siguientes: ['pieza_pedida', 'cancelado', 'finalizado'] },
  { id: 'pieza_pedida_movil', label: 'Pieza pedida - Movil en tienda', flujo: 'pieza', fase: 'pedido', avisado: false, movil_en_tienda: true, color: '#FFD966', siguientes: ['pieza_en_tienda', 'cancelado', 'finalizado'] },
  { id: 'pieza_pedida', label: 'Pieza pedida', flujo: 'pieza', fase: 'pedido', avisado: false, movil_en_tienda: false, color: '#FFD966', siguientes: ['pieza_en_tienda', 'cancelado', 'finalizado'] },
  { id: 'pieza_en_tienda', label: 'Pieza en tienda - avisado', flujo: 'pieza', fase: 'en_tienda', avisado: true, movil_en_tienda: false, color: '#F6B26B', siguientes: ['reparar', 'cancelado', 'finalizado'] },
  { id: 'pedir_acc_apokin', label: 'Pedir accesorio APOKIN', flujo: 'accesorio', fase: 'por_pedir', avisado: false, movil_en_tienda: false, proveedor: 'Apokin', color: '#BBD7F0', esEntrada: true, ordenEntrada: 5, siguientes: ['acc_pedido_apokin', 'cancelado', 'finalizado'] },
  { id: 'pedir_acc_wephone', label: 'Pedir accesorio WEPHONE', flujo: 'accesorio', fase: 'por_pedir', avisado: false, movil_en_tienda: false, proveedor: 'Wephone', color: '#9FC5E8', esEntrada: true, ordenEntrada: 4, siguientes: ['acc_pedido_wephone', 'cancelado', 'finalizado'] },
  { id: 'acc_pedido_apokin', label: 'Accesorio Pedido APOKIN', flujo: 'accesorio', fase: 'pedido', avisado: false, movil_en_tienda: false, proveedor: 'Apokin', color: '#9FC5E8', siguientes: ['acc_en_tienda_apokin', 'cancelado', 'finalizado'] },
  { id: 'acc_pedido_wephone', label: 'Accesorio Pedido WEPHONE', flujo: 'accesorio', fase: 'pedido', avisado: false, movil_en_tienda: false, proveedor: 'Wephone', color: '#6FA8DC', siguientes: ['acc_en_tienda_wephone', 'cancelado', 'finalizado'] },
  { id: 'acc_en_tienda_apokin', label: 'Accesorio en tienda Avisado APOKIN', flujo: 'accesorio', fase: 'en_tienda', avisado: true, movil_en_tienda: false, proveedor: 'Apokin', color: '#6FA8DC', siguientes: ['finalizado', 'cancelado'] },
  { id: 'acc_en_tienda_wephone', label: 'Accesorio en tienda Avisado WEPHONE', flujo: 'accesorio', fase: 'en_tienda', avisado: true, movil_en_tienda: false, proveedor: 'Wephone', color: '#4A86C8', siguientes: ['finalizado', 'cancelado'] },
  { id: 'no_reparable_avisado', label: 'No se puede reparar - avisado', flujo: 'reparacion', fase: 'no_reparable', avisado: true, movil_en_tienda: true, color: '#E06666', siguientes: ['no_reparable_entregado', 'finalizado', 'cancelado'] },
  { id: 'no_reparable_entregado', label: 'No se puede Reparar - Entregado', flujo: 'reparacion', fase: 'no_reparable', avisado: true, movil_en_tienda: false, color: '#F4AAAA', siguientes: ['finalizado', 'cancelado'] },
  { id: 'cancelado', label: 'Cancelado', flujo: 'reparacion', fase: 'cancelado', avisado: false, movil_en_tienda: false, color: '#EA9999', siguientes: [] },
  { id: 'compra', label: 'Compra de Dispositivo', flujo: 'venta', fase: 'entregado', avisado: false, movil_en_tienda: false, subtipo: 'compra', color: COLOR_COMPRA, esEntrada: true, ordenEntrada: 7, siguientes: ['cancelado'] },
  { id: 'venta', label: 'Venta de Dispositivo', flujo: 'venta', fase: 'entregado', avisado: false, movil_en_tienda: false, subtipo: 'venta', color: COLOR_VENTA, esEntrada: true, ordenEntrada: 6, siguientes: ['cancelado'] },
  { id: 'enviar_taller_phonestorm', label: 'Enviar a Taller - Phonestorm', flujo: 'reparacion', fase: 'por_enviar_taller', avisado: false, movil_en_tienda: true, taller: 'Phonestorm', color: '#E0DAF0', siguientes: ['enviado_taller_phonestorm', 'cancelado', 'finalizado'] },
  { id: 'enviar_taller_infotec', label: 'Enviar a Taller - Infotec', flujo: 'reparacion', fase: 'por_enviar_taller', avisado: false, movil_en_tienda: true, taller: 'Infotec', color: '#D9D2E9', siguientes: ['enviado_taller_infotec', 'cancelado', 'finalizado'] },
  { id: 'enviado_taller_phonestorm', label: 'Enviado a Taller - Phonestorm', flujo: 'reparacion', fase: 'en_taller', avisado: false, movil_en_tienda: false, taller: 'Phonestorm', color: '#C7BEE3', siguientes: ['reparado_avisado', 'no_reparable_avisado', 'cancelado', 'finalizado'] },
  { id: 'enviado_taller_infotec', label: 'Enviado a Taller - Infotec', flujo: 'reparacion', fase: 'en_taller', avisado: false, movil_en_tienda: false, taller: 'Infotec', color: '#B4A7D6', siguientes: ['reparado_avisado', 'no_reparable_avisado', 'cancelado', 'finalizado'] },
  { id: 'finalizado', label: 'Finalizado', flujo: 'reparacion', fase: 'entregado', avisado: false, movil_en_tienda: false, color: COLOR_FINALIZADO, preservaFlujo: true, siguientes: [] },
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
  if (l.flujo === 'reparacion' && (l.fase === 'por_enviar_taller' || l.fase === 'en_taller')) {
    return COLOR_TALLER;
  }
  return '#FFFFFF';
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

export const ESTADOS_ENTRADA: EstadoDef[] = ESTADOS
  .filter((e) => e.esEntrada)
  .sort((a, b) => (a.ordenEntrada ?? 99) - (b.ordenEntrada ?? 99));

export function estadoActualDef(l: Linea): EstadoDef | null {
  if (l.flujo === 'venta' && l.fase === 'entregado') {
    const id = l.subtipo === 'compra' ? 'compra' : 'venta';
    return ESTADOS.find((e) => e.id === id) ?? null;
  }
  if (l.fase === 'entregado') return ESTADOS.find((e) => e.id === 'finalizado') ?? null;
  return matchEstado(l);
}

export function siguientesDe(l: Linea): EstadoDef[] {
  const actual = estadoActualDef(l);
  if (!actual) return [];
  return actual.siguientes
    .map((id) => ESTADOS.find((e) => e.id === id))
    .filter((e): e is EstadoDef => !!e);
}

const PLANTILLAS_WA: Record<string, (l: Linea) => string> = {
  reparado: (l) =>`Hola ${l.cliente_nombre || ''}! Soy Fernando de PhoneCity. Ya hemos reparado tu ${l.modelo || 'dispositivo'}, puedes pasarte por la tienda a recogerlo cuando quieras!`,
  no_reparable: (l) =>`Hola ${l.cliente_nombre || ''}! Soy Fernando de PhoneCity. Lamentablemente no hemos podido reparar tu ${l.modelo || 'dispositivo'} con problema ${l.problema_o_pieza || ''}, puedes pasarte por la tienda a recogerlo cuando quieras! Esperamos poder ayudarte en otra ocasión!`,
  pieza_en_tienda: (l) =>`Hola ${l.cliente_nombre || ''}! Soy Fernando de PhoneCity. Ya tenemos la ${l.problema_o_pieza || 'pieza'} de tu ${l.modelo || 'dispositivo'}, puedes pasarte por la tienda cuando quieras.`,
  acc_en_tienda: (l) =>`Hola ${l.cliente_nombre || ''}! Soy Fernando de PhoneCity. Ya tenemos el ${l.problema_o_pieza || 'accesorio'} de tu ${l.modelo || 'dispositivo'} en tienda, puedes pasarte por la tienda a recogerlo cuando quieras!`,
};

// Devuelve la clave de plantilla específica si el estado actual la tiene
function claveMensaje(l: Linea): string | null {
  if (l.flujo === 'reparacion' && l.fase === 'reparado') return 'reparado';
  if (l.flujo === 'reparacion' && l.fase === 'no_reparable' && !!l.avisado) return 'no_reparable';
  if (l.flujo === 'pieza' && l.fase === 'en_tienda') return 'pieza_en_tienda';
  if (l.flujo === 'accesorio' && l.fase === 'en_tienda') return 'acc_en_tienda';
  return null;
}

export function tieneMensajeEspecifico(l: Linea): boolean {
  return claveMensaje(l) !== null;
}

export function mensajeWhatsapp(l: Linea): string {
  const clave = claveMensaje(l);
  if (clave) return PLANTILLAS_WA[clave](l);
  return `Hola ${l.cliente_nombre || ''}! Soy Fernando de PhoneCity.`;
}