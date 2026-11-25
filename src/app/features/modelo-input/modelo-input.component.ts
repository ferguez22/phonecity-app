import { Component, DestroyRef, ElementRef, HostListener, Input, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { ModeloDef } from '../../core/modelos/modelos';
import { buscarModelos, nombreExacto } from '../../core/modelos/buscar-modelo';

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
  readonly posicion = signal({ top: 0, left: 0, width: 0 });

  readonly sugerencias = computed(() => buscarModelos(this.texto()));
  readonly visible = computed(() => this.abierto() && this.sugerencias().length > 0);

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    const alScroll = () => this.onReposicionar();
    window.addEventListener('scroll', alScroll, true);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', alScroll, true));
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
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activo.update((i) => (i - 1 + total) % total);
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

  onPulsar(ev: PointerEvent, modelo: ModeloDef): void {
    ev.preventDefault();
    this.elegir(modelo);
  }

  onBlur(): void {
    this.abierto.set(false);
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

  private abrir(): void {
    this.calcularPosicion();
    this.abierto.set(true);
  }

  private calcularPosicion(): void {
    const r = this.campo.nativeElement.getBoundingClientRect();
    this.posicion.set({ top: r.bottom + 4, left: r.left, width: r.width });
  }
}
