import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Estadisticas, MesesEstadisticas } from '../models/estadisticas.model';

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/estadisticas`;

  obtener(meses: MesesEstadisticas): Observable<Estadisticas> {
    return this.http
      .get<ApiResponse<Estadisticas>>(this.base, { params: { meses } })
      .pipe(map((r) => r.data));
  }
}
