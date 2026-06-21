import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImportStats {
  ok: number;
  separador: number;
  fallback: number;
  vacia: number;
  err: number;
}

export interface PreviewData {
  stats: ImportStats;
  fallbackLog: string[];
}

export interface ExecuteData extends PreviewData {
  maxId: number;
  nextAutoIncrement: number;
  backup: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: { message: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/import/csv`;

  preview(file: File): Observable<PreviewData> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http
      .post<ApiEnvelope<PreviewData>>(`${this.base}/preview`, fd)
      .pipe(map((r) => this.unwrap(r)));
  }

  execute(file: File): Observable<ExecuteData> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http
      .post<ApiEnvelope<ExecuteData>>(`${this.base}/execute`, fd)
      .pipe(map((r) => this.unwrap(r)));
  }

  private unwrap<T>(r: ApiEnvelope<T>): T {
    if (!r.success) {
      throw new Error(r.error ? r.error.message : 'Error en la importación');
    }
    return r.data;
  }
}
