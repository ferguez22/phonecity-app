export interface Nota {
  id: number;
  tienda_id: number;
  texto: string;
  creado_en: string;
  resuelto: number;
  resuelto_en: string | null;
  cliente_id: number | null;
}