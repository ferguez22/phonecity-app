export type Flujo = 'reparacion' | 'pieza' | 'accesorio' | 'venta';

export type Fase =
  | 'por_pedir'
  | 'pedido'
  | 'en_tienda'
  | 'por_reparar'
  | 'por_enviar_taller'
  | 'en_taller'
  | 'reparado'
  | 'entregado'
  | 'cancelado'
  | 'no_reparable';

export type TipoCobro = 'normal' | 'garantia' | 'presupuesto_taller';
export type Taller = 'Phonestorm' | 'Infotec';

export interface Linea {
  id: number;
  tienda_id: number;
  flujo: Flujo;
  fase: Fase;
  // OJO: MariaDB devuelve los boolean como 0/1
  avisado: number;
  movil_en_tienda: number;
  modelo: string | null;
  problema_o_pieza: string | null;
  notas: string | null;
  telefono_alternativo: string | null;
  codigo_dispositivo: string | null;
  importe: number | null;
  tipo_cobro: TipoCobro;
  fecha_entrada: string | null;
  fecha_pedido: string | null;
  fecha_recogida_prevista: string | null;
  proveedor_id: number | null;
  taller: Taller | null;
  fecha_envio_taller: string | null;
  fecha_retorno_taller: string | null;
  cliente_id: number | null;
  linea_origen_id: number | null;
  subtipo: 'venta' | 'compra' | null;

  // Campos que llegan del LEFT JOIN con cliente (NULL = TIENDA)
  cliente_nombre: string | null;
  cliente_telefono: string | null;

  // Flag de respuesta al pasar a 'entregado' (borrado RGPD de credenciales)
  credenciales_borradas?: boolean;
}
