# Timesheet Management System Starter

Starter full-stack untuk aplikasi Timesheet Management System dengan:

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: MySQL
- ORM: Prisma
- Auth: JWT
- Excel export: exceljs

## Folder Tree

### Backend

```text
be-ts/
  .env.example
  package.json
  prisma/
    schema.prisma
    seed.js
    migrations/
      20260402025823_init/
        migration.sql
  src/
    app.js
    server.js
    config/
      env.js
      prisma.js
    controllers/
      auth.controller.js
      admin.controller.js
      timesheet.controller.js
    middlewares/
      auth.middleware.js
      error.middleware.js
      role.middleware.js
    routes/
      auth.routes.js
      admin.routes.js
      timesheet.routes.js
    services/
      excel.service.js
      timesheet.service.js
    utils/
      async-handler.js
      http-error.js
      time.js
```

### Frontend

```text
fe-ts/
  .env.example
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    App.tsx
    App.css
    index.css
    main.tsx
    vite-env.d.ts
    api/
      client.ts
    components/
      AdminPanel.tsx
      LoginCard.tsx
      TimesheetEditor.tsx
    lib/
      calendar.ts
    types.ts
  public/
    manifest.json
    robots.txt
```

## Database Schema

Prisma is the source of truth for the schema.

### Users

- `id`
- `name`
- `roleSystem` -> `admin` / `user`
- `roleJob`
- `department`
- `location`
- `project`
- `teamLeadName`
- `deptHeadName`
- `username`
- `password`
- `createdAt`
- `updatedAt`

### Timesheets

- `id`
- `userId`
- `period` -> `YYYY-MM`
- `status` -> `draft` / `submitted` / `approved`
- `createdAt`
- `updatedAt`

### Timesheet Entries

- `id`
- `timesheetId`
- `date`
- `dayName`
- `startTime`
- `lunchBreak`
- `endTime`
- `totalHours`
- `activity`

### Holidays

- `id`
- `date`
- `name`
- `isActive`
- `createdAt`
- `updatedAt`

Relationship:

- One user has many timesheets
- One timesheet has many entries
- One timesheet belongs to one user

## Environment Setup

### Backend `.env`

Copy `be-ts/.env.example` to `be-ts/.env` and adjust your MySQL credentials.

Required variables:

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

Note:

- `DATABASE_URL` is required by Prisma.
- `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` are kept for clarity and ops parity.

### Frontend `.env`

Copy `fe-ts/.env.example` to `fe-ts/.env`.

```env
VITE_API_URL=http://localhost:4000/api
```

## Install & Run

### 1. Backend

```bash
cd be-ts
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 2. Frontend

```bash
cd fe-ts
npm install
npm run dev
```

## Seeder Accounts

The seed creates 2 users:

- Admin
  - Username: `admin`
  - Password: `Admin123!`
- User
  - Name: `Jonathan Zefanya`
  - Role: `Programmer`
  - Department: `PSI`
  - Location: `BPJS Kesehatan Pusat`
  - Project: `VClaim`
  - Team Lead: `Muhammad Yazid Al Qahar`
  - Dept Head: `Agung Tri Mulyanto`
  - Username: `jonathan.zefanya`
  - Password: `User123!`

## API Overview

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### User timesheet

- `GET /api/timesheets/me?period=YYYY-MM`
- `GET /api/timesheets/me/detail?period=YYYY-MM`
- `PUT /api/timesheets/me/:period/entries`
- `POST /api/timesheets/me/:period/submit`
- `GET /api/timesheets/me/:period/export`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/timesheets`
- `POST /api/admin/timesheets`
- `GET /api/admin/timesheets/:id`
- `PUT /api/admin/timesheets/:id`
- `DELETE /api/admin/timesheets/:id`
- `GET /api/admin/timesheets/:id/export`
- `GET /api/admin/holidays`
- `POST /api/admin/holidays`
- `PUT /api/admin/holidays/:id`
- `DELETE /api/admin/holidays/:id`

## Excel Export Rules

Implemented with `exceljs`:

- Company header
- Title `TIME SHEET`
- Employee info block
- Daily table columns:
  - Day
  - Date
  - Start time
  - Lunch Break
  - End Time
  - Total Hours
  - Activity / Remark
- Signature footer:
  - Pemohon
  - Mengetahui
  - Mengetahui

Weekend rows are locked to blank time fields and the activity is set to the day name. Holiday dates are sourced from the holiday master table in MySQL and are also treated as locked rows during export.

## Workflow

1. Run MySQL locally and create the target database.
2. Fill `be-ts/.env` and `fe-ts/.env`.
3. Run migration and seed.
4. Start backend and frontend.
5. Login using the seeded account.
6. Fill the monthly timesheet.
7. Admin users can manage employee master data, holiday master data, and timesheet records directly from the dashboard.
8. Save, submit, or export Excel.

## Notes

- Lunch break is stored as a duration string in `HH:mm` format in the current starter.
- The backend uses Prisma for relations and migration handling.
- The frontend UI is intentionally styled as a polished product dashboard rather than a plain admin form.
