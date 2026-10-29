import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, User } from '../models/loan-application.model';
import { apiErrorMessage } from './api-error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly user = signal<User | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly sessionMessage = signal<string | null>(null);

  // The server cookie is the source of truth, including after a page refresh.
  // Saat halaman dibuka ulang, tanyakan sesi kepada backend.
  restoreSession(): Observable<User | null> {
    return this.http.get<LoginResponse>('/api/auth/me').pipe(
      map(response => response.user),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) return of(null);
        this.sessionMessage.set(apiErrorMessage(error));
        return throwError(() => error);
      }),
      tap(user => this.user.set(user))
    );
  }

  refreshCsrf(): Observable<void> {
    return this.http.get<void>('/api/auth/csrf');
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.sessionMessage.set(null);
    return this.refreshCsrf().pipe(
      switchMap(() => this.http.post<LoginResponse>('/api/auth/login', {
        email: credentials.email.trim(), password: credentials.password
      })),
      // Refresh the token using the authenticated identity after sign-in.
      switchMap(response => this.refreshCsrf().pipe(map(() => response))),
      tap(response => {
        this.user.set(response.user);
      })
    );
  }

  logout(): Observable<void> {
    return this.refreshCsrf().pipe(
      switchMap(() => this.http.post<void>('/api/auth/logout', {})),
      catchError((error: HttpErrorResponse) => error.status === 401
        ? of(undefined) : throwError(() => error)),
      tap(() => {
        this.user.set(null);
        this.sessionMessage.set(null);
        void this.router.navigate(['/login']);
      })
    );
  }

  expireSession(): void {
    this.user.set(null);
    this.sessionMessage.set('Sesi telah berakhir. Silakan masuk kembali.');
    void this.router.navigate(['/login']);
  }
}
