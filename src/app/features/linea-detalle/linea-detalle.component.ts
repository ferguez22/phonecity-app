import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LineaService } from '../../core/services/linea.service';
import { HistorialService, EntradaHistorial } from '../../core/services/historial.service';
import { Linea } from '../../core/models/linea.model';
import { getColor, getEtiqueta } from '../tablero/color.util';
import { etiquetaHistorialCompleta } from '../../core/estados/estados';
import { IconoComponent } from '../../core/layout/icono/icono.component';
import { PantallaService } from '../../core/layout/pantalla.service';

@Component({
  selector: 'app-linea-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, IconoComponent],
  templateUrl: './linea-detalle.component.html',
  styleUrl: './linea-detalle.component.scss',
})
  
export class LineaDetalleComponent implements OnInit {
  readonly pantalla = inject(PantallaService);
  private readonly route     = inject(ActivatedRoute);
  private readonly lineaSvc  = inject(LineaService);
  private readonly histSvc   = inject(HistorialService);

  readonly linea       = signal<Linea | null>(null);
  readonly idRuta = Number(this.route.snapshot.paramMap.get('id'));
  readonly historial   = signal<EntradaHistorial[]>([]);
  readonly cargando    = signal(true);
  readonly error       = signal<string | null>(null);

  getColor    = getColor;
  getEtiqueta = getEtiqueta;
  etiquetaHistorial = etiquetaHistorialCompleta;


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

    // Cargar historial
    this.histSvc.get(id).subscribe({
      next: (h) => this.historial.set(h),
      error: () => this.historial.set([]),
    });
  }

  diasDesde(fecha: string): number {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }
}
