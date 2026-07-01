import { Component, OnInit, EventEmitter, Output, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineaService, LineaFiltros } from '../../core/services/linea.service';
import { Linea } from '../../core/models/linea.model';
import { mensajeWhatsapp } from '../../core/estados/estados';

@Component({
  selector: 'app-avisar-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avisar-modal.component.html',
  styleUrl: './avisar-modal.component.scss',
})
export class AvisarModalComponent implements OnInit {
  @Input() filtros: LineaFiltros = {};
  @Output() cerrado = new EventEmitter<boolean>();

  private readonly lineaSvc = inject(LineaService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly lineas = signal<Linea[]>([]);
  readonly marcados = signal<Set<number>>(new Set());
  private huboEnvio = false;

  readonly hechosCount = computed(() =>
    this.lineas().filter((l) => this.estaHecho(l)).length,
  );

  ngOnInit(): void {
    this.lineaSvc.list(this.filtros).subscribe({
      next: (data) => {
        this.lineas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las líneas');
        this.cargando.set(false);
      },
    });
  }

  get titulo(): string {
    return this.filtros.fase === 'no_reparable' ? 'Avisar — No reparables' : 'Avisar — Reparados';
  }

  cerrar(): void {
    this.cerrado.emit(this.huboEnvio);
  }

  avisar(l: Linea): void {
    const tel = this.limpiarTelefono(l.cliente_telefono);
    if (!tel) {
      this.error.set(`L-${l.id} sin teléfono válido`);
      return;
    }
    this.lineaSvc.update(l.id, { fecha_ultimo_aviso: this.fmtEscritura(new Date()) }).subscribe({
      next: (updated) => {
        this.lineas.update((arr) => arr.map((x) => (x.id === l.id ? { ...x, ...updated } : x)));
        this.marcados.update((s) => {
          const n = new Set(s);
          n.add(l.id);
          return n;
        });
        this.huboEnvio = true;
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensajeWhatsapp(l))}`, '_blank');
      },
      error: () => {
        this.error.set(`Error al marcar L-${l.id}`);
      },
    });
  }

  toggleMarcado(l: Linea): void {
    this.marcados.update((s) => {
      const n = new Set(s);
      if (n.has(l.id)) n.delete(l.id);
      else n.add(l.id);
      return n;
    });
  }

  estaHecho(l: Linea): boolean {
    return this.marcados().has(l.id) || this.diasAviso(l) === 0;
  }

  etiquetaAviso(l: Linea): string | null {
    const d = this.diasAviso(l);
    if (d === null) return null;
    if (d === 0) return 'Avisado hoy';
    if (d === 1) return 'Avisado ayer';
    return `Avisado hace ${d}d`;
  }

  private diasAviso(l: Linea): number | null {
    if (!l.fecha_ultimo_aviso) return null;
    const f = new Date(l.fecha_ultimo_aviso.replace(' ', 'T'));
    if (isNaN(f.getTime())) return null;
    const hoy = new Date();
    const f0 = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return Math.round((h0.getTime() - f0.getTime()) / 86400000);
  }

  private limpiarTelefono(tel: string | null): string | null {
    if (!tel) return null;
    let s = tel.replace(/\D/g, '');
    if (!s || s.length < 6) return null;
    if (s.length === 9) s = '34' + s;
    return s;
  }

  private fmtEscritura(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
           `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
}