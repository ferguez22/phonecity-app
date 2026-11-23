import { Component, OnInit, EventEmitter, Output, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineaService } from '../../core/services/linea.service';
import { Linea } from '../../core/models/linea.model';
import { ESTADOS, mensajeWhatsapp } from '../../core/estados/estados';

export type ModoAvisar = 'todos' | 'reparado' | 'no_reparable';

@Component({
  selector: 'app-avisar-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avisar-modal.component.html',
  styleUrl: './avisar-modal.component.scss',
})
export class AvisarModalComponent implements OnInit {
  @Input() modo: ModoAvisar = 'todos';
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
    this.lineaSvc.list({ vista: 'moviles_en_tienda' }).subscribe({
      next: (data) => {
        this.lineas.set(
          data
            .filter((l) => !!l.movil_en_tienda && this.esAvisable(l))
            .sort((a, b) => a.id - b.id),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las líneas');
        this.cargando.set(false);
      },
    });
  }

  private esAvisable(l: Linea): boolean {
    if (this.modo === 'reparado') return l.fase === 'reparado';
    if (this.modo === 'no_reparable') return l.fase === 'no_reparable';
    return l.fase === 'reparado' || l.fase === 'no_reparable';
  }

  get titulo(): string {
    if (this.modo === 'no_reparable') return 'Avisar — No reparables';
    if (this.modo === 'reparado') return 'Avisar — Reparados';
    return 'Avisar — Móviles en tienda';
  }

  colorFila(l: Linea): string {
    const id = l.fase === 'reparado' ? 'reparado_avisado' : 'no_reparable_avisado';
    const base = ESTADOS.find((e) => e.id === id)?.color ?? '#FFFFFF';
    return `color-mix(in srgb, ${base} 30%, #fff)`;
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
    this.lineaSvc.update(l.id, { fecha_ultimo_aviso: this.fmtEscritura(new Date()), avisado: 1 }).subscribe({
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

  etiquetaPrimerAviso(l: Linea): string | null {
    const d = this.diasDesde(l.fecha_primer_aviso);
    if (d === null) return null;
    if (d === 0) return '1er aviso hoy';
    if (d === 1) return '1er aviso ayer';
    return `1er aviso hace ${d}d`;
  }

  private diasAviso(l: Linea): number | null {
    return this.diasDesde(l.fecha_ultimo_aviso);
  }

  private diasDesde(fecha: string | null | undefined): number | null {
    if (!fecha) return null;
    const f = new Date(fecha.replace(' ', 'T'));
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