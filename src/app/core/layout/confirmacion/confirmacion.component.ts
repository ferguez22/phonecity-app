import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';

import { VentanaComponent } from '../ventana/ventana.component';
import { ConfirmacionService } from './confirmacion.service';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [VentanaComponent],
  templateUrl: './confirmacion.component.html',
  styleUrl: './confirmacion.component.scss',
})
export class ConfirmacionComponent {
  readonly svc = inject(ConfirmacionService);
  private readonly ventana = viewChild(VentanaComponent);
  private readonly botonCancelar = viewChild<ElementRef<HTMLButtonElement>>('cancelar');
  private eleccion = false;

  constructor() {
    effect(() => {
      this.botonCancelar()?.nativeElement.focus();
    });
  }

  elegir(aceptada: boolean): void {
    this.eleccion = aceptada;
    this.ventana()?.solicitarCierre();
  }

  alCerrar(): void {
    const aceptada = this.eleccion;
    this.eleccion = false;
    this.svc.responder(aceptada);
  }
}
