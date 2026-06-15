import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Credenciales } from '../models/credenciales.model';

@Injectable({ providedIn: 'root' })
export class CredencialesService {
  private readonly http = inject(HttpClient);

  get(lineaId: number): Observable<Credenciales> {
    return this.http
      .get<ApiResponse<Credenciales>>(
        `${environment.apiUrl}/lineas/${lineaId}/credenciales`,
      )
      .pipe(map((r) => r.data));
  }
}
