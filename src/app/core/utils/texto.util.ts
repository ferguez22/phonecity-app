const DIACRITICOS = /[\u0300-\u036f]/g;

export function soloDigitos(texto: string | null | undefined): string {
  if (!texto) return '';
  return String(texto).replace(/\D/g, '');
}

export function normalizar(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim();
}

export function terminosDe(texto: string | null | undefined): string[] {
  return normalizar(texto).split(/\s+/).filter(Boolean);
}

export function casaTodos(indice: string, terminos: string[]): boolean {
  return terminos.every((t) => {
    if (indice.includes(t)) return true;
    const d = soloDigitos(t);
    return d.length >= 3 && indice.includes(d);
  });
}