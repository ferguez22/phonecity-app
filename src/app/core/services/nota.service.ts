import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Nota } from '../models/nota.model';

@Injectable({ providedIn: 'root' })
export class NotaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notas`;

  list(incluirResueltas = false): Observable<Nota[]> {
    let params = new HttpParams();
    if (incluirResueltas) params = params.set('incluir_resueltas', 'true');
    return this.http
      .get<ApiResponse<Nota[]>>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  create(texto: string): Observable<Nota> {
    return this.http
      .post<ApiResponse<Nota>>(this.base, { texto })
      .pipe(map((r) => r.data));
  }

  update(id: number, payload: { texto?: string; resuelto?: boolean }): Observable<Nota> {
    return this.http
      .put<ApiResponse<Nota>>(`${this.base}/${id}`, payload)
      .pipe(map((r) => r.data));
  }
}