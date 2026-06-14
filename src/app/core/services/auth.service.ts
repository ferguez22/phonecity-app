import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    nombre_usuario: string;
    rol: string;
    tienda_id: number;
  };
}

const TOKEN_KEY = 'phonecity_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // signal con el token; se inicializa desde localStorage al arrancar
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly isLoggedIn = computed(() => this.token() !== null);

  login(nombreUsuario: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, {
        nombre_usuario: nombreUsuario,
        password,
      })
      .pipe(
        map((res) => res.data),
        tap((data) => {
          localStorage.setItem(TOKEN_KEY, data.token);
          this.token.set(data.token);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  getToken(): string | null {
    return this.token();
  }
}
