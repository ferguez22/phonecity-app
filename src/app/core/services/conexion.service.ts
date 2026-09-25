import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConexionService {
  readonly caida = signal(false);

  marcarCaida(): void {
    this.caida.set(true);
  }

  marcarOk(): void {
    if (this.caida()) this.caida.set(false);
  }

  reintentar(): void {
    location.reload();
  }
}