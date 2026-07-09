import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models/cliente.model';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent implements OnInit {
  private readonly clienteSvc = inject(ClienteService);

  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly editandoId = signal<number | null>(null);
  readonly edNombre = signal('');
  readonly edTelefono = signal('');
  readonly guardando = signal(false);
  readonly ordenCampo = signal<'nombre' | 'num_lineas' | 'primera_visita'>('nombre');
  readonly ordenAsc = signal(true);

  readonly filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    let lista = this.clientes();
    if (q) {
      lista = lista.filter((c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.includes(q),
      );
    }
    const campo = this.ordenCampo();
    const asc = this.ordenAsc() ? 1 : -1;
    return [...lista].sort((a, b) => {
      if (campo === 'nombre') return a.nombre.localeCompare(b.nombre, 'es') * asc;
      if (campo === 'num_lineas') return ((a.num_lineas ?? 0) - (b.num_lineas ?? 0)) * asc;
      const fa = a.primera_visita ?? '';
      const fb = b.primera_visita ?? '';
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb) * asc;
    });
  });

  readonly total = computed(() => this.filtrados().length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.clienteSvc.list().subscribe({
      next: (data) => { this.clientes.set(data); this.cargando.set(false); },
      error: () => { this.error.set('Error al cargar clientes'); this.cargando.set(false); },
    });
  }

  empezarEdicion(c: Cliente): void {
    this.editandoId.set(c.id);
    this.edNombre.set(c.nombre);
    this.edTelefono.set(c.telefono ?? '');
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  guardarEdicion(c: Cliente): void {
    const nombre = this.edNombre().trim();
    const telefono = this.edTelefono().trim();
    if (!nombre) { this.error.set('El nombre es obligatorio'); return; }
    this.guardando.set(true);
    this.clienteSvc.update(c.id, { nombre, telefono: telefono || null }).subscribe({
      next: (actualizado) => {
        this.clientes.update((lista) =>
          lista.map((x) => (x.id === c.id ? { ...x, ...actualizado } : x)),
        );
        this.guardando.set(false);
        this.cancelarEdicion();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message ?? 'Error al guardar');
      },
    });
  }

  ordenarPor(campo: 'nombre' | 'num_lineas' | 'primera_visita'): void {
    if (this.ordenCampo() === campo) {
      this.ordenAsc.update((v) => !v);
    } else {
      this.ordenCampo.set(campo);
      this.ordenAsc.set(true);
    }
  }

  formatoFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}