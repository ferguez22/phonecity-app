import { Component, DestroyRef, ElementRef, HostListener, Input, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { ModeloDef } from '../../core/modelos/modelos';
import { buscarModelos, nombreExacto } from '../../core/modelos/buscar-modelo';
import { alCambiarVista, altoVisibleDebajo } from '../../core/utils/viewport.util';

@Component({
  selector: 'app-modelo-input',
  standalone: true,
  templateUrl: './modelo-input.component.html',
  styleUrl: './modelo-input.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ModeloInputComponent), multi: true },
  ],
})
export class ModeloInputComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() variante: 'alta' | 'panel' = 'alta';

  @ViewChild('campo', { static: true }) campo!: ElementRef<HTMLInputElement>;

  readonly texto = signal('');
  readonly abierto = signal(false);
  readonly activo = signal(0);
  readonly deshabilitado = signal(false);
  readonly posicion = signal({ top: 0, left: 0, width: 0, alto: 9999 });

  readonly sugerencias = computed(() => buscarModelos(this.texto()));
  readonly visible = computed(() => this.abierto() && this.sugerencias().length > 0);

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};
  private toque: { id: number; x: number; y: number } | null = null;
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    const alPulsarFuera = (e: PointerEvent) => {
      if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) this.abierto.set(false);
    };
    const destroyRef = inject(DestroyRef);
    alCambiarVista(() => this.onReposicionar(), destroyRef);
    document.addEventListener('pointerdown', alPulsarFuera, true);
    destroyRef.onDestroy(() => {
      document.removeEventListener('pointerdown', alPulsarFuera, true);
    });
  }

  writeValue(valor: string | null): void {
    this.texto.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  onInput(valor: string): void {
    this.texto.set(valor);
    this.onChange(valor);
    this.activo.set(0);
    this.abrir();
  }

  onTecla(ev: KeyboardEvent): void {
    if (!this.visible()) {
      if (ev.key === 'ArrowDown' && this.sugerencias().length > 0) {
        ev.preventDefault();
        this.abrir();
      }
      return;
    }
    const total = this.sugerencias().length;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.activo.update((i) => (i + 1) % total);
      this.mostrarActiva();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activo.update((i) => (i - 1 + total) % total);
      this.mostrarActiva();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.elegir(this.sugerencias()[this.activo()]);
    } else if (ev.key === 'Tab') {
      this.elegir(this.sugerencias()[this.activo()]);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      this.abierto.set(false);
    }
  }

  onPulsar(ev: PointerEvent): void {
    if (ev.pointerType === 'mouse') ev.preventDefault();
    this.toque = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
  }

  onSoltar(ev: PointerEvent, modelo: ModeloDef): void {
    const t = this.toque;
    this.toque = null;
    if (!t || t.id !== ev.pointerId) return;
    if (Math.hypot(ev.clientX - t.x, ev.clientY - t.y) > 10) return;
    this.elegir(modelo);
  }

  onCancelar(): void {
    this.toque = null;
  }

  onBlur(): void {
    if (!this.toque) this.abierto.set(false);
    const canonico = nombreExacto(this.texto());
    if (canonico && canonico !== this.texto()) {
      this.texto.set(canonico);
      this.onChange(canonico);
    }
    this.onTouched();
  }

  @HostListener('window:resize')
  onReposicionar(): void {
    if (this.abierto()) this.calcularPosicion();
  }

  private elegir(modelo: ModeloDef | undefined): void {
    if (!modelo) return;
    this.texto.set(modelo.nombre);
    this.onChange(modelo.nombre);
    this.abierto.set(false);
  }

  private mostrarActiva(): void {
    const filas = this.host.nativeElement.querySelectorAll('.mi-fila');
    filas[this.activo()]?.scrollIntoView({ block: 'nearest' });
  }

  private abrir(): void {
    this.calcularPosicion();
    this.abierto.set(true);
  }

  private calcularPosicion(): void {
    const r = this.campo.nativeElement.getBoundingClientRect();
    const top = r.bottom + 4;
    this.posicion.set({ top, left: r.left, width: r.width, alto: altoVisibleDebajo(top) });
  }
}
