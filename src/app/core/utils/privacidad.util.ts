import { soloDigitos } from './texto.util';

export function nombreCorto(nombre: string | null | undefined): string | null {
  return nombre?.trim().split(/\s+/)[0] || null;
}

export function telefonoCorto(telefono: string | null | undefined): string | null {
  const digitos = soloDigitos(telefono);
  return digitos ? `··· ${digitos.slice(-3)}` : null;
}
