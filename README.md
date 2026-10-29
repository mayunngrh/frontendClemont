# Frontend Angular

## Jalankan

```bash
npm install
npm start
```

Buka http://localhost:4200. Backend harus berjalan pada port 5088.

## Urutan baca

1. `src/main.ts`: menyalakan Angular.
2. `src/app/app.config.ts`: mendaftarkan router dan HttpClient.
3. `src/app/app.routes.ts`: dua halaman, `/login` dan `/pengajuan`.
4. `src/app/pages/login/`: form login dan pengiriman akun ke backend.
5. `src/app/pages/pengajuan/`: daftar, popup tambah, detail, pencarian, pagination.
6. `src/app/services/auth.service.ts`: login/logout dan membaca sesi.
7. `src/app/services/loan.service.ts`: GET dan POST pengajuan.
8. `src/app/models/loan-application.model.ts`: tipe data request/response.

Setiap halaman memiliki HTML (struktur), CSS (gaya), dan TypeScript (data/aksi).
Routing menggunakan import langsung. Daftar data dimuat melalui subscribe biasa, tanpa Subject, timer, atau lapisan cache sesi.

## Integrasi

`src/proxy.conf.json` meneruskan `/api` ke backend. HttpClient mengirim token dari cookie `XSRF-TOKEN` sebagai header `X-XSRF-TOKEN` pada request perubahan data. Cookie sesi dikelola backend; tidak menyimpan password di browser.

Aturan input diperiksa di frontend dan backend. Jika backend menolak input, form menampilkan pesan dan mempertahankan isinya.
