import { Injectable } from '@angular/core';

import { Linea } from '../models/linea.model';
import { construirEtiqueta, TipoEtiqueta } from './etiqueta.plantillas';
import { ANCHO_MM, ALTO_MM } from './etiqueta.estilos';
import { puente } from '../impresion/puente';

@Injectable({ providedIn: 'root' })
export class EtiquetaService {
  imprimirDispositivo(linea: Linea): Promise<string | null> {
    return this.imprimir(linea, 'dispositivo');
  }

  async imprimirEnvio(linea: Linea): Promise<string | null> {
    if (!linea.taller) return 'Esta línea no tiene taller asignado';
    return this.imprimir(linea, 'envio');
  }

  private async imprimir(linea: Linea, tipo: TipoEtiqueta): Promise<string | null> {
    const html = construirEtiqueta(linea, tipo);

    const p = puente();
    if (p) {
      try {
        const r = await p.imprimir('etiqueta', html, { anchoMm: ANCHO_MM, altoMm: ALTO_MM });
        return r.ok ? null : (r.error ?? 'No se pudo imprimir la etiqueta');
      } catch {
        return 'No se pudo imprimir la etiqueta';
      }
    }

    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) return 'Bloqueado por el navegador. Permite las ventanas emergentes.';

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      setTimeout(() => { try { win.close(); } catch {} }, 500);
    }, 300);

    return null;
  }
}