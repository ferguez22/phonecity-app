const DIACRITICOS = /[\u0300-\u036f]/g;

export function normalizar(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim();
}