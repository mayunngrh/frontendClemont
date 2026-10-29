import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../../services/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  readonly sessionMessage = this.authService.sessionMessage;

  loginForm = this.fb.group({
    email: ['staff@clemont.test', [Validators.required, Validators.email]],
    password: ['Belajar123!', [Validators.required]]
  });

  get emailCtrl() {
    return this.loginForm.get('email');
  }

  get passwordCtrl() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(prev => !prev);
  }

  onSubmit(): void {
    if (this.isLoading()) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/pengajuan']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(apiErrorMessage(err));
      }
    });
  }
}
