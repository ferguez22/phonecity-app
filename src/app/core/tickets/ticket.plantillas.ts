import { Linea } from '../models/linea.model';
import { ESTILOS_TICKET } from './ticket.estilos';

export type TipoTicket = 'completo' | 'simple';

const TIENDA = {
  direccion: 'Avenida España 11',
  telefono: '603 378 555',
  horario: ['L-V 10:00-14:00 y 17:00-20:30', 'Sábados 10:00-14:00'],
};

const CONDICIONES = [
  'La recogida del dispositivo se realiza presentando este resguardo. En su defecto, será necesario acreditar identidad y titularidad, pudiendo demorarse la entrega.',
  'No se devolverá el importe de liberaciones o reparaciones si el terminal resulta bloqueado por la operadora.',
  'Los plazos de entrega son orientativos y pueden retrasarse. Una vez solicitadas, las reparaciones no se pueden anular.',
  'El cliente declara ser el propietario legítimo del terminal y autoriza su manipulación, desbloqueo o liberación.',
  'La empresa no se responsabiliza de la pérdida de datos del dispositivo; se recomienda realizar una copia de seguridad. Tampoco se responden por tarjetas SIM, SD o accesorios que no hayan sido retirados.',
  'El dispositivo debe recogerse en un plazo máximo de tres meses desde la fecha del presente documento. Pasado dicho plazo podrá ser desmontado o reciclado para cubrir gastos.',
];

function esc(valor: string | null | undefined): string {
  return (valor ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function precio(importe: number | null): string {
  if (importe === null || importe === undefined) return '-';
  const n = Number(importe);
  if (Number.isNaN(n)) return '-';
  return Number.isInteger(n) ? `${n}€` : `${n.toFixed(2)}€`;
}

function fecha(valor: string | null): string {
  if (!valor) return '-';
  const d = new Date(String(valor).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function construirTicket(linea: Linea, tipo: TipoTicket, barcode: string): string {
  const legales =
    tipo === 'completo'
      ? `<div class="cond-titulo">CONDICIONES DE REPARACIÓN</div>` +
        CONDICIONES.map((p) => `<p class="legal">${p}</p>`).join('')
      : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket-${linea.id}</title>
<style>${ESTILOS_TICKET}</style></head>
<body>
  <div class="titulo-doc">RESGUARDO DE RECOGIDA</div>
  <div class="tienda">📱 PHONE CITY 📱</div>
  <div class="sep"></div>

  ${barcode}
  <div class="pedido">Nº Pedido: ${linea.id}</div>

  <div class="aviso">
    <div class="aviso-titulo">⚠ CONSERVE ESTE RESGUARDO</div>
    <div class="aviso-texto">En su ausencia, acreditar identidad y titularidad con DNI. Puede demorar la entrega del dispositivo.</div>
  </div>

  <div class="sec-titulo">DATOS DEL CLIENTE</div>
  <p class="dato">Cliente: ${esc(linea.cliente_nombre)}</p>
  <p class="dato">Teléfono: ${esc(linea.cliente_telefono)}</p>

  <div class="sec-titulo">DISPOSITIVO</div>
  <p class="dato">Dispositivo: ${esc(linea.modelo)}</p>
  <p class="dato">Problema: ${esc(linea.problema_o_pieza)}</p>
  <p class="dato">Precio: ${precio(linea.importe)}</p>
  <p class="dato">Fecha entrada: ${fecha(linea.fecha_entrada)}</p>

  <div class="gracias">¡Gracias por confiar en nosotros!</div>

  ${legales}

  <div class="sec-titulo">CONTACTO</div>
  <div class="contacto">
    Phone City · ${TIENDA.direccion}<br>
    Tel: ${TIENDA.telefono}<br>
    ${TIENDA.horario.join('<br>')}
  </div>
</body></html>`;
}