import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface LineaTaller {
  id: number;
  modelo: string | null;
  problema_o_pieza: string | null;
  taller: string | null;
  fecha_envio: string | null;
  dias: number | null;
}

@Injectable({ providedIn: 'root' })
export class TallerService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/taller`;

  consulta(): Observable<LineaTaller[]> {
    return this.http
      .get<ApiResponse<LineaTaller[]>>(`${this.base}/consulta`)
      .pipe(map((r) => r.data));
  }
}