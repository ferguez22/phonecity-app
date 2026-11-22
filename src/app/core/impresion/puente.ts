export type RolImpresora = 'ticket' | 'etiqueta';

export interface OpcionesImpresion {
  anchoMm?: number;
  altoMm?: number;
}

export interface ResultadoImpresion {
  ok: boolean;
  error?: string;
}

export interface PuenteImpresion {
  imprimir(rol: RolImpresora, html: string, opciones?: OpcionesImpresion): Promise<ResultadoImpresion>;
}

declare global {
  interface Window {
    phonecity?: PuenteImpresion;
  }
}

export function puente(): PuenteImpresion | null {
  return typeof window !== 'undefined' && window.phonecity ? window.phonecity : null;
}