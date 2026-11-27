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

export interface HistorialDia extends Record<GrupoPedido, number> {
  fecha: string;
}

export interface FilaHistorial {
  descripcion: string;
  cantidad: number;
  ids: number[];
}

export interface HistorialDetalle {
  fecha: string;
  bloques: Record<GrupoPedido, string>;
  filas: Record<GrupoPedido, FilaHistorial[]>;
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

  historialDias(desde?: string, hasta?: string): Observable<HistorialDia[]> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http
      .get<ApiResponse<HistorialDia[]>>(`${this.base}/historial/dias`, { params })
      .pipe(map((r) => r.data));
  }

  historialDia(fecha: string): Observable<HistorialDetalle> {
    return this.http
      .get<ApiResponse<HistorialDetalle>>(`${this.base}/historial/${fecha}`)
      .pipe(map((r) => r.data));
  }
}