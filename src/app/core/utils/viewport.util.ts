import { DestroyRef } from '@angular/core';

export function altoVisibleDebajo(top: number): number {
  const vv = window.visualViewport;
  const fondo = vv ? vv.offsetTop + vv.height : window.innerHeight;
  return Math.max(0, Math.floor(fondo - top - 8));
}

export function alCambiarVista(alCambiar: () => void, destroyRef: DestroyRef): void {
  const vv = window.visualViewport;
  window.addEventListener('scroll', alCambiar, true);
  vv?.addEventListener('resize', alCambiar);
  vv?.addEventListener('scroll', alCambiar);
  destroyRef.onDestroy(() => {
    window.removeEventListener('scroll', alCambiar, true);
    vv?.removeEventListener('resize', alCambiar);
    vv?.removeEventListener('scroll', alCambiar);
  });
}
