import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    // Login and session probes handle their own 401 responses.
    if (error.status === 401 && request.url.startsWith('/api/loan-applications')) {
      injector.get(AuthService).expireSession();
    }
    return throwError(() => error);
  }));
};
