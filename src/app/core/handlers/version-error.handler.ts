import { ErrorHandler, Injectable } from '@angular/core';

const MARCA = 'phonecity_recarga_version';
const ESPERA_MS = 60_000;

const PATRONES = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'chunkloaderror',
  'loading chunk',
];

@Injectable()
export class VersionErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (this.esErrorDeCarga(error) && this.puedeRecargar()) {
      sessionStorage.setItem(MARCA, String(Date.now()));
      location.reload();
      return;
    }
    console.error(error);
  }

  private esErrorDeCarga(error: unknown): boolean {
    const err = error as { message?: string; name?: string } | null;
    const texto = `${err?.name ?? ''} ${err?.message ?? ''}`.toLowerCase();
    if (!texto.trim()) return false;
    return PATRONES.some((p) => texto.includes(p));
  }

  private puedeRecargar(): boolean {
    const previo = Number(sessionStorage.getItem(MARCA) ?? 0);
    return Date.now() - previo > ESPERA_MS;
  }
}