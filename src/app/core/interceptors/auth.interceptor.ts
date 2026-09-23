import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const RUTA_LOGIN = '/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((err) => {
      const esLogin = req.url.includes(RUTA_LOGIN);
      if (err?.status === 401 && !esLogin) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { expirado: 1 } });
      }
      return throwError(() => err);
    }),
  );
};