import { Component, OnInit, signal, inject, HostListener, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';
import { apiErrorMessage } from '../../services/api-error';
import { AuthService } from '../../services/auth.service';
import { LoanService } from '../../services/loan.service';
import { LoanApplication, CreateLoanApplicationRequest } from '../../models/loan-application.model';
import { nationalIdValidator, phoneValidator } from '../../validators/loan.validators';

@Component({
  selector: 'app-loan-applications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './loan-applications.component.html',
  styleUrl: './loan-applications.component.css'
})
export class LoanApplicationsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;
  private detailRequest?: Subscription;

  // Auth state
  readonly currentUser = this.authService.currentUser;

  // List & Pagination State
  applications = signal<LoanApplication[]>([]);
  isLoadingList = signal<boolean>(false);
  listError = signal<string | null>(null);
  isLoadingDetail = signal(false);
  detailError = signal<string | null>(null);
  isLoggingOut = signal(false);
  searchTerm = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = signal<number>(1);

  private readonly document = inject(DOCUMENT);
  @ViewChild('createDialog') createDialog?: ElementRef<HTMLDialogElement>;
  private previousBodyOverflow = '';
  readonly isCreateOpen = signal(false);

  // Form State
  isSubmitting = signal<boolean>(false);
  successNotification = signal<string | null>(null);
  formErrorMessage = signal<string | null>(null);

  // Detail Modal State
  selectedApplication = signal<LoanApplication | null>(null);
  isDetailOpen = signal<boolean>(false);

  // Form definition
  loanForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    nationalId: ['', [Validators.required, nationalIdValidator()]],
    phone: ['', [Validators.required, phoneValidator()]],
    email: ['', [Validators.required, Validators.email]],
    amount: [null as number | null, [Validators.required, Validators.min(1000000), Validators.max(100000000)]],
    tenorMonths: [12, [Validators.required]],
    purpose: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    paymentMethod: ['transfer', [Validators.required]]
  });

  // Tenor options
  readonly tenorOptions = [
    { label: '6 Bulan', value: 6 },
    { label: '12 Bulan (1 Tahun)', value: 12 },
    { label: '24 Bulan (2 Tahun)', value: 24 },
    { label: '36 Bulan (3 Tahun)', value: 36 }
  ];

  ngOnInit(): void {
    this.loanForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      for (const control of Object.values(this.loanForm.controls)) {
        if (control.hasError('server')) {
          const { server, ...otherErrors } = control.errors!;
          control.setErrors(Object.keys(otherErrors).length ? otherErrors : null, { emitEvent: false });
        }
      }
    });
    this.destroyRef.onDestroy(() => {
      this.listRequest?.unsubscribe();
      this.detailRequest?.unsubscribe();
      if (this.isCreateOpen()) {
        this.createDialog?.nativeElement.close();
        this.document.body.style.overflow = this.previousBodyOverflow;
      }
    });
    this.loadApplications();
  }

  // Convenience Form Getters
  get fullNameCtrl() { return this.loanForm.get('fullName'); }
  get nationalIdCtrl() { return this.loanForm.get('nationalId'); }
  get phoneCtrl() { return this.loanForm.get('phone'); }
  get emailCtrl() { return this.loanForm.get('email'); }
  get amountCtrl() { return this.loanForm.get('amount'); }
  get tenorCtrl() { return this.loanForm.get('tenorMonths'); }
  get purposeCtrl() { return this.loanForm.get('purpose'); }

  // Ambil daftar dari API dan simpan hasilnya untuk ditampilkan di tabel.
  loadApplications(page = this.currentPage()): void {
    this.listRequest?.unsubscribe();
    this.isLoadingList.set(true);
    this.listError.set(null);
    this.currentPage.set(page);
    this.listRequest = this.loanService.getApplications(this.searchTerm(), page, this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.applications.set(response.items);
          this.totalCount.set(response.totalCount);
          this.totalPages.set(Math.max(1, Math.ceil(response.totalCount / response.pageSize)));
          this.isLoadingList.set(false);
        },
        error: error => {
          this.listError.set(apiErrorMessage(error));
          this.applications.set([]);
          this.totalCount.set(0);
          this.totalPages.set(1);
          this.isLoadingList.set(false);
        }
      });
  }

  onSearchChange(newSearch: string): void {
    this.searchTerm.set(newSearch);
    this.loadApplications(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.loadApplications(page);
    }
  }

  openCreate(): void {
    if (this.isCreateOpen()) return;
    this.formErrorMessage.set(null);
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.isCreateOpen.set(true);
    this.createDialog?.nativeElement.showModal();
  }

  closeCreate(): void {
    if (this.isSubmitting()) return;
    this.createDialog?.nativeElement.close();
    this.onCreateClosed();
  }

  onCreateClosed(): void {
    if (!this.isCreateOpen()) return;
    this.isCreateOpen.set(false);
    this.formErrorMessage.set(null);
    this.document.body.style.overflow = this.previousBodyOverflow;
  }

  onCreateCancel(event: Event): void {
    event.preventDefault();
    this.closeCreate();
  }

  onCreateBackdrop(event: MouseEvent): void {
    const dialog = this.createDialog?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) this.closeCreate();
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      this.formErrorMessage.set('Silakan periksa kembali kelengkapan formulir sebelum mengirim.');
      return;
    }

    this.isSubmitting.set(true);
    this.formErrorMessage.set(null);
    this.successNotification.set(null);

    const rawValues = this.loanForm.value;
    const request: CreateLoanApplicationRequest = {
      fullName: (rawValues.fullName || '').trim(),
      nationalId: (rawValues.nationalId || '').trim(),
      phone: (rawValues.phone || '').trim(),
      email: (rawValues.email || '').trim().toLowerCase(),
      amount: Number(rawValues.amount),
      tenorMonths: Number(rawValues.tenorMonths),
      purpose: (rawValues.purpose || '').trim(),
      paymentMethod: rawValues.paymentMethod || 'transfer'
    };

    this.loanService.createApplication(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.successNotification.set(`Pengajuan pinjaman berhasil diajukan dengan nomor: ${created.applicationNumber}`);
        this.formErrorMessage.set(null);
        
        // Reset form to pristine defaults
        this.loanForm.reset({
          fullName: '',
          nationalId: '',
          phone: '',
          email: '',
          amount: null,
          tenorMonths: 12,
          purpose: '',
          paymentMethod: 'transfer'
        });

        this.closeCreate();
        this.searchTerm.set('');
        // Refresh tabel
        this.currentPage.set(1);
        this.loadApplications(1);

        // Auto dismiss success notification after 7 seconds
        setTimeout(() => {
          this.successNotification.set(null);
        }, 7000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.formErrorMessage.set(apiErrorMessage(err));
        this.applyServerErrors(err);
        // Formulir sengaja dipertahankan isinya saat terjadi kegagalan
      }
    });
  }

  private applyServerErrors(error: unknown): void {
    if (!(error instanceof HttpErrorResponse) || error.status !== 400) return;
    const errors = error.error?.errors as Record<string, string[]> | undefined;
    for (const [key, messages] of Object.entries(errors || {})) {
      const field = key.charAt(0).toLowerCase() + key.slice(1);
      const control = this.loanForm.get(field);
      if (control && Array.isArray(messages)) {
        control.setErrors({ ...control.errors, server: messages.join(' ') });
        control.markAsTouched();
      }
    }
  }

  openDetail(app: LoanApplication): void {
    this.detailRequest?.unsubscribe();
    this.detailError.set(null);
    this.isLoadingDetail.set(true);
    this.detailRequest = this.loanService.getApplicationById(app.id).pipe(
      finalize(() => this.isLoadingDetail.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: detail => {
        this.selectedApplication.set(detail);
        this.isDetailOpen.set(true);
      },
      error: error => this.detailError.set(apiErrorMessage(error))
    });
  }

  closeDetail(): void {
    this.detailRequest?.unsubscribe();
    this.isDetailOpen.set(false);
    this.selectedApplication.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isDetailOpen()) {
      this.closeDetail();
    }
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.formErrorMessage.set(null);
    this.authService.logout().pipe(
      finalize(() => this.isLoggingOut.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({ error: error => this.formErrorMessage.set(apiErrorMessage(error)) });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(isoString: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // Helper untuk pagination number generator
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
        pages.push(i);
      }
    }
    return pages;
  }
}
