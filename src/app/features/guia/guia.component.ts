import { Component, ElementRef, inject, signal } from '@angular/core';

import { ESTADOS, EstadoDef } from '../../core/estados/estados';

type TipoEstado = 'Reparación' | 'Pieza' | 'Accesorio' | 'Taller' | 'Venta' | 'Todos';

const ORDEN_TIPOS: TipoEstado[] = ['Reparación', 'Pieza', 'Accesorio', 'Taller', 'Venta', 'Todos'];

function tipoDe(e: EstadoDef): TipoEstado {
  if (e.preservaFlujo) return 'Todos';
  if (e.taller) return 'Taller';
  if (e.flujo === 'venta') return 'Venta';
  if (e.flujo === 'pieza') return 'Pieza';
  if (e.flujo === 'accesorio') return 'Accesorio';
  return 'Reparación';
}

interface Seccion {
  id: string;
  titulo: string;
}

interface Pantalla {
  titulo: string;
  puntos: string[];
}

const PANTALLAS: Pantalla[] = [
  {
    titulo: 'Tablero',
    puntos: [
      'Filtros de color: Todo, Móviles en tienda, Reparar + Avisado, Piezas, Accesorios, No reparable, Taller y Venta/Compra.',
      '«Ver todos los estados» filtra por un estado concreto.',
      '«Incluir histórico» suma las líneas antiguas en los filtros que lo permiten.',
      'Buscador: palabras en cualquier orden y "frase exacta" entre comillas. Da igual con o sin tildes.',
      'Busca por L-ID, modelo, cliente, teléfono, problema, notas, importe o estado.',
      'Contador de líneas arriba.',
      'Con menos ancho se ocultan columnas. El Estado siempre se ve.',
      'Cliente acortado en pantalla: solo el nombre y las 3 últimas cifras del teléfono. Completos al abrir la línea.',
      'Pedidos y Nueva línea, siempre. Consulta de taller y Avisar clientes, según el filtro.',
    ],
  },
  {
    titulo: 'Detalle de línea',
    puntos: [
      'Estados rápidos: el actual y los siguientes habituales. «Ver todos los estados» muestra el resto.',
      'Tras Reparar no sale Finalizado: primero va Reparado - Avisado.',
      'Varias piezas por línea, cada una con su importe. El total se suma solo.',
      'Recogida prevista y notas internas. Las notas no salen en el ticket.',
      'Historial de estados: fecha, lo que duró cada uno y «hace X días».',
      'Al pasar a un estado con mensaje, ofrece enviar el WhatsApp ya escrito (si hay teléfono).',
      'Botones: Guardar datos, Ticket, Ticket simple, Etiqueta, Etiqueta envío (si va a taller) y WhatsApp.',
    ],
  },
  {
    titulo: 'Nueva línea',
    puntos: [
      'Modelo con autocompletado y abreviaturas: ip 15 pm → iPhone 15 Pro Max, sam → Samsung.',
      'Tolera erratas al escribir el modelo.',
      'Escribir solo la marca lista todos sus modelos.',
      'Categorías especiales: Universal, Material tienda y Otros.',
      'Cliente: búscalo por nombre o teléfono, o crea uno nuevo.',
      'Resumen del cliente: sus líneas, las activas, móviles en tienda e historial con «Ver más».',
      'Si sales sin guardar, pregunta «¿Descartar la línea sin guardar?».',
    ],
  },
  {
    titulo: 'Avisar clientes',
    puntos: [
      'Móviles en tienda reparados o no reparables, con el color de su estado.',
      'Cada uno indica «1er aviso hace X días» y cuándo se avisó por última vez.',
      'WhatsApp en un toque, con el mensaje según el estado.',
      'Al enviarlo queda marcado como avisado. También se puede marcar a mano.',
    ],
  },
  {
    titulo: 'Consulta de taller',
    puntos: [
      'Móviles enviados a taller, agrupados por taller (Infotec, Phonestorm).',
      'Cada uno con su fecha de envío y los días que lleva.',
      '«Copiar» deja el texto listo para mandar la consulta al taller.',
    ],
  },
  {
    titulo: 'Pedidos',
    puntos: [
      'Pendientes por proveedor: Wephone Infotec, Apokin y Piezas.',
      'Lo repetido se junta solo: x2, x3…',
      'Texto editable, con «Copiar» para el WhatsApp del proveedor.',
      '«Marcar como pedido» por proveedor, o «Marcar todo como pedido».',
      'Historial: qué se pidió cada día y de qué líneas.',
    ],
  },
  {
    titulo: 'Tickets y etiquetas',
    puntos: [
      'Ticket completo: cliente, teléfono, dispositivo, problema, precio, fecha de entrada, código de barras del L-ID y fecha de impresión.',
      'Lleva las condiciones de reparación y, si hay piezas, la lista de piezas devueltas.',
      'Ticket simple: los mismos datos, sin condiciones ni piezas.',
      'Etiqueta de dispositivo, para pegar en el móvil: L-ID, tienda, fecha, modelo y problema.',
      'Etiqueta de envío a taller: taller de destino, L-ID, modelo y problema.',
      'Editor de etiquetas libres: negrita, tamaño o «Ajustar» y alineación en cada línea.',
      'Interlineado, «Repartir en alto», vista previa y aviso «No cabe».',
    ],
  },
  {
    titulo: 'Reparaciones',
    puntos: [
      'Temporizador por móvil: cuenta atrás hasta la hora prevista.',
      'Ordenados por urgencia, con color según el tiempo que queda.',
      'Debajo, los móviles por entregar. Al pulsar uno se usa su L-ID.',
    ],
  },
  {
    titulo: 'Clientes',
    puntos: ['Listado completo.', 'Buscador por nombre o teléfono.', 'Edición de cada cliente.'],
  },
  {
    titulo: 'Notas',
    puntos: [
      'Notas internas de la tienda. Escribe y pulsa Enter.',
      'Se marcan como resueltas. «Ver resueltas» las muestra.',
    ],
  },
  {
    titulo: 'Móvil',
    puntos: [
      'Tarjetas agrupadas por día, con el color del estado.',
      'Al tocar una tarjeta se abre la hoja con lo esencial.',
      'Menú del teléfono: Llamar o WhatsApp.',
      'Botón «+» en la cabecera para crear una línea.',
      'Desde el detalle, «‹ Atrás» vuelve a la misma tarjeta.',
      'Instalar como app: Safari → Compartir → «Añadir a pantalla de inicio».',
    ],
  },
  {
    titulo: 'Solo administrador',
    puntos: [
      'Importar: analiza el CSV de una tienda sin cambiar nada. Errores por fila y cómo quedarían los modelos.',
      'Importar de verdad pide escribir una palabra de confirmación.',
      'Limpiar modelos: unifica cómo están escritos, con Deshacer e historial.',
      'Estadísticas: reparaciones, accesorios, compraventa y taller.',
      'Cifras estimadas. Importes ocultos hasta pulsar «Mostrar importes».',
    ],
  },
  {
    titulo: 'Seguridad',
    puntos: [
      'Acceso con usuario y contraseña.',
      'Roles: administrador y resto de usuarios. Las pantallas de admin también se protegen en el servidor.',
      'Datos de cliente acortados en pantalla.',
    ],
  },
];

@Component({
  selector: 'app-guia',
  standalone: true,
  templateUrl: './guia.component.html',
  styleUrl: './guia.component.scss',
})
export class GuiaComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly secciones: Seccion[] = [
    { id: 'que-es', titulo: 'Qué es' },
    { id: 'dia-a-dia', titulo: 'El día a día' },
    { id: 'estados', titulo: 'Estados' },
    { id: 'trucos', titulo: 'Trucos' },
    { id: 'funciones', titulo: 'Funciones' },
  ];

  readonly pantallas = PANTALLAS;

  readonly abiertas = signal<Set<string>>(new Set(['dia-a-dia']));

  readonly estados = ESTADOS.map((e) => ({ ...e, tipo: tipoDe(e) })).sort(
    (a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo),
  );

  estaAbierta(id: string): boolean {
    return this.abiertas().has(id);
  }

  alCambiar(id: string, ev: Event): void {
    const abierta = (ev.target as HTMLDetailsElement).open;
    this.abiertas.update((s) => {
      const n = new Set(s);
      if (abierta) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  ir(id: string): void {
    this.abiertas.update((s) => new Set(s).add(id));
    const el = this.host.nativeElement.querySelector(`#${id}`) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }
}
