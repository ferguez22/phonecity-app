import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotaService } from '../../core/services/nota.service';
import { Nota } from '../../core/models/nota.model';

@Component({
  selector: 'app-notas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notas.component.html',
  styleUrl: './notas.component.scss',
  animations: [
    trigger('notaAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)', height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }),
        animate('220ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)', height: '*', paddingTop: '*', paddingBottom: '*', marginBottom: '*' })),
      ]),
      transition(':leave', [
        animate('180ms ease-in',
          style({ opacity: 0, transform: 'translateX(24px)', height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 })),
      ]),
    ]),
    trigger('listaAnim', [
      transition(':enter', [
        style({ opacity: 0, height: 0 }),
        animate('200ms ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, height: 0 })),
      ]),
    ]),
  ],
})
export class NotasComponent implements OnInit {
  private readonly notaSvc = inject(NotaService);

  readonly notas = signal<Nota[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verResueltas = signal(false);
  readonly nuevoTexto = signal('');
  readonly editandoId = signal<number | null>(null);
  readonly textoEdicion = signal('');
  readonly guardando = signal(false);

  readonly pendientes = computed(() => this.notas().filter((n) => !n.resuelto));
  readonly resueltas = computed(() => this.notas().filter((n) => !!n.resuelto));
  readonly resolviendoId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.notaSvc.list(true).subscribe({
      next: (data) => { this.notas.set(data); this.cargando.set(false); },
      error: () => { this.error.set('Error al cargar notas'); this.cargando.set(false); },
    });
  }

  crear(): void {
    const texto = this.nuevoTexto().trim();
    if (!texto || this.guardando()) return;
    this.guardando.set(true);
    this.notaSvc.create(texto).subscribe({
      next: (nota) => {
        this.notas.update((c) => [...c, nota]);
        this.nuevoTexto.set('');
        this.guardando.set(false);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al crear nota');
      },
    });
  }

  toggleResuelto(nota: Nota): void {
    const nuevoValor = !nota.resuelto;
    if (nuevoValor) this.resolviendoId.set(nota.id);
    this.notaSvc.update(nota.id, { resuelto: nuevoValor }).subscribe({
      next: (actualizada) => {
        const aplicar = () => {
          this.notas.update((c) => c.map((n) => (n.id === nota.id ? actualizada : n)));
          this.resolviendoId.set(null);
        };
        if (nuevoValor) setTimeout(aplicar, 350);
        else aplicar();
      },
      error: (err) => {
        this.resolviendoId.set(null);
        this.error.set(err?.error?.error?.message ?? 'Error al actualizar');
      },
    });
  }

  empezarEdicion(nota: Nota): void {
    this.editandoId.set(nota.id);
    this.textoEdicion.set(nota.texto);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.textoEdicion.set('');
  }

  guardarEdicion(nota: Nota): void {
    const texto = this.textoEdicion().trim();
    if (!texto) return;
    if (texto === nota.texto) { this.cancelarEdicion(); return; }
    this.notaSvc.update(nota.id, { texto }).subscribe({
      next: (actualizada) => {
        this.notas.update((c) => c.map((n) => (n.id === nota.id ? actualizada : n)));
        this.cancelarEdicion();
      },
      error: (err) => this.error.set(err?.error?.error?.message ?? 'Error al guardar'),
    });
  }

  toggleVerResueltas(): void {
    this.verResueltas.update((v) => !v);
  }

  formatoFecha(fecha: string): string {
    const d = new Date(fecha.replace(' ', 'T'));
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}