# Enterprise HRMS

A full-stack Enterprise Human Resource Management System covering the employee lifecycle — from recruitment through separation. React (Vite) frontend + Node.js/Express + TypeScript + Prisma/PostgreSQL backend, with JWT auth and role-based access control.

## Current Status

Production-shaped, demo-complete. The core modules are wired to a **real REST API + PostgreSQL**:

- Authentication & RBAC (JWT, admin / hr / manager / employee roles)
- Employees (list, profile, add)
- Attendance, Leave, Payroll
- Global search
- **Workflow Engine** (definitions, instances, approval steps, parallel groups, conditions, SLA escalation, event log) — fully implemented on backend + frontend

Remaining modules are frontend placeholders only. See `LEARN.md` §11 for the real-vs-mock module list.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router, TanStack Query, Axios, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT access + rotating refresh tokens, RBAC |

## Repository Layout

```
enterprise-hrms/
├── backend/        # Express + TS API, Prisma schema + migrations + seed
├── frontend/       # React SPA (Vite)
├── docs/           # Design docs (ARCHITECTURE, API, DATABASE, ...)
├── start-all.cmd   # One-command startup (Windows)
├── stop-all.cmd    # Stop servers
├── HOW_TO_RUN.md   # Step-by-step run guide
├── DEMO_CREDENTIALS.md
├── LEARN.md        # 0-knowledge codebase walkthrough
└── docker-compose.yml
```

## Quick Start (Windows)

Requirements: **Node.js 18+**, **Docker Desktop running**, Git.

```bash
git clone <repo-url>
cd enterprise-hrms
start-all.cmd
```

`start-all.cmd` performs first-time setup automatically (installs deps, creates `.env` files, starts PostgreSQL, applies migrations, seeds demo data) then launches backend (`:4000`) and frontend (`:5173`).

Open `http://localhost:5173` and log in — accounts are in `DEMO_CREDENTIALS.md` (password `Password@123`).

To reset demo data later: delete `.hrms-seeded` and run `start-all.cmd` again.

## Manual Setup (non-Windows / custom)

```bash
# 1. Database
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env        # edit if needed
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev                 # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## Environment Variables

| File | Variable | Default | Purpose |
|------|----------|---------|---------|
| `backend/.env` | `DATABASE_URL` | `postgresql://hrms_admin:hrms_password@localhost:5433/hrms_db` | Postgres DSN (host port 5433 per docker-compose) |
| `backend/.env` | `JWT_SECRET` / `REFRESH_SECRET` | demo secrets | Signing keys |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:4000/api` | Backend base URL |

## Documentation Index

| Document | Description |
|----------|-------------|
| [HOW_TO_RUN.md](HOW_TO_RUN.md) | Step-by-step run guide |
| [LEARN.md](LEARN.md) | 0-knowledge codebase walkthrough |
| [DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md) | Demo login accounts |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design |
| [docs/API.md](docs/API.md) | API endpoints and service layer |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema and ER diagram |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Auth flow and security |
