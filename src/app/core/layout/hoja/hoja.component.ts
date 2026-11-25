import { Component, DestroyRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

import { IconoComponent } from '../icono/icono.component';

const UMBRAL_CIERRE_PX = 100;
const UMBRAL_VELOCIDAD = 0.5;
const DURACION_MS = 250;

@Component({
  selector: 'app-hoja',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './hoja.component.html',
  styleUrl: './hoja.component.scss',
})
export class HojaComponent {
  readonly etiqueta = input('');
  readonly cerrar = output<void>();

  readonly saliendo = signal(false);
  readonly desplazamiento = signal(0);
  readonly arrastrando = signal(false);

  readonly transformacion = computed(() => {
    if (this.saliendo()) return 'translateY(100%)';
    const dy = this.desplazamiento();
    return dy > 0 ? `translateY(${dy}px)` : null;
  });

  private inicioY = 0;
  private ultimoY = 0;
  private ultimoT = 0;
  private velocidad = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizador) clearTimeout(this.temporizador);
    });
  }

  solicitarCierre(): void {
    if (this.saliendo()) return;
    this.arrastrando.set(false);
    this.saliendo.set(true);
    this.temporizador = setTimeout(() => this.cerrar.emit(), DURACION_MS);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.solicitarCierre();
  }

  onPointerDown(e: PointerEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, textarea, select')) return;
    this.inicioY = e.clientY;
    this.ultimoY = e.clientY;
    this.ultimoT = e.timeStamp;
    this.velocidad = 0;
    this.arrastrando.set(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.arrastrando()) return;
    const dt = e.timeStamp - this.ultimoT;
    if (dt > 0) this.velocidad = (e.clientY - this.ultimoY) / dt;
    this.ultimoY = e.clientY;
    this.ultimoT = e.timeStamp;
    this.desplazamiento.set(Math.max(0, e.clientY - this.inicioY));
  }

  onPointerUp(): void {
    if (!this.arrastrando()) return;
    this.arrastrando.set(false);
    if (this.desplazamiento() > UMBRAL_CIERRE_PX || this.velocidad > UMBRAL_VELOCIDAD) {
      this.solicitarCierre();
    } else {
      this.desplazamiento.set(0);
    }
  }
}
