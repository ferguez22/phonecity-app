import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface PedidoPendientes {
  bloques: { wephone: string; apokin: string; piezas: string };
  ids: { wephone: number[]; apokin: number[]; piezas: number[] };
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/pedidos`;

  pendientes(): Observable<PedidoPendientes> {
    return this.http
      .get<ApiResponse<PedidoPendientes>>(`${this.base}/pendientes`)
      .pipe(map((r) => r.data));
  }

  marcarPedido(ids: number[]): Observable<{ actualizadas: number }> {
    return this.http
      .post<ApiResponse<{ actualizadas: number }>>(`${this.base}/marcar-pedido`, { ids })
      .pipe(map((r) => r.data));
  }
}