import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type GrupoPedido = 'wephone' | 'apokin' | 'piezas';

export interface PedidoPendientes {
  bloques: Record<GrupoPedido, string>;
  conteos: Record<GrupoPedido, number>;
}

export interface MarcadoResultado {
  grupo: string;
  actualizadas: number;
  detalle: Partial<Record<GrupoPedido, number>>;
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

  marcarPedido(grupo: GrupoPedido | 'todos'): Observable<MarcadoResultado> {
    return this.http
      .post<ApiResponse<MarcadoResultado>>(`${this.base}/marcar-pedido`, { grupo })
      .pipe(map((r) => r.data));
  }
}