# Kontrak API — Clemont Loan Demo (Tahap Fullstack)

Dokumen ini mendefinisikan kontrak REST API resmi untuk tahap integrasi backend (.NET / Node.js) dengan frontend Angular.

---

## 1. Konvensi Umum
- **Format Pertukaran Data**: JSON (`application/json`) dengan penamaan kunci **camelCase**.
- **Zona Waktu**: Tanggal dan waktu menggunakan format **ISO 8601 UTC** (contoh: `2026-10-25T14:30:00.000Z`).
- **Penanganan Error**: Menggunakan standar **RFC 7807 (ProblemDetails)**.

---

## 2. Model Data (TypeScript Interfaces)

### `User`
```typescript
export interface User {
  id: string;
  fullName: string;
  email: string;
}
```

### `CreateLoanApplicationRequest`
```typescript
export interface CreateLoanApplicationRequest {
  fullName: string;       // 3 - 100 karakter
  nationalId: string;     // Tepat 16 digit angka (string)
  phone: string;          // 10 - 15 digit (setelah normalisasi +)
  email: string;          // Format email valid
  amount: number;         // 1.000.000 s/d 100.000.000
  tenorMonths: number;    // 6 | 12 | 24 | 36
  purpose: string;        // 10 - 500 karakter
}
```

### `LoanApplication`
```typescript
export interface LoanApplication {
  id: string;
  applicationNumber: string; // contoh: LN-20261025-001
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  amount: number;
  tenorMonths: number;
  purpose: string;
  status: 'submitted';       // Ditampilkan di UI sebagai "Diajukan"
  createdAt: string;         // ISO 8601 UTC
}
```

### `PaginatedResponse<T>`
```typescript
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
```

### `ProblemDetails` (Format Respons Error Standar)
```typescript
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>; // Error validasi per field
}
```

---

## 3. Spesifikasi Endpoint

### A. Autentikasi (`/api/auth`)

#### 1. GET `/api/auth/csrf`
- **Tujuan**: Mendapatkan cookie anti-forgery token (`XSRF-TOKEN`).
- **Header Permintaan**: Tidak ada.
- **Respons `204 No Content`**: Mengatur cookie `XSRF-TOKEN`.

#### 2. POST `/api/auth/login`
- **Tujuan**: Autentikasi pengguna (petugas/staf).
- **Body Permintaan**:
  ```json
  {
    "email": "staff@clemont.test",
    "password": "Belajar123!"
  }
  ```
- **Respons `200 OK`**:
  ```json
  {
    "user": {
      "id": "usr-001",
      "fullName": "Budi Santoso",
      "email": "staff@clemont.test"
    }
  }
  ```
  *Disertai cookie session / HTTP-only auth token (`Set-Cookie`).*
- **Respons `400 / 401 Unauthorized`**: ProblemDetails ("Email atau password salah").

#### 3. POST `/api/auth/logout`
- **Tujuan**: Mengakhiri sesi pengguna dan menghapus cookie autentikasi.
- **Respons `204 No Content`**.

#### 4. GET `/api/auth/me`
- **Tujuan**: Memeriksa sesi aktif pengguna saat ini.
- **Respons `200 OK`**:
  ```json
  {
    "user": {
      "id": "usr-001",
      "fullName": "Budi Santoso",
      "email": "staff@clemont.test"
    }
  }
  ```
- **Respons `401 Unauthorized`**: ProblemDetails jika tidak ada sesi aktif.

---

### B. Pengajuan Pinjaman (`/api/loan-applications`)

#### 1. GET `/api/loan-applications?search=&page=1&pageSize=10`
- **Tujuan**: Mengambil daftar pengajuan pinjaman terpaginasi dan dapat dicari (berdasarkan nama pemohon atau nomor pengajuan).
- **Query Parameters**:
  - `search` (opsional): kata kunci pencarian.
  - `page` (default 1): nomor halaman aktif.
  - `pageSize` (default 10): jumlah baris per halaman.
- **Respons `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "ln-001",
        "applicationNumber": "LN-20261025-001",
        "fullName": "Siti Rahmawati",
        "nationalId": "3201234567890001",
        "phone": "081234567890",
        "email": "siti.rahmawati@contoh.id",
        "amount": 15000000,
        "tenorMonths": 12,
        "purpose": "Modal pengembangan usaha kuliner rumahan",
        "status": "submitted",
        "createdAt": "2026-10-25T08:30:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 10,
    "totalCount": 1
  }
  ```

#### 2. GET `/api/loan-applications/{id}`
- **Tujuan**: Mengambil rincian lengkap satu pengajuan pinjaman berdasarkan ID.
- **Respons `200 OK`**: Objek `LoanApplication`.
- **Respons `404 Not Found`**: ProblemDetails jika ID tidak ditemukan.

#### 3. POST `/api/loan-applications`
- **Tujuan**: Membuat data pengajuan pinjaman baru.
- **Body Permintaan**: Objek `CreateLoanApplicationRequest`.
  ```json
  {
    "fullName": "Ahmad Fauzi",
    "nationalId": "3171012345670005",
    "phone": "082198765432",
    "email": "ahmad.fauzi@contoh.id",
    "amount": 25000000,
    "tenorMonths": 24,
    "purpose": "Renovasi tempat usaha fotokopi dan ATK",
  }
  ```
- **Respons `201 Created`**: Objek `LoanApplication` yang baru dibuat lengkap dengan `id`, `applicationNumber`, `status: "submitted"`, dan `createdAt`.
- **Respons `400 Bad Request`**: ProblemDetails dengan atribut `errors` jika ada field yang melanggar validasi bisnis:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
    "title": "Validation Error",
    "status": 400,
    "errors": {
      "nationalId": ["NIK harus tepat 16 digit."],
      "amount": ["Jumlah pinjaman harus antara Rp1.000.000 dan Rp100.000.000."]
    }
  }
  ```
