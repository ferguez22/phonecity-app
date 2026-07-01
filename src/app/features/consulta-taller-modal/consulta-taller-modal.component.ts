import { Component, OnInit, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TallerService, LineaTaller } from '../../core/services/taller.service';

interface BloqueTaller {
  taller: string;
  count: number;
  texto: string;
}

@Component({
  selector: 'app-consulta-taller-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consulta-taller-modal.component.html',
  styleUrl: './consulta-taller-modal.component.scss',
})
export class ConsultaTallerModalComponent implements OnInit {
  @Output() cerrado = new EventEmitter<void>();

  private readonly tallerSvc = inject(TallerService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly bloques = signal<BloqueTaller[]>([]);
  readonly copiado = signal<string | null>(null);

  ngOnInit(): void {
    this.tallerSvc.consulta().subscribe({
      next: (lineas) => {
        this.bloques.set(this.construirBloques(lineas));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la consulta de taller');
        this.cargando.set(false);
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  async copiar(bloque: BloqueTaller): Promise<void> {
    try {
      await navigator.clipboard.writeText(bloque.texto);
      this.copiado.set(bloque.taller);
      setTimeout(() => {
        if (this.copiado() === bloque.taller) this.copiado.set(null);
      }, 2000);
    } catch {
      this.error.set('No se pudo copiar al portapapeles');
    }
  }

  private construirBloques(lineas: LineaTaller[]): BloqueTaller[] {
    const hoy = this.fechaHoy();
    const grupos = new Map<string, LineaTaller[]>();
    for (const l of lineas) {
      const t = l.taller || 'Sin taller';
      if (!grupos.has(t)) grupos.set(t, []);
      grupos.get(t)!.push(l);
    }

    const bloques: BloqueTaller[] = [];
    for (const [taller, ls] of grupos) {
      const cuerpo = ls.map((l) => this.formatoLinea(l)).join('\n');
      const texto = `Consulta de Taller ${hoy}\n\n${cuerpo}`;
      bloques.push({ taller, count: ls.length, texto });
    }
    return bloques;
  }

  private formatoLinea(l: LineaTaller): string {
    const desc = [l.modelo, l.problema_o_pieza].filter((x) => x && x.trim());
    const envio = l.fecha_envio ? `Enviado ${l.fecha_envio}` : 'Enviado ?';
    const dias = l.dias != null ? `${l.dias}d` : null;
    const tail = [envio, dias].filter(Boolean).join(' - ');
    const middle = [...desc, tail].join(' - ');
    return `* L-${l.id} ${middle}`;
  }

  private fechaHoy(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
  }
}