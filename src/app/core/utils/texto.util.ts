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

const COMILLAS = /["“”„]([^"“”„]*)(?:["“”„]|$)/g;
const frasesCompiladas = new Map<string, RegExp>();

export function separarBusqueda(texto: string | null | undefined): { terminos: string[]; frases: string[] } {
  const frases: string[] = [];
  const resto = (texto ?? '').replace(COMILLAS, (_, frase: string) => {
    const f = normalizar(frase).replace(/\s+/g, ' ');
    if (f) frases.push(f);
    return ' ';
  });
  return { terminos: terminosDe(resto), frases };
}

export function casaFrases(indice: string, frases: string[]): boolean {
  return frases.every((f) => {
    let re = frasesCompiladas.get(f);
    if (!re) {
      const patron = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
      re = new RegExp(`(^|[^a-z0-9])${patron}(?=[^a-z0-9]|$)`);
      frasesCompiladas.set(f, re);
    }
    return re.test(indice);
  });
}

export function casaTodos(indice: string, terminos: string[]): boolean {
  return terminos.every((t) => {
    if (indice.includes(t)) return true;
    const d = soloDigitos(t);
    return d.length >= 3 && indice.includes(d);
  });
}