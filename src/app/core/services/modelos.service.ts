import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CambioModelo, ModeloDistinto } from '../modelos/normalizador';

export interface ResultadoNormalizar {
  lote: number;
  lineas: number;
}

export interface LoteModelos {
  lote: number;
  fecha: string;
  usuario: string | null;
  lineas: number;
  restauradas: number;
  deshecho: boolean;
  deshecho_en: string | null;
}

export interface CambioLote {
  de: string;
  a: string;
  lineas: number;
  restauradas: number;
}

export interface LoteModelosDetalle extends LoteModelos {
  cambios: CambioLote[];
}

export interface ResultadoDeshacer {
  lote: number;
  restauradas: number;
  omitidas: number;
}

@Injectable({ providedIn: 'root' })
export class ModelosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/modelos`;

  distintos(): Observable<ModeloDistinto[]> {
    return this.http
      .get<ApiResponse<ModeloDistinto[]>>(`${this.base}/distintos`)
      .pipe(map((r) => r.data));
  }

  normalizar(cambios: CambioModelo[]): Observable<ResultadoNormalizar> {
    return this.http
      .post<ApiResponse<ResultadoNormalizar>>(`${this.base}/normalizar`, { cambios })
      .pipe(map((r) => r.data));
  }

  lotes(): Observable<LoteModelos[]> {
    return this.http
      .get<ApiResponse<LoteModelos[]>>(`${this.base}/lotes`)
      .pipe(map((r) => r.data));
  }

  lote(id: number): Observable<LoteModelosDetalle> {
    return this.http
      .get<ApiResponse<LoteModelosDetalle>>(`${this.base}/lotes/${id}`)
      .pipe(map((r) => r.data));
  }

  deshacer(id: number): Observable<ResultadoDeshacer> {
    return this.http
      .post<ApiResponse<ResultadoDeshacer>>(`${this.base}/lotes/${id}/deshacer`, {})
      .pipe(map((r) => r.data));
  }
}
