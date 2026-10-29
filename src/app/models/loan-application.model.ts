export interface User {
  id: string;
  fullName: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface CreateLoanApplicationRequest {
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  amount: number;
  tenorMonths: number;
  purpose: string;
  paymentMethod?: string;
}

export interface LoanApplication extends CreateLoanApplicationRequest {
  id: string;
  applicationNumber: string;
  createdAt: string; // ISO 8601 UTC
  status: 'submitted';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
