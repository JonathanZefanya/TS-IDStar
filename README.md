# Timesheet Management System

Timesheet Management System adalah aplikasi full-stack untuk pencatatan aktivitas kerja bulanan, pengelolaan data karyawan, validasi hari libur, dan export file Excel sesuai template timesheet perusahaan.

Aplikasi ini terdiri dari backend Express + Prisma + MySQL dan frontend React + TypeScript + Vite.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | MySQL |
| ORM | Prisma |
| Authentication | JWT |
| Excel Export | exceljs |
| Styling | CSS custom dashboard layout |

## Key Features

- Login berbasis JWT untuk admin dan user.
- Workspace user untuk input timesheet bulanan.
- Perhitungan total jam otomatis dari start time, lunch break, dan end time.
- Lunch break bersifat opsional dan mendukung format durasi (`01:00`) atau rentang waktu (`12:00 - 13:00`).
- Weekend dan holiday otomatis dikunci dari input timesheet.
- Admin dashboard untuk mengelola user, timesheet, dan master hari libur.
- Upload logo user/client dari workspace user atau form admin user.
- Export timesheet ke Excel menggunakan template `fe-ts/public/template.xlsx`.
- UI responsif untuk desktop dan mobile.

## Project Structure

```text
TS-IDStar/
  be-ts/
    prisma/
      migrations/
      schema.prisma
      seed.js
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      utils/
      app.js
      server.js
    .env.example
    package.json

  fe-ts/
    public/
      template.xlsx
    src/
      api/
      components/
      lib/
      App.tsx
      App.css
      index.css
      main.tsx
      types.ts
    .env.example
    package.json
```

## Prerequisites

Pastikan environment lokal sudah memiliki:

- Node.js 18 atau lebih baru
- npm
- MySQL
- Database kosong untuk aplikasi, misalnya `timesheet_management`

## Environment Variables

### Backend

Salin file environment backend:

```bash
cd be-ts
copy .env.example .env
```

Isi nilai berikut sesuai konfigurasi lokal:

```env
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=timesheet_management
DATABASE_URL=mysql://root:password@localhost:3306/timesheet_management
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Catatan:

- `DATABASE_URL` digunakan oleh Prisma.
- `CORS_ORIGIN` harus mengarah ke URL frontend Vite.
- Gunakan `JWT_SECRET` yang kuat untuk environment non-development.

### Frontend

Salin file environment frontend:

```bash
cd fe-ts
copy .env.example .env
```

Isi URL API backend:

```env
VITE_API_URL=http://localhost:4000/api
```

## Installation

Install dependency backend:

```bash
cd be-ts
npm install
```

Install dependency frontend:

```bash
cd fe-ts
npm install
```

## Database Setup

Jalankan dari folder `be-ts`:

```bash
npm run prisma:generate
npm run migrate
npm run seed
```

Untuk deployment atau database yang sudah memiliki migration history, gunakan:

```bash
npm run migrate:deploy
```

Jika `prisma generate` gagal karena file Prisma sedang terkunci di Windows, hentikan proses backend atau Node.js yang sedang berjalan, lalu jalankan ulang command tersebut.

## Running The Application

Jalankan backend:

```bash
cd be-ts
npm run dev
```

Backend default berjalan di:

```text
http://localhost:4000
```

Jalankan frontend:

```bash
cd fe-ts
npm run dev
```

Frontend default berjalan di:

```text
http://localhost:5173
```

Jika PowerShell menolak command `npm` karena Execution Policy, gunakan `npm.cmd`, contoh:

```powershell
npm.cmd run dev
```

## Default Accounts

Seeder menyediakan akun awal berikut:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `Admin123!` |
| User | `jonathan.zefanya` | `User123!` |

Data user seed:

| Field | Value |
| --- | --- |
| Name | Jonathan Zefanya |
| Role Job | Programmer |
| Department | PSI |
| Location | BPJS Kesehatan Pusat |
| Project | VClaim |
| Team Lead | Muhammad Yazid Al Qahar |
| Dept Head | Agung Tri Mulyanto |

## Application Workflow

1. User login ke aplikasi.
2. User memilih periode timesheet dalam format bulan dan tahun.
3. User mengisi start time, lunch break, end time, dan aktivitas harian.
4. Sistem menghitung total hours secara otomatis.
5. User menyimpan draft, submit timesheet, atau export Excel.
6. Admin dapat mengelola user, master holiday, dan file timesheet yang sudah dibuat.
7. Logo user/client yang tersimpan akan ditempel ke area `LOGO USER/CLIENT` pada export Excel.

## Lunch Break Rules

Field `Lunch Break` bersifat opsional. Jika dikosongkan, sistem tidak mengurangi jam kerja.

Field ini mendukung dua format:

| Format | Meaning | Example |
| --- | --- | --- |
| Duration | Durasi istirahat langsung | `01:00` |
| Time range | Rentang jam istirahat | `12:00 - 13:00` |

Untuk format rentang waktu, lunch hanya dikurangi jika rentangnya masuk ke dalam jam kerja.

Contoh ketika lunch belum terjadi:

```text
Start Time   : 06:00
Lunch Break  : 12:00 - 13:00
End Time     : 11:58
Total Hours  : 5.97
```

Contoh ketika lunch terjadi penuh:

```text
Start Time   : 08:55
Lunch Break  : 12:00 - 13:00
End Time     : 17:00
Total Hours  : 7.08
```

Jika format tidak valid atau tidak overlap dengan jam kerja, lunch break dihitung sebagai `0` agar aplikasi tidak menghasilkan nilai `NaN`.

## API Reference

Base URL:

```text
http://localhost:4000/api
```

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/login` | Login user dan mendapatkan token |
| GET | `/auth/me` | Mengambil profile user aktif |
| PUT | `/auth/me/client-logo` | Update atau hapus logo client user aktif |

