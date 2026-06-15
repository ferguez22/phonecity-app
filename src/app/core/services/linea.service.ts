import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Linea } from '../models/linea.model';

export interface LineaFiltros {
  fase?: string;
  flujo?: string;
  avisado?: boolean;
  movil_en_tienda?: boolean;
  orderBy?: 'fecha_entrada' | 'dias_reparacion' | 'id';
  order?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class LineaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/lineas`;

  list(filtros: LineaFiltros = {}): Observable<Linea[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null) {
        params = params.set(k, String(v));
      }
    }
    return this.http
      .get<ApiResponse<Linea[]>>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  getById(id: number): Observable<Linea> {
    return this.http
      .get<ApiResponse<Linea>>(`${this.base}/${id}`)
      .pipe(map((r) => r.data));
  }
}
