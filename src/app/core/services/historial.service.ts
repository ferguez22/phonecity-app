import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface EntradaHistorial {
  id: number;
  linea_id: number;
  fase: string;
  avisado: number;
  movil_en_tienda: number;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly http = inject(HttpClient);

  get(lineaId: number): Observable<EntradaHistorial[]> {
    return this.http
      .get<ApiResponse<EntradaHistorial[]>>(
        `${environment.apiUrl}/lineas/${lineaId}/historial`,
      )
      .pipe(map((r) => r.data));
  }
}
