# How to Run — Proteccio Enterprise HRMS

Two apps, run locally:

| App      | Folder     | URL                    | Tech                             |
|----------|------------|------------------------|----------------------------------|
| Backend  | `backend/` | http://localhost:4000  | Express + TypeScript + Prisma    |
| Frontend | `frontend/`| http://localhost:5173  | React + Vite                    |
| Database | Docker     | localhost:5433 (Postgres) | postgres:16-alpine            |

> **Note:** Docker Postgres maps to host port **5433** because a local Postgres
> already occupies 5432 on this machine. `backend/.env` already points to 5433.

---

## 0. One-command start (recommended)

```bash
start-all.cmd
```

> **If Docker is failing or not installed:** You can use `start-local.cmd` instead. It will skip checking for Docker and use your local Postgres instance running on port 5432 directly.

```bash
start-local.cmd
```

That single command:
1. performs first-time setup automatically — installs dependencies, creates
   `backend/.env` and `frontend/.env` from their `.env.example` files
2. starts the Postgres container (`docker compose up -d db`)
3. applies migrations and seeds demo data **once** (guarded by a `.hrms-seeded`
   marker; delete it to re-seed)
4. opens a **Backend** window → http://localhost:4000
5. opens a **Frontend** window → http://localhost:5173

Then open http://localhost:5173 and log in.

Stop everything with:

```bash
stop-all.cmd
```

> First time only (dependencies + database schema + demo data) — run the
> steps in sections 1–3 once before relying on the one-command start.

---

## 1. Start the database (Docker)

```bash
docker compose up -d db
```

Verify it's healthy:

```bash
docker compose ps        # look for "db ... Up ... (healthy)"
```

## 2. Start the backend API

```bash
cd backend
npm install              # only the first time
copy .env.example .env   # only the first time (already done on this machine)
npx prisma migrate deploy  # only the first time — applies committed migrations
npm run prisma:seed      # only the first time — loads demo data
npm run build            # compiles TypeScript -> dist/
npm run start            # node dist/index.js
```

Expected output:

```
{"level":30,...}  listening on 4000  (pino log)
```

Quick check — open http://localhost:4000/api/health in a browser; it should
return `{"data":{"status":"ok","db":"up",...}}`.

> During development you can use `npm run dev` instead — it auto-reloads on save.

## 3. Start the frontend

```bash
cd ../frontend
npm install              # only the first time
npm run dev              # Vite dev server
```

Open http://localhost:5173 — you'll land on the login screen.

## 4. Log in (demo accounts)

All passwords are **`Password@123`** (full list: `DEMO_CREDENTIALS.md`).

| Role     | Email                          |
|----------|--------------------------------|
| Admin    | robert.king@company.com        |
| HR       | lewis.hamilton@company.com     |
| Manager  | alice.quinn@company.com        |
| Employee | matsya.singh@company.com       |

The login screen also has one-click buttons for these four.

## 5. Reset the demo data (any time)

```bash
cd backend
npm run prisma:seed      # wipe + reseed
```

## 6. Stop everything

```bash
docker compose down      # stops the database container
# Ctrl+C in the terminals running the backend and frontend
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `P1000: Authentication failed` when migrating | Docker Postgres port is shadowed by a local install → `docker compose up -d db`, confirm `docker compose ps` shows healthy, check `DATABASE_URL` in `backend/.env` uses port **5433** |
| `prisma migrate dev` hangs asking for a name | Run `npx prisma migrate deploy` to apply committed migrations |
| Frontend can't reach API | Confirm `frontend/.env` has `VITE_API_URL=http://localhost:4000/api` and the backend is running |
| Port 4000 in use | `netstat -ano \| findstr :4000`, kill the PID, or change `PORT` in `backend/.env` |
