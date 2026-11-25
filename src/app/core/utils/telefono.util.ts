export function limpiarTelefono(tel: string | null): string | null {
  if (!tel) return null;
  let s = tel.replace(/\D/g, '');
  if (!s || s.length < 6) return null;
  if (s.length === 9) s = '34' + s;
  return s;
}
