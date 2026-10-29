import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateLoanApplicationRequest, LoanApplication, PaginatedResponse } from '../models/loan-application.model';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/loan-applications';

  getApplications(search = '', page = 1, pageSize = 10): Observable<PaginatedResponse<LoanApplication>> {
    return this.http.get<PaginatedResponse<LoanApplication>>(this.url, {
      params: { search: search.trim(), page, pageSize }
    });
  }

  getApplicationById(id: string): Observable<LoanApplication> {
    return this.http.get<LoanApplication>(`${this.url}/${encodeURIComponent(id)}`);
  }

  createApplication(request: CreateLoanApplicationRequest): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(this.url, request);
  }
}
