import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';

import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models/cliente.model';
import { soloDigitos } from '../../core/utils/texto.util';

@Component({
  selector: 'app-cliente-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-selector.component.html',
  styleUrl: './cliente-selector.component.scss',
})
export class ClienteSelectorComponent {
  @Input() set cliente(c: Cliente | null) {
    this.seleccionado.set(c);
    this.texto.set(c ? c.nombre : '');
    this.resultados.set([]);
    this.modo.set('buscar');
  }

  @Output() clienteChange = new EventEmitter<Cliente | null>();

  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('inputNombre') inputNombre?: ElementRef<HTMLInputElement>;
  @ViewChild('inputTel') inputTel?: ElementRef<HTMLInputElement>;

  private readonly clienteSvc = inject(ClienteService);
  private readonly busq$ = new Subject<string>();

  readonly texto = signal('');
  readonly resultados = signal<Cliente[]>([]);
  readonly buscando = signal(false);
  readonly seleccionado = signal<Cliente | null>(null);
  readonly modo = signal<'buscar' | 'creando'>('buscar');
  readonly activo = signal(0);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflicto = signal<Cliente | null>(null);

  nuevoNombre = '';
  nuevoTel = '';

  readonly puedeCrear = computed(() => this.texto().trim().length >= 2);
  readonly totalFilas = computed(() => this.resultados().length + (this.puedeCrear() ? 1 : 0));
  readonly abierto = computed(
    () => this.modo() === 'buscar' && !this.seleccionado() && this.texto().trim().length >= 2,
  );

  constructor() {
    this.busq$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => this.clienteSvc.buscar(q).pipe(catchError(() => of([] as Cliente[])))),
      )
      .subscribe((res) => {
        this.resultados.set(res);
        this.activo.set(0);
        this.buscando.set(false);
      });
  }

  onTexto(q: string): void {
    this.texto.set(q);
    this.error.set(null);
    this.conflicto.set(null);
    if (this.seleccionado()) {
      this.seleccionado.set(null);
      this.clienteChange.emit(null);
    }
    const limpio = q.trim();
    if (limpio.length >= 2) {
      this.buscando.set(true);
      this.busq$.next(limpio);
    } else {
      this.resultados.set([]);
      this.buscando.set(false);
    }
  }

  onTecla(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.escapar();
      return;
    }
    if (!this.abierto()) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.mover(1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.mover(-1);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.aceptar();
    }
  }

  private mover(delta: number): void {
    const total = this.totalFilas();
    if (total === 0) return;
    this.activo.update((i) => (i + delta + total) % total);
    setTimeout(() => this.verFilaActiva(), 0);
  }

  private verFilaActiva(): void {
    const el = this.host.nativeElement.querySelector(
      `[data-fila="${this.activo()}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }

  esActiva(i: number): boolean {
    return this.activo() === i;
  }

  esCrearActiva(): boolean {
    return this.activo() === this.resultados().length;
  }

  aceptar(): void {
    if (this.buscando()) return;
    const lista = this.resultados();
    const i = this.activo();
    if (i < lista.length) {
      this.seleccionar(lista[i]);
    } else if (this.puedeCrear()) {
      this.abrirCrear();
    }
  }

  seleccionar(c: Cliente): void {
    this.seleccionado.set(c);
    this.texto.set(c.nombre);
    this.resultados.set([]);
    this.modo.set('buscar');
    this.conflicto.set(null);
    this.error.set(null);
    this.clienteChange.emit(c);
  }

  limpiar(): void {
    this.seleccionado.set(null);
    this.texto.set('');
    this.resultados.set([]);
    this.modo.set('buscar');
    this.conflicto.set(null);
    this.error.set(null);
    this.clienteChange.emit(null);
  }

  abrirCrear(): void {
    const crudo = this.texto().trim();
    const digitos = soloDigitos(crudo);
    if (digitos.length >= 6) {
      this.nuevoTel = digitos;
      this.nuevoNombre = crudo.replace(/[\d\s\-.+]/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      this.nuevoTel = '';
      this.nuevoNombre = crudo;
    }
    this.modo.set('creando');
    this.error.set(null);
    this.conflicto.set(null);
    setTimeout(() => {
      const campo = this.nuevoNombre ? this.inputTel : this.inputNombre;
      campo?.nativeElement.focus();
    }, 0);
  }

  escapar(): void {
    if (this.modo() === 'creando') {
      this.modo.set('buscar');
      this.error.set(null);
      this.conflicto.set(null);
      return;
    }
    if (this.seleccionado()) {
      this.limpiar();
      return;
    }
    if (this.texto()) {
      this.texto.set('');
      this.resultados.set([]);
    }
  }

  crear(): void {
    const nombre = this.nuevoNombre.trim();
    const tel = this.nuevoTel.trim();
    if (!nombre) {
      this.error.set('El nombre es obligatorio');
      this.inputNombre?.nativeElement.focus();
      return;
    }
    if (this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);
    this.clienteSvc.crear(nombre, tel).subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.seleccionar(c);
      },
      error: (err) => {
        this.guardando.set(false);
        if (err?.status === 409 && tel) {
          this.buscarConflicto(tel);
          return;
        }
        this.error.set(err?.error?.error?.message ?? 'Error al crear cliente');
      },
    });
  }

  private buscarConflicto(tel: string): void {
    const digitos = soloDigitos(tel);
    this.clienteSvc.buscar(digitos).subscribe({
      next: (res) => {
        const exacto = res.find((c) => soloDigitos(c.telefono ?? '') === digitos);
        if (exacto) {
          this.conflicto.set(exacto);
        } else {
          this.error.set('Ese teléfono ya está registrado en otro cliente');
        }
      },
      error: () => this.error.set('Ese teléfono ya está registrado en otro cliente'),
    });
  }

  usarConflicto(): void {
    const c = this.conflicto();
    if (c) this.seleccionar(c);
  }

  descartarConflicto(): void {
    this.conflicto.set(null);
    this.inputTel?.nativeElement.focus();
  }
}