import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

const user = { id: 'demo', fullName: 'Petugas Demo', email: 'staff@clemont.test' };

describe('AuthService API sessions', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  const navigate = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: { navigate } }
    ] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate.mockClear();
  });
  afterEach(() => http.verify());

  it('uses a server session instead of trusting old mock storage', async () => {
    sessionStorage.setItem('clemont_loan_auth_user', JSON.stringify(user));
    const result = firstValueFrom(auth.restoreSession());
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    sessionStorage.clear();
  });

  it('shares the session probe and restores the authenticated user', async () => {
    const first = firstValueFrom(auth.restoreSession());
    const second = firstValueFrom(auth.restoreSession());
    http.expectOne('/api/auth/me').flush({ user });
    expect(await first).toEqual(user);
    expect(await second).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('surfaces a connection failure without calling it invalid credentials', async () => {
    const result = firstValueFrom(auth.restoreSession());
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'));
    await expect(result).rejects.toBeDefined();
    expect(auth.sessionMessage()).toContain('Tidak dapat menghubungi server');
  });

  it('fetches CSRF before login and renews it after the identity changes', async () => {
    const result = firstValueFrom(auth.login({ email: ' staff@clemont.test ', password: 'Demo123!' }));
    http.expectOne('/api/auth/csrf').flush(null);
    const login = http.expectOne('/api/auth/login');
    expect(login.request.method).toBe('POST');
    expect(login.request.body.email).toBe('staff@clemont.test');
    login.flush({ user });
    expect(auth.isAuthenticated()).toBe(false);
    http.expectOne('/api/auth/csrf').flush(null);
    expect((await result).user).toEqual(user);
    expect(auth.currentUser()).toEqual(user);
  });

  it('logs out on the server before clearing the user', async () => {
    const session = firstValueFrom(auth.restoreSession());
    http.expectOne('/api/auth/me').flush({ user });
    await session;
    const result = firstValueFrom(auth.logout());
    http.expectOne('/api/auth/csrf').flush(null);
    expect(auth.isAuthenticated()).toBe(true);
    http.expectOne('/api/auth/logout').flush(null);
    await result;
    expect(auth.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
