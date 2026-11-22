import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

import { Linea, Pieza } from '../models/linea.model';
import { construirTicket, TipoTicket } from './ticket.plantillas';
import { puente } from '../impresion/puente';

@Injectable({ providedIn: 'root' })
export class TicketService {
  imprimirCompleto(linea: Linea, piezas: Pieza[] = []): Promise<string | null> {
    return this.imprimir(linea, 'completo', piezas);
  }

  imprimirSimple(linea: Linea): Promise<string | null> {
    return this.imprimir(linea, 'simple');
  }

  private async imprimir(linea: Linea, tipo: TipoTicket, piezas: Pieza[] = []): Promise<string | null> {
    const html = construirTicket(linea, tipo, this.barcode(linea.id), piezas);

    const p = puente();
    if (p) {
      try {
        const r = await p.imprimir('ticket', html);
        return r.ok ? null : (r.error ?? 'No se pudo imprimir el ticket');
      } catch {
        return 'No se pudo imprimir el ticket';
      }
    }

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