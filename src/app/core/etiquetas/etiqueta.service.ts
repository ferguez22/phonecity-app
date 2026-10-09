import { Injectable } from '@angular/core';

import { Linea } from '../models/linea.model';
import { construirEtiqueta, TipoEtiqueta } from './etiqueta.plantillas';

@Injectable({ providedIn: 'root' })
export class EtiquetaService {
  imprimirDispositivo(linea: Linea): string | null {
    return this.imprimir(linea, 'dispositivo');
  }

  imprimirEnvio(linea: Linea): string | null {
    if (!linea.taller) return 'Esta línea no tiene taller asignado';
    return this.imprimir(linea, 'envio');
  }

  private imprimir(linea: Linea, tipo: TipoEtiqueta): string | null {
    const html = construirEtiqueta(linea, tipo);

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