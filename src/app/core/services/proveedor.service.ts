import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Proveedor { id: number; nombre: string; }

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);

  list(): Observable<Proveedor[]> {
    return this.http
      .get<ApiResponse<Proveedor[]>>(`${environment.apiUrl}/proveedores`)
      .pipe(map((r) => r.data));
  }
}
