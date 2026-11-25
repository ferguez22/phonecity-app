import { Injectable, signal } from '@angular/core';

const MOVIL_MAX = 600;

@Injectable({ providedIn: 'root' })
export class PantallaService {
  private readonly consulta = window.matchMedia(`(max-width: ${MOVIL_MAX}px)`);

  readonly esMovil = signal(this.consulta.matches);

  constructor() {
    this.consulta.addEventListener('change', (e) => this.esMovil.set(e.matches));
  }
}
