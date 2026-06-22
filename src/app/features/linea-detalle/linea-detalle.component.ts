import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { LineaService } from '../../core/services/linea.service';
import { CredencialesService } from '../../core/services/credenciales.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { Linea } from '../../core/models/linea.model';
import { Credenciales } from '../../core/models/credenciales.model';
import { getColor, getEtiqueta } from '../tablero/color.util';

@Component({
  selector: 'app-linea-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './linea-detalle.component.html',
  styleUrl: './linea-detalle.component.scss',
})
export class LineaDetalleComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly lineaSvc  = inject(LineaService);
  private readonly credSvc   = inject(CredencialesService);
  private readonly histSvc   = inject(HistorialService);

  readonly linea       = signal<Linea | null>(null);
  readonly credenciales = signal<Credenciales | null>(null);
  readonly historial   = signal<EntradaHistorial[]>([]);
  readonly cargando    = signal(true);
  readonly error       = signal<string | null>(null);

  getColor    = getColor;
  getEtiqueta = getEtiqueta;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  private cargar(id: number): void {
    this.cargando.set(true);

    // Cargar línea
    this.lineaSvc.getById(id).subscribe({
      next: (l) => {
        this.linea.set(l);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la línea');
        this.cargando.set(false);
      },
    });

    // Cargar credenciales (puede no tener → ignorar 404)
    this.credSvc.get(id).subscribe({
      next: (c) => this.credenciales.set(c),
      error: () => this.credenciales.set(null),
    });

    // Cargar historial
    this.histSvc.get(id).subscribe({
      next: (h) => this.historial.set(h),
      error: () => this.historial.set([]),
    });
  }

  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  etiquetaFase(entrada: EntradaHistorial): string {
    const map: Record<string, string> = {
      por_pedir:          'Pedir',
      pedido:             'Pedido',
      en_tienda:          'En tienda',
      por_reparar:        'Reparando',
      por_enviar_taller:  'Enviar a taller',
      en_taller:          'En taller',
      reparado:           'Reparado',
      entregado:          'Finalizado',
      cancelado:          'Cancelado',
      no_reparable:       'No reparable',
    };
    let label = map[entrada.fase] ?? entrada.fase;
    if (entrada.avisado)         label += ' · Avisado';
    return label;
  }

  volver(): void {
    this.router.navigate(['/tablero']);
  }
}
