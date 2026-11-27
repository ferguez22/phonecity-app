import { CATALOGO, analizarBusqueda, marcaSola, nombreExacto } from './buscar-modelo';

export type EstadoModelo = 'correcto' | 'seguro' | 'dudoso' | 'desconocido' | 'cantidad';

export interface Clasificacion {
  estado: EstadoModelo;
  propuesta?: string;
  candidatos?: string[];
  motivo?: string;
  marca?: string;
}

export interface ModeloDistinto {
  modelo: string;
  lineas: number;
}

export interface CambioModelo {
  de: string;
  a: string;
}

const MAX_CANDIDATOS = 3;
const SUFIJO_CANTIDAD = /\s+x\d+$/i;
const alfabetico = new Intl.Collator('es', { numeric: true, sensitivity: 'base' }).compare;

let canonicos: Set<string> | null = null;
const cache = new Map<string, Clasificacion>();

export function clasificar(modelo: string): Clasificacion {
  const previa = cache.get(modelo);
  if (previa) return previa;
  const resultado = calcular(modelo);
  cache.set(modelo, resultado);
  return resultado;
}

export function limpiarModelo(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

function calcular(modelo: string): Clasificacion {
  const directa = clasificarDirecto(modelo);
  if (directa.estado !== 'desconocido') return directa;
  return conCantidad(modelo) ?? directa;
}

function conCantidad(modelo: string): Clasificacion | null {
  if (!SUFIJO_CANTIDAD.test(modelo)) return null;
  const base = modelo.replace(SUFIJO_CANTIDAD, '');
  const c = clasificarDirecto(base);
  if (c.estado === 'desconocido') return null;
  return { estado: 'cantidad', propuesta: c.propuesta ?? base };
}

function clasificarDirecto(modelo: string): Clasificacion {
  canonicos ??= new Set(CATALOGO.map((m) => m.nombre));
  if (canonicos.has(modelo)) return { estado: 'correcto' };

  const exacto = nombreExacto(modelo);
  if (exacto) return { estado: 'seguro', propuesta: exacto };

  const marca = marcaSola(modelo);
  if (marca) {
    const candidatos = marca.modelos.map((m) => m.nombre).sort(alfabetico);
    return { estado: 'dudoso', motivo: 'Falta el modelo', marca: marca.nombre, candidatos };
  }

  const { resultados, corregido } = analizarBusqueda(modelo, MAX_CANDIDATOS + 1);
  if (resultados.length === 0) return { estado: 'desconocido' };

  const exactos = resultados.filter((r) => r.rango === 0);
  if (!corregido && exactos.length === 1) return { estado: 'seguro', propuesta: exactos[0].def.nombre };

  const candidatos = resultados.slice(0, MAX_CANDIDATOS).map((r) => r.def.nombre);
  return { estado: 'dudoso', propuesta: candidatos[0], candidatos };
}
