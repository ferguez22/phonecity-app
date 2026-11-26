import { CanDeactivateFn } from '@angular/router';

export interface ConCambiosPendientes {
  puedeSalir(): boolean | Promise<boolean>;
}

export const sinCambiosGuard: CanDeactivateFn<ConCambiosPendientes> = (componente) => componente.puedeSalir();
