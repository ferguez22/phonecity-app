import { Injectable, signal } from '@angular/core';

export type DivisorModo = 'todos' | 'solo_todo' | 'off';

const CLAVE_DIVISOR = 'phonecity_divisor_modo';

function leerDivisorModo(): DivisorModo {
  try {
    const v = localStorage.getItem(CLAVE_DIVISOR);
    if (v === 'todos' || v === 'solo_todo' || v === 'off') return v;
  } catch {}
  return 'solo_todo';
}

@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly _divisorModo = signal<DivisorModo>(leerDivisorModo());
  readonly divisorModo = this._divisorModo.asReadonly();

  setDivisorModo(modo: DivisorModo): void {
    this._divisorModo.set(modo);
    try {
      localStorage.setItem(CLAVE_DIVISOR, modo);
    } catch {}
  }
}
