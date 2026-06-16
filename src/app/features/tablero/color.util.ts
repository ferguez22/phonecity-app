import { Linea } from '../../core/models/linea.model';

// Paleta acordada (fase → color)
const COLORES: Record<string, string> = {
  // Flujo pieza
  'pieza-por_pedir':  '#FFF2CC', // amarillo palido
  'pieza-pedido':     '#FFD966', // ambar
  'pieza-en_tienda':  '#F6B26B', // naranja (avisado)
  // Flujo accesorio
  'accesorio-por_pedir': '#9FC5E8', // azul claro
  'accesorio-pedido':    '#6FA8DC', // azul
  'accesorio-en_tienda': '#6FA8DC', // azul (avisado)
  // Flujo reparacion
  'reparacion-por_reparar':       '#B6D7A8', // verde claro
  'reparacion-por_enviar_taller': '#D9D2E9', // lavanda
  'reparacion-en_taller':         '#B4A7D6', // morado
  'reparacion-reparado':          '#93C47D', // verde (avisado)
  // Transversales
  'cancelado':     '#EA9999', // salmon
  'no_reparable':  '#E06666', // rojo
  'entregado':     '#34A853', // verde vivo
};

export function getColor(linea: Linea): string {
  // Prioridad 1: estados terminales
  if (linea.fase === 'entregado')   return COLORES['entregado'];
  if (linea.fase === 'cancelado')   return COLORES['cancelado'];
  if (linea.fase === 'no_reparable') return COLORES['no_reparable'];

  // Prioridad 2: override movil_en_tienda
  if (linea.movil_en_tienda) return '#FFF2CC';

  // Prioridad 3: flujo + fase
  const clave = `${linea.flujo}-${linea.fase}`;
  return COLORES[clave] ?? '#FFFFFF';
}

// Etiqueta legible del estado para mostrar en la tabla
export function getEtiqueta(linea: Linea): string {
  if (linea.fase === 'entregado' && linea.flujo === 'venta') {
    return (linea as any).subtipo === 'compra' ? 'Compra de Dispositivo' : 'Venta de Dispositivo';
  }
  if (linea.fase === 'no_reparable' && linea.avisado) {
    return 'No se puede reparar - Avisado';
  }
  const map: Record<string, string> = {
    por_pedir:         'Pedir pieza',
    pedido:            'Pieza pedida',
    en_tienda:         'Pieza en tienda - Avisado',
    por_reparar:       'Reparar',
    por_enviar_taller: 'Enviar a taller',
    en_taller:         'Enviado a taller',
    reparado:          'Reparado - Avisado',
    entregado:         'Finalizado',
    cancelado:         'Cancelado',
    no_reparable:      'No se puede reparar',
  };
  let label = map[linea.fase] ?? linea.fase;
  if (linea.movil_en_tienda && linea.fase !== 'entregado') label += ' 📱';
  return label;
}
