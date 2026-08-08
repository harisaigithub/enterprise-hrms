# Proteccio Enterprise HRMS — Backend API

REST API for the Enterprise HRMS built with **Node.js + Express + TypeScript + Prisma + PostgreSQL**.

## Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Runtime    | Node.js 20+                                 |
| Framework  | Express 4                                   |
| Language   | TypeScript                                  |
| ORM        | Prisma (PostgreSQL)                         |
| Auth       | JWT access (15 min) + rotating refresh (7d) |
| Validation | Zod                                         |
| Logging    | pino                                        |

## Quick start

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Configure environment
cp .env.example .env
#   → update JWT secrets with long random strings

# 3. Install + generate Prisma client
npm install
npm run prisma:generate

# 4. Create schema + migrations
npm run prisma:migrate

# 5. Seed demo data (15 employees, roles, leave, attendance, payroll)
npm run prisma:seed

# 6. Run the API (dev, hot reload)
npm run dev
```

Health check: `GET http://localhost:4000/api/health`

## Demo logins

All seeded users share the password `Password@123`:

| Role     | Email                    | Name          |
| -------- | ------------------------ | ------------- |
| ADMIN    | robert.king@company.com  | Robert King   |
| HR       | lewis.hamilton@company.com | lewis hamilton |
| MANAGER  | alice.quinn@company.com  | Alice Quinn   |
| EMPLOYEE | matsya.singh@company.com | Matsya Singh  |

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma        # 19 tables (15 documented + payroll + refresh tokens)
│   └── seed.ts              # demo data mirroring frontend mocks
├── src/
│   ├── config/env.ts        # validated env config
│   ├── lib/                 # prisma, jwt, password, errors, response, logger
│   ├── middlewares/         # auth, rbac, validate, rateLimit, errorHandler
│   ├── modules/
│   │   ├── auth/            # login, logout, refresh, me, change-password
│   │   ├── employees/       # CRUD + list (search/filter/pagination)
│   │   ├── attendance/      # check-in/out, list, team summary
│   │   ├── leave/           # types, balance, requests, apply, approve, reject
│   │   ├── payroll/         # runs, payslips, process, approve
│   │   └── search/          # global search
│   ├── serializers/         # DB (snake_case/UUID) → frontend DTO (camelCase/codes)
│   ├── routes/index.ts      # API route wiring
│   ├── app.ts               # Express app (helmet, cors, rate limit, error handling)
│   └── index.ts             # server bootstrap
```

## Response envelope

All endpoints return the same envelope used by the frontend services:

```json
{ "data": { ... } }          // single resource
{ "data": [ ... ], "total": n }  // list
{ "status": 401, "message": "...", "code": "UNAUTHORIZED" }  // error
```

## Endpoints

| Method | Route                                   | Permission        |
| ------ | --------------------------------------- | ----------------- |
| POST   | /api/auth/login                         | public            |
| POST   | /api/auth/refresh                       | public            |
| POST   | /api/auth/logout                        | authenticated     |
| POST   | /api/auth/change-password               | authenticated     |
| GET    | /api/auth/me                            | authenticated     |
| GET    | /api/employees                          | employees:read    |
| GET    | /api/employees/:id                      | employees:read    |
| POST   | /api/employees                          | employees:write   |
| PUT    | /api/employees/:id                      | employees:write   |
| DELETE | /api/employees/:id                      | employees:delete  |
| GET    | /api/attendance                         | attendance:read   |
| GET    | /api/attendance/summary                 | attendance:read   |
| POST   | /api/attendance/check-in                | attendance:write  |
| POST   | /api/attendance/check-out               | attendance:write  |
| GET    | /api/leave/types                        | leave:read        |
| GET    | /api/leave/balance                      | leave:read        |
| GET    | /api/leave/requests                     | leave:read        |
| POST   | /api/leave/apply                        | leave:write       |
| PUT    | /api/leave/:id/approve                  | leave:approve     |
| PUT    | /api/leave/:id/reject                   | leave:approve     |
| GET    | /api/payroll/runs                       | payroll:read      |
| GET    | /api/payroll/runs/:id                   | payroll:read      |
| POST   | /api/payroll/runs/:id/process           | payroll:write     |
| POST   | /api/payroll/runs/:id/approve           | payroll:approve   |
| GET    | /api/payroll/payslips                   | payroll:read      |
| GET    | /api/payroll/payslips/:id               | payroll:read      |
| GET    | /api/search?q=                          | authenticated     |

## Scripts

```bash
npm run dev            # dev server (hot reload)
npm run build          # compile TS → dist/
npm run start          # run compiled output
npm run typecheck      # tsc --noEmit
npm run prisma:generate
npm run prisma:migrate # create & apply migrations
npm run prisma:deploy  # apply migrations in production
npm run prisma:seed
```
