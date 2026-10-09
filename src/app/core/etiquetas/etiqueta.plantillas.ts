import { Linea } from '../models/linea.model';
import { ESTILOS_ETIQUETA } from './etiqueta.estilos';

export type TipoEtiqueta = 'dispositivo' | 'envio';

const CODIGO_POSTAL = '24400';
const TIENDA_ID = '319';

function esc(valor: string | null | undefined): string {
  return (valor ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hoy(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

function cuerpoDispositivo(linea: Linea): string {
  return `
  <div class="banda">
    <span class="principal">L-${linea.id}</span>
    <span class="lateral">
      <span class="tienda">${TIENDA_ID}</span>
      <span class="fecha">${hoy()}</span>
    </span>
  </div>
  <div class="cuerpo">
    <div class="modelo">${esc(linea.modelo)}</div>
    <div class="problema tres">${esc(linea.problema_o_pieza)}</div>
  </div>`;
}

function cuerpoEnvio(linea: Linea): string {
  return `
  <div class="banda">
    <span class="principal">${CODIGO_POSTAL}</span>
    <span class="destino">${esc(linea.taller).toUpperCase()}</span>
  </div>
  <div class="cuerpo">
    <div class="fila">
      <span class="lid-medio">L-${linea.id}</span>
      <span class="meta">${TIENDA_ID} · ${hoy()}</span>
    </div>
    <div class="modelo">${esc(linea.modelo)}</div>
    <div class="problema">${esc(linea.problema_o_pieza)}</div>
  </div>`;
}

export function construirEtiqueta(linea: Linea, tipo: TipoEtiqueta): string {
  const cuerpo = tipo === 'envio' ? cuerpoEnvio(linea) : cuerpoDispositivo(linea);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Etiqueta-${linea.id}</title>
<style>${ESTILOS_ETIQUETA}</style></head>
<body>${cuerpo}</body></html>`;
}