import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { LoanApplicationsComponent } from './loan-applications.component';
import { LoanService } from '../../services/loan.service';
import { AuthService } from '../../services/auth.service';
import { LoanApplication, PaginatedResponse } from '../../models/loan-application.model';

const data = { fullName: 'Budi Demo', nationalId: '1234567890123456', phone: '081234567890', email: 'budi@example.test', amount: 5000000, tenorMonths: 12, purpose: 'Modal usaha untuk latihan' };
const application: LoanApplication = { ...data, id: 'la-demo', applicationNumber: 'LN-DEMO-001', createdAt: '2026-10-26T10:00:00Z', status: 'submitted' };
const response = (name: string): PaginatedResponse<LoanApplication> => ({ items: [{ ...application, fullName: name }], totalCount: 1, page: 1, pageSize: 10 });

describe('Loan application integration states', () => {
  let component: LoanApplicationsComponent;
  let loan: { getApplications: ReturnType<typeof vi.fn>; getApplicationById: ReturnType<typeof vi.fn>; createApplication: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.useFakeTimers();
    loan = { getApplications: vi.fn().mockReturnValue(of(response('Initial'))), getApplicationById: vi.fn().mockReturnValue(of(application)), createApplication: vi.fn() };
    TestBed.configureTestingModule({ providers: [
      { provide: LoanService, useValue: loan },
      { provide: AuthService, useValue: { currentUser: signal(null), logout: () => of(undefined) } }
    ] });
    component = TestBed.runInInjectionContext(() => new LoanApplicationsComponent());
    component.ngOnInit();
    vi.advanceTimersByTime(0);
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('debounces search and cancels the earlier request so stale results cannot win', () => {
    const first = new Subject<PaginatedResponse<LoanApplication>>();
    loan.getApplications.mockReturnValueOnce(first).mockReturnValueOnce(of(response('Latest')));
    component.onSearchChange('old');
    vi.advanceTimersByTime(300);
    component.onSearchChange('new');
    first.next(response('Stale'));
    vi.advanceTimersByTime(300);
    expect(component.applications()[0].fullName).toBe('Latest');
    expect(loan.getApplications).toHaveBeenLastCalledWith('new', 1, 10);
  });

  it('shows a list failure instead of presenting an outage as an empty result', () => {
    loan.getApplications.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.loadApplications();
    vi.advanceTimersByTime(0);
    expect(component.listError()).toContain('Tidak dapat menghubungi server');
    expect(component.applications()).toEqual([]);
    expect(component.isLoadingList()).toBe(false);
  });

  it('maps server validation to the field and preserves the entered values', () => {
    component.loanForm.setValue(data);
    loan.createApplication.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Validasi gagal.', errors: { FullName: ['Nama tidak valid.'] } } })));
    component.onSubmit();
    expect(component.fullNameCtrl?.errors?.['server']).toBe('Nama tidak valid.');
    expect(component.loanForm.value.purpose).toBe(data.purpose);
    expect(component.isSubmitting()).toBe(false);
  });

  it('fetches the detail endpoint instead of reusing an incomplete table item', () => {
    component.openDetail(application);
    expect(loan.getApplicationById).toHaveBeenCalledWith(application.id);
    expect(component.selectedApplication()).toEqual(application);
    expect(component.isDetailOpen()).toBe(true);
  });
});
