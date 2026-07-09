import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Cliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/clientes`;

  buscar(q: string): Observable<Cliente[]> {
    const params = new HttpParams().set('q', q);
    return this.http
      .get<ApiResponse<Cliente[]>>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  crear(nombre: string, telefono: string): Observable<Cliente> {
    return this.http
      .post<ApiResponse<Cliente>>(this.base, { nombre, telefono })
      .pipe(map((r) => r.data));
  }

  list(): Observable<Cliente[]> {
    return this.http
      .get<ApiResponse<Cliente[]>>(this.base)
      .pipe(map((r) => r.data));
  }

  update(id: number, payload: { nombre?: string; telefono?: string | null }): Observable<Cliente> {
    return this.http
      .put<ApiResponse<Cliente>>(`${this.base}/${id}`, payload)
      .pipe(map((r) => r.data));
  }
}
