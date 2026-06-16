import { Linea } from '../../core/models/linea.model';

const COLORES: Record<string, string> = {
  'pieza-por_pedir':               '#FFF2CC',
  'pieza-pedido':                  '#FFD966',
  'pieza-en_tienda':               '#F6B26B',
  'accesorio-por_pedir':           '#9FC5E8',
  'accesorio-pedido':              '#6FA8DC',
  'accesorio-en_tienda':           '#6FA8DC',
  'reparacion-por_reparar':        '#B6D7A8',
  'reparacion-por_enviar_taller':  '#D9D2E9',
  'reparacion-en_taller':          '#B4A7D6',
  'reparacion-reparado':           '#93C47D',
  'cancelado':                     '#EA9999',
  'no_reparable':                  '#E06666',
  'no_reparable-entregado':        '#F4AAAA',
  'entregado':                     '#34A853',
};

export function getColor(linea: Linea): string {
  if (linea.fase === 'entregado')    return COLORES['entregado'];
  if (linea.fase === 'cancelado') return COLORES['cancelado'];
  if (linea.fase === 'no_reparable') return COLORES[linea.avisado ? 'no_reparable-entregado' : 'no_reparable'];
  if (linea.movil_en_tienda) return '#FFF2CC';
  return COLORES[`${linea.flujo}-${linea.fase}`] ?? '#FFFFFF';
}

export function getEtiqueta(linea: Linea): string {
  if (linea.flujo === 'venta' && linea.fase === 'entregado') {
    return linea.subtipo === 'compra' ? 'Compra de Dispositivo' : 'Venta de Dispositivo';
  }
  if (linea.fase === 'no_reparable' && linea.avisado) {
    return 'No se puede reparar - Entregado';
  }

  const compuesto: Record<string, string> = {
    'pieza-por_pedir':     'Pedir pieza',
    'pieza-pedido':        'Pieza pedida',
    'pieza-en_tienda':     'Pieza en tienda - Avisado',
    'accesorio-por_pedir': 'Pedir Accesorio',
    'accesorio-pedido':    'Accesorio Pedido',
    'accesorio-en_tienda': 'Accesorio en tienda - Avisado',
  };

  const clave = `${linea.flujo}-${linea.fase}`;
  if (compuesto[clave]) {
    return linea.movil_en_tienda ? compuesto[clave] + ' - Móvil en tienda' : compuesto[clave];
  }

  const simple: Record<string, string> = {
    por_reparar:       'Reparar',
    por_enviar_taller: 'Enviar a taller',
    en_taller:         'Enviado a taller',
    reparado:          'Reparado - Avisado',
    entregado:         'Finalizado',
    cancelado:         'Cancelado',
    no_reparable:      'No se puede reparar',
  };

  const label = simple[linea.fase] ?? linea.fase;
  return linea.movil_en_tienda && linea.fase !== 'entregado' ? label + ' - Móvil en tienda' : label;
}