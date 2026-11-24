import { MODELOS, ModeloDef } from './modelos';
import { PREFIJOS, SUFIJOS } from './abreviaturas';
import { casaTodos, normalizar, terminosDe } from '../utils/texto.util';

interface Entrada {
  def: ModeloDef;
  indice: string;
  nombre: string;
  sinMarca: string;
  variantes: string[];
}

const MAX_COMBINACIONES = 64;

let entradas: Entrada[] | null = null;
let porCompacto: Map<string, string> | null = null;
let vocabulario: string[] | null = null;

function compacto(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]/g, '');
}

function quitarMarca(def: ModeloDef): string {
  const prefijo = `${def.marca} `;
  return def.nombre.toLowerCase().startsWith(prefijo.toLowerCase())
    ? def.nombre.slice(prefijo.length)
    : def.nombre;
}

function indexar(): Entrada[] {
  if (entradas) return entradas;
  entradas = MODELOS.map((def) => {
    const nombre = compacto(def.nombre);
    const sinMarca = compacto(quitarMarca(def));
    const texto = normalizar([def.nombre, ...def.variantes].join(' '));
    return { def, nombre, sinMarca, variantes: def.variantes.map(compacto), indice: `${texto} ${nombre} ${sinMarca}` };
  });
  return entradas;
}

function palabrasConocidas(): string[] {
  if (vocabulario) return vocabulario;
  const conjunto = new Set<string>();
  const anadir = (texto: string) => {
    for (const p of terminosDe(texto)) {
      if (p.length >= 4 && /^[a-z]+$/.test(p)) conjunto.add(p);
    }
  };
  for (const m of MODELOS) anadir(m.nombre);
  for (const [abr, expansion] of Object.entries(PREFIJOS)) {
    anadir(abr);
    anadir(expansion);
  }
  vocabulario = [...conjunto];
  return vocabulario;
}

function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + coste);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function correcciones(token: string): string[] {
  if (token.length < 4 || !/^[a-z]+$/.test(token)) return [];
  const max = token.length >= 7 ? 2 : 1;
  return palabrasConocidas().filter((p) => p !== token && distancia(token, p, max) <= max);
}

function casaAlguna(lecturas: string[][]): boolean {
  return indexar().some((e) => lecturas.some((l) => casaTodos(e.indice, l)));
}

function conSufijo(resto: string): string[][] {
  const lecturas: string[][] = [[resto]];
  const m = resto.match(/^(.*\d)([a-z]+)$/);
  if (m && SUFIJOS[m[2]]) lecturas.push([m[1], ...SUFIJOS[m[2]].split(' ')]);
  return lecturas;
}

function lecturasDe(token: string): string[][] {
  const lecturas = conSufijo(token);
  if (SUFIJOS[token]) lecturas.push(SUFIJOS[token].split(' '));
  for (const [abr, expansion] of Object.entries(PREFIJOS)) {
    if (!token.startsWith(abr)) continue;
    const palabras = expansion.split(' ');
    const resto = token.slice(abr.length);
    if (!resto) {
      lecturas.push(palabras);
      continue;
    }
    if (!/\d/.test(resto)) continue;
    for (const r of conSufijo(resto)) lecturas.push([...palabras, ...r]);
  }
  return lecturas;
}

function combinaciones(porToken: string[][][]): string[] {
  let actuales: string[] = [''];
  for (const lecturas of porToken) {
    const siguientes: string[] = [];
    for (const base of actuales) {
      for (const l of lecturas) {
        siguientes.push(base + l.join(''));
        if (siguientes.length >= MAX_COMBINACIONES) break;
      }
      if (siguientes.length >= MAX_COMBINACIONES) break;
    }
    actuales = siguientes;
  }
  return actuales;
}

function rango(e: Entrada, combos: string[]): number {
  if (combos.some((c) => c === e.nombre || c === e.sinMarca || e.variantes.includes(c))) return 0;
  if (combos.some((c) => e.nombre.startsWith(c) || e.sinMarca.startsWith(c))) return 1;
  return 2;
}

export function buscarModelos(texto: string, max = 8): ModeloDef[] {
  const tokens = terminosDe(texto);
  if (tokens.length === 0) return [];
  let corregido = false;
  const porToken = tokens.map((token) => {
    const lecturas = lecturasDe(token);
    if (casaAlguna(lecturas)) return lecturas;
    const alternativas = correcciones(token).flatMap(lecturasDe);
    if (alternativas.length === 0) return lecturas;
    corregido = true;
    return alternativas;
  });
  const combos = combinaciones(porToken);
  const penalizacion = corregido ? 3 : 0;

  return indexar()
    .filter((e) => porToken.every((lecturas) => lecturas.some((l) => casaTodos(e.indice, l))))
    .map((e) => ({ e, r: rango(e, combos) + penalizacion }))
    .sort((a, b) => a.r - b.r || b.e.def.usos - a.e.def.usos || a.e.def.nombre.length - b.e.def.nombre.length)
    .slice(0, max)
    .map((x) => x.e.def);
}

export function nombreExacto(texto: string): string | null {
  if (!porCompacto) {
    porCompacto = new Map(MODELOS.map((m) => [compacto(m.nombre), m.nombre]));
  }
  const c = compacto(texto);
  return c ? porCompacto.get(c) ?? null : null;
}
