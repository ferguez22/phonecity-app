import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje?: string;
  aceptar: string;
  cancelar: string;
  peligro?: boolean;
}

interface Peticion extends OpcionesConfirmacion {
  resolver: (aceptada: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly peticion = signal<Peticion | null>(null);

  pedir(opciones: OpcionesConfirmacion): Promise<boolean> {
    this.peticion()?.resolver(false);
    return new Promise((resolver) => this.peticion.set({ ...opciones, resolver }));
  }

  responder(aceptada: boolean): void {
    const p = this.peticion();
    if (!p) return;
    this.peticion.set(null);
    p.resolver(aceptada);
  }
}
