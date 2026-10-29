import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { LoanService } from './loan.service';
import { AuthService } from './auth.service';
import { sessionInterceptor } from './session.interceptor';

describe('LoanService API contract', () => {
  let loan: LoanService;
  let http: HttpTestingController;
  const expireSession = vi.fn();
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([sessionInterceptor])),
      provideHttpClientTesting(), { provide: AuthService, useValue: { expireSession } }] });
    loan = TestBed.inject(LoanService);
    http = TestBed.inject(HttpTestingController);
    expireSession.mockClear();
  });
  afterEach(() => http.verify());

  it('sends pagination and search to the backend', async () => {
    const result = firstValueFrom(loan.getApplications(' Budi ', 2, 10));
    const request = http.expectOne(r => r.url === '/api/loan-applications');
    expect(request.request.params.get('search')).toBe('Budi');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], page: 2, pageSize: 10, totalCount: 15 });
    expect((await result).totalCount).toBe(15);
  });

  it('reads detail from the server', async () => {
    const result = firstValueFrom(loan.getApplicationById('la-demo'));
    http.expectOne('/api/loan-applications/la-demo').flush({ id: 'la-demo', fullName: 'Budi' });
    expect((await result).id).toBe('la-demo');
  });

  it('keeps the application number and timestamp returned by the server', async () => {
    const data = { fullName: 'Budi', nationalId: '1234567890123456', phone: '081234567890', email: 'demo@example.test', amount: 5000000, tenorMonths: 12, purpose: 'Modal usaha demo' };
    const result = firstValueFrom(loan.createApplication(data));
    const request = http.expectOne('/api/loan-applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(data);
    request.flush({ ...data, id: 'la-demo', applicationNumber: 'LN-20261026-006', createdAt: '2026-10-26T10:00:00Z', status: 'submitted' });
    expect((await result).applicationNumber).toBe('LN-20261026-006');
  });

  it('expires the frontend session when a protected API returns 401', async () => {
    const result = firstValueFrom(loan.getApplications());
    http.expectOne(r => r.url === '/api/loan-applications').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(result).rejects.toBeDefined();
    expect(expireSession).toHaveBeenCalledOnce();
  });

  it('propagates a backend outage instead of falling back to mock data', async () => {
    const result = firstValueFrom(loan.getApplications());
    http.expectOne(r => r.url === '/api/loan-applications').error(new ProgressEvent('error'));
    await expect(result).rejects.toBeDefined();
    expect(expireSession).not.toHaveBeenCalled();
  });
});
