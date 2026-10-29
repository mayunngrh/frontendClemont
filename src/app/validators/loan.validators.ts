import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function nationalIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const val = String(control.value).trim();
    const isExactly16Digits = /^\d{16}$/.test(val);
    return isExactly16Digits ? null : { invalidNationalId: 'NIK harus tepat 16 digit angka' };
  };
}

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const rawVal = String(control.value).trim();
    // Normalisasi: jika ada awalan +, hilangkan + untuk menguji panjang digit
    const digitsOnly = rawVal.startsWith('+') ? rawVal.substring(1).replace(/\D/g, '') : rawVal.replace(/\D/g, '');
    
    // Validasi format angka dan panjang 10 - 15 digit
    const isValidFormat = /^(\+)?\d+$/.test(rawVal.replace(/[\s-]/g, ''));
    const isLengthValid = digitsOnly.length >= 10 && digitsOnly.length <= 15;

    if (!isValidFormat || !isLengthValid) {
      return { invalidPhone: 'Nomor telepon harus 10–15 digit angka (boleh diawali +)' };
    }
    return null;
  };
}
