import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

import { Linea } from '../models/linea.model';
import { construirTicket, TipoTicket } from './ticket.plantillas';

@Injectable({ providedIn: 'root' })
export class TicketService {
  imprimirCompleto(linea: Linea): string | null {
    return this.imprimir(linea, 'completo');
  }

  imprimirSimple(linea: Linea): string | null {
    return this.imprimir(linea, 'simple');
  }

  private imprimir(linea: Linea, tipo: TipoTicket): string | null {
    const html = construirTicket(linea, tipo, this.barcode(linea.id));

    const win = window.open('', '_blank', 'width=600,height=800');
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

  private barcode(id: number): string {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(id), {
        format: 'CODE128', width: 2, height: 60, displayValue: false, margin: 0,
      });
      return `<div class="barcode-wrap"><img class="barcode" src="${canvas.toDataURL('image/png')}" alt="No ${id}"></div>`;
    } catch {
      return '';
    }
  }
}