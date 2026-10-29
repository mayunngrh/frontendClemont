import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '../models/loan-application.model';

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Terjadi kesalahan. Silakan coba kembali.';
  if (error.status === 0 || error.status === 502 || error.status === 504) {
    return 'Tidak dapat menghubungi server. Pastikan backend berjalan dan coba kembali.';
  }
  const problem = error.error as ProblemDetails | null;
  if (error.status === 401) return problem?.detail || 'Email atau password salah.';
  if (error.status === 403) return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
  if (error.status >= 500) return 'Server mengalami masalah. Silakan coba kembali.';
  if (problem?.detail) return problem.detail;
  if (error.status === 400) return 'Permintaan ditolak. Periksa data atau masuk kembali untuk memperbarui sesi.';
  return 'Permintaan gagal. Silakan coba kembali.';
}
