export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  num_lineas?: number;
  primera_visita?: string | null;
}