### User Timesheet

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/timesheets/me?period=YYYY-MM` | Mengambil timesheet user aktif |
| GET | `/timesheets/me/detail?period=YYYY-MM` | Mengambil detail timesheet dan holiday |
| PUT | `/timesheets/me/:period/entries` | Menyimpan entry timesheet |
| POST | `/timesheets/me/:period/submit` | Submit timesheet |
| GET | `/timesheets/me/:period/export` | Export timesheet user ke Excel |

### Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/users` | List user |
| POST | `/admin/users` | Membuat user |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/timesheets` | List timesheet |
| POST | `/admin/timesheets` | Membuat timesheet |
| GET | `/admin/timesheets/:id` | Detail timesheet |
| PUT | `/admin/timesheets/:id` | Update timesheet |
| DELETE | `/admin/timesheets/:id` | Delete timesheet |
| GET | `/admin/timesheets/:id/export` | Export timesheet ke Excel |
| GET | `/admin/holidays` | List holiday |
| POST | `/admin/holidays` | Membuat holiday |
| PUT | `/admin/holidays/:id` | Update holiday |
| DELETE | `/admin/holidays/:id` | Delete holiday |

## Database Models

Prisma schema adalah sumber utama struktur database.

| Model | Purpose |
| --- | --- |
| `User` | Menyimpan data akun, role, department, project, dan approval metadata |
| `Timesheet` | Menyimpan header timesheet per user dan periode |
| `TimesheetEntry` | Menyimpan detail harian timesheet |
| `Holiday` | Menyimpan master tanggal libur |

Relasi utama:

- Satu user memiliki banyak timesheet.
- Satu timesheet memiliki banyak timesheet entry.
- Timesheet entry otomatis ikut terhapus jika timesheet dihapus.
- Timesheet user ikut terhapus jika user dihapus.

## Excel Export

Export Excel menggunakan `exceljs` dan template:

```text
fe-ts/public/template.xlsx
```

Output export mencakup:

- Header perusahaan.
- Judul `TIME SHEET`.
- Informasi employee.
- Tabel aktivitas harian.
- Total hours.
- Signature section untuk pemohon dan approver.

Weekend dan holiday akan dikunci dari input jam kerja, lalu activity diisi otomatis sesuai nama hari atau hari libur.

## Available Scripts

### Backend

| Command | Description |
| --- | --- |
| `npm run dev` | Menjalankan backend dengan nodemon |
| `npm start` | Menjalankan backend production mode |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run migrate` | Menjalankan Prisma migration development |
| `npm run migrate:deploy` | Apply migration untuk environment deployed |
| `npm run seed` | Menjalankan seeder |
| `npm run db:studio` | Membuka Prisma Studio |

### Frontend

| Command | Description |
| --- | --- |
| `npm run dev` | Menjalankan Vite development server |
| `npm run build` | Build frontend production |
| `npm run preview` | Preview hasil production build |

## Production Build

Build frontend:

```bash
cd fe-ts
npm run build
```

Jalankan backend:

```bash
cd be-ts
npm start
```

Pastikan environment production memiliki:

- `DATABASE_URL` yang valid.
- `JWT_SECRET` yang kuat.
- `CORS_ORIGIN` sesuai domain frontend.
- Migration database sudah diterapkan dengan `npm run migrate:deploy`.

## Troubleshooting

### Prisma Client belum ter-generate

Jika muncul error:

```text
@prisma/client did not initialize yet
```

Jalankan:

```bash
cd be-ts
npm run prisma:generate
```

### Prisma generate gagal di Windows

Jika muncul error `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`, hentikan proses backend atau Node.js yang sedang menggunakan Prisma, lalu jalankan ulang:

```bash
npm run prisma:generate
```

### Frontend tidak bisa akses API

Periksa:

- Backend berjalan di `http://localhost:4000`.
- `fe-ts/.env` berisi `VITE_API_URL=http://localhost:4000/api`.
- `be-ts/.env` berisi `CORS_ORIGIN=http://localhost:5173`.

### Total hours menjadi `NaN`

Pastikan input waktu menggunakan format berikut:

- Start time: `HH:mm`
- End time: `HH:mm`
- Lunch break: kosong, `HH:mm`, atau `HH:mm - HH:mm`

## Development Notes

- Jangan commit file `.env`.
- Jalankan migration setiap ada perubahan Prisma schema.
- Jalankan build frontend sebelum deploy.
- Pastikan `template.xlsx` tersedia karena digunakan oleh fitur export.
