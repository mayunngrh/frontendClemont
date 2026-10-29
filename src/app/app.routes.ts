import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { LoanApplicationsComponent } from './pages/pengajuan/loan-applications.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pengajuan' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'pengajuan', component: LoanApplicationsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'pengajuan' }
];
