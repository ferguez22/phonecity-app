import { ModeloDef } from './modelos';
import { normalizar } from '../utils/texto.util';

export const MODELOS_ESPECIALES: ModeloDef[] = [
  { nombre: 'Universal', marca: 'Categoría', usos: 0, variantes: [] },
  { nombre: 'Material tienda', marca: 'Categoría', usos: 0, variantes: [] },
  { nombre: 'Otros', marca: 'Categoría', usos: 0, variantes: [] },
];

const clave = (texto: string) => normalizar(texto).replace(/\s+/g, ' ');
const ESPECIALES = new Set(MODELOS_ESPECIALES.map((m) => clave(m.nombre)));

export function esEspecial(nombre: string | null | undefined): boolean {
  return ESPECIALES.has(clave(nombre ?? ''));
}
