# Proteccio Enterprise HRMS — Learn the Codebase From Zero

A guided walkthrough of this full-stack HRMS so you can understand, explain, and defend
every line in an interview. Start at the top and read straight through; every concept is
explained in plain terms before it is used.

---

## 1. What this project is

A web application that manages an entire company's HR operations: employees, attendance,
leave, payroll, recruiting, expenses, tasks, and a **generic Workflow Engine** that routes
approval requests through a configurable chain of approvers.

It is built as two separate programs that talk over HTTP:

```
┌────────────┐   HTTP (JSON)   ┌────────────┐   SQL   ┌───────────────────┐
│  Frontend   │ ───────────────> │   Backend   │ ───────> │   PostgreSQL      │
│  React app  │                 │ Express API │         │   (Docker)        │
│  port 5173  │ <─────────────── │  port 4000  │ <─────── │  hrms-postgres    │
└────────────┘                  └────────────┘         │  host port 5433   │
```

- **Frontend** — React + Vite. A single-page app. The browser fetches data from the API
  and renders it. Code lives in `frontend/`.
- **Backend** — Node + Express + TypeScript + Prisma. A REST API that owns the database.
  Code lives in `backend/`.
- **Database** — PostgreSQL running in Docker. The backend is the only thing that talks to
  it directly.

> "Two-server architecture" is the key mental model: the React app never touches the DB,
> and the API never renders HTML. They only exchange JSON.

### The most important rule in the codebase (the "response envelope")

Every backend endpoint returns JSON shaped like `{ "data": ... }` (and optionally
`"total"` for lists). Every frontend service function resolves to that envelope. That one
convention is why the frontend and backend fit together so cleanly — see §9.

---

## 2. Running the project

### One command

At the repo root there are two scripts:

```bat
start-all.cmd   :: starts Postgres (if stopped), the API, and the frontend
stop-all.cmd    :: stops the API and the frontend (Postgres is left running)
```

`start-all.cmd` uses `start` so each server opens in its own terminal window:

- API on `http://localhost:4000` — runs `backend/` → `npm run build && node dist/index.js`
- Frontend on `http://localhost:5173` — runs `frontend/` → `npm run dev`

### Manual start (for development)

```bat
:: Terminal 1 — API (needs the DB first)
cd backend
npm install
npm run dev          :: tsx watch, auto-restarts on file save

:: Terminal 2 — frontend
cd frontend
npm install
npm run dev          :: Vite dev server with hot reload
```

### Database

The only external dependency is a PostgreSQL database. A Dockerfile + `docker-compose.yml`
at the repo root create the container `hrms-postgres` and map it to **host port 5433**
(port 5432 is deliberately avoided — it is usually taken by a local Postgres install).

```bat
docker compose up -d     :: create/start the DB container
```

`backend/.env` sets `DATABASE_URL=postgresql://...localhost:5433/hrms_db`. **`.env` files
are never changed** — they are the source of truth for ports, secrets, and the API base URL.

### Demo credentials

All seeded accounts use the password `Password@123` (see `DEMO_CREDENTIALS.md`):

| Role     | Email                       | Employee | Person                 |
|----------|-----------------------------|----------|-------------------------|
| ADMIN    | robert.king@company.com     | EMP010   | Robert King (CEO)      |
| HR       | lewis.hamilton@company.com  | EMP011   | lewis hamilton         |
| MANAGER  | alice.quinn@company.com     | EMP005   | Alice Quinn            |
| EMPLOYEE | matsya.singh@company.com    | EMP001   | Matsya Singh           |

The login page has one-click demo buttons for these four.

---

## 3. Tech stack

| Layer      | Technology                                   | Why it matters here                          |
|------------|----------------------------------------------|----------------------------------------------|
| Frontend   | React 18, Vite, React Router v7, axios       | SPA, lazy-loaded routes, axios interceptors  |
| Backend    | Node, Express 4, TypeScript                  | REST API, middleware pipeline                |
| DB access  | Prisma ORM (schema-first)                    | Models defined once in `schema.prisma`       |
| Database   | PostgreSQL 16 (Docker)                       | UUIDs, JSONB columns                         |
| Auth       | JWT (access + refresh), bcryptjs             | Stateless access tokens, rotating refresh    |
| Validation | Zod (backend), no TS on frontend             | Runtime request validation                   |
| Misc       | helmet, cors, express-rate-limit, pino       | Security headers, logging, rate limiting     |

Note: the frontend is plain JavaScript (`.jsx`), the backend is TypeScript (`.ts`).

---

## 4. Backend — how it is organized

```
backend/
├─ prisma/
│  ├─ schema.prisma        ← THE data model (all tables)
│  ├─ migrations/         ← auto-generated SQL migration history
│  └─ seed.ts             ← demo data: employees, roles, permissions, workflow defs
└─ src/
   ├─ index.ts            ← entry: starts the HTTP server
   ├─ app.ts              ← Express app: middleware + route mounting
   ├─ routes/index.ts     ← top-level router, mounts every module's routes
   ├─ config/env.ts       ← reads & validates environment variables
   ├─ lib/                ← shared utilities (jwt, prisma, errors, response, logger)
   ├─ middlewares/        ← auth, rbac, validate, rateLimiter, errorHandler
   ├─ serializers/        ← transform DB rows into the API's JSON shapes
   ├─ services/audit.service.ts
   └─ modules/
      ├─ auth/            ← login/logout/refresh/me/change-password
      ├─ employees/       ← CRUD, search, org-ref resolution
      ├─ attendance/
      ├─ leave/
      ├─ payroll/
      ├─ search/
      └─ workflow/        ← NEW: the generic approval engine (see §7)
```

### The three core contracts

1. **`lib/prisma.ts`** exports one shared `PrismaClient`. Any module imports `prisma` and
   calls `prisma.<model>.<method>()`.
2. **`lib/response.ts`** exports `sendSuccess(res, data, total?)` which always responds
   `{ data }` (or `{ data, total }`).
3. **`lib/errors.ts`** exports `AppError` with static constructors
   (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`) that
   set both an HTTP status and a stable `code` string.

### The module pattern (used by every feature)

Every feature is a self-contained `modules/<name>/` folder with four files:

```
workflow/
├─ workflow.routes.ts      ← route definitions + Zod validation + permission guards
├─ workflow.controller.ts  ← thin HTTP layer: parse req, call service, send response
├─ workflow.service.ts     ← ALL business logic & database access
└─ (serializer lives in src/serializers/)
```

The dependency chain is one-directional and always the same:

```
HTTP request
   ↓
express routes (URL → method + middleware)
   ↓
controller  (reads req.params/query/body, calls the service)
   ↓
service     (validation/business rules/Prisma queries; throws AppError on problems)
   ↓
serializer  (maps DB rows → clean JSON)
   ↓
sendSuccess (wraps in { data })
   ↓
HTTP response
```

### The middleware chain (`app.ts`)

Requests pass through, in order: **helmet** (security headers) → **cors** →
**pino-http** (logging + request id) → **json body parser** → **global rate limit** →
**`/api` routes** → **404 handler** → **error handler**.

Each route then runs its own middleware: `authenticate` (verify JWT) →
`requirePermission("module:action")` (RBAC) → `validate({ body/query })` (Zod) → the
controller.

### Auth, RBAC, and the JWT

- On login, the backend verifies the password (bcrypt), then returns three things:
  an **access token** (JWT, ~15 min), a **refresh token** (JWT, 7 days), and the **user +
  permissions** list.
- The access token payload (`lib/jwt.ts`) carries `sub` (user id), `role`, `permissions`,
  `employeeId` (DB UUID) and `employeeCode` (e.g. `EMP005`). The `authenticate` middleware
  verifies it and stuffs it onto `req.auth`.
- Permissions are strings like `employees:read`, `workflows:approve`. They are stored in
  the DB (`roles`, `permissions`, `role_permissions`) and seeded from `seed.ts`, mirroring
  the frontend's `ROLE_PERMISSIONS`.
- `middlewares/rbac.ts` `requirePermission("a|b")` grants access if the user has **any**
  listed permission (OR). This is how managers can approve steps without being able to
  manage definitions.
- Refresh tokens are **rotating**: each refresh invalidates the previous token
  (`sha256(jti)` stored in the DB). Reusing an old one is treated as a revoked token.
- Login is rate-limited (20 attempts / 15 min) and a lockout counter lives in the DB.

### Serializers — why they exist

Prisma rows contain UUIDs, `Date` objects, and nested relations. The API must return
human-friendly shapes (dates as ISO strings, employee codes instead of UUIDs, no password
hashes). Each serializer is a pure function: DB row in → JSON out. The workflow serializer
(`src/serializers/workflow.serializer.ts`) sorts steps and flattens nested relations.

---

## 5. Frontend — how it is organized

```
frontend/src/
├─ main.jsx                ← React entry (mounts <App/>)
├─ App.jsx                 ← providers: <AuthProvider> <SearchProvider> <AppRouter/>
├─ index.css               ← global styles + CSS variables (--primary, --card, …)
├─ routes/AppRouter.jsx    ← all routes; every page is lazy-loaded
├─ context/
│  ├─ AuthContext.jsx      ← user/role/permissions + login()/logout()/restore
│  └─ SearchContext.jsx    ← global search (backend /api/search)
├─ components/
│  ├─ layout/              ← MainLayout, Navbar (bell + user menu), Sidebar
│  ├─ auth/                ← RequireAuth (route guard)
│  ├─ shared/              ← PageHeader, StatusBadge, Spinner, EmptyState, Modal…
│  └─ dashboard/
├─ services/               ← one file per module; every function hits the API
├─ pages/<Module>/         ← one folder per module page
└─ mock/                   ← frontend-only demo data for modules not yet wired to API
```

### Boot sequence (what happens when the app loads)

1. `main.jsx` mounts `<App/>`.
2. `<AuthProvider>` initializes. On mount it reads the stored access token and calls
   `GET /auth/me` to restore the session (or clears it if the token is dead).
3. `<SearchProvider>` mounts (powers the navbar search box).
4. `<AppRouter>` renders. If not logged in, `RequireAuth` redirects to `/login`.
5. Each route is lazy-loaded (`lazy(() => import(...))`) so the initial bundle stays small
   and each module only loads when you visit it.
6. Every page renders inside `<MainLayout>` (navbar + sidebar + content area).

### `services/api.js` — the single axios instance

This is the connective tissue. It:

- sets `baseURL` from `VITE_API_URL` (`frontend/.env` → `http://localhost:4000/api`);
- **attaches the access token** to every request from `localStorage` (`hrms_token`);
- **silently rotates** the token: on a `401`, it calls `/auth/refresh` with the stored
  refresh token, saves the new tokens, and retries the original request once
  (concurrent 401s share a single refresh call);
- if rotation fails, it clears the session and redirects to `/login`;
- re-throws errors as a clean `{ status, message }` object (no raw stack traces).

### The service layer pattern

Every module has a service file, e.g. `services/leaveService.js`:

```js
export const getLeaveRequests = async ({ employeeId, status } = {}) => {
  const res = await api.get("/leave/requests", { params: { employeeId, status } });
  return res.data;          // → { data: [...], total: n }
};
```

Pages call these and read `result.data`. That is the entire frontend/backend contract.
`services/Workflowengineservice.js` follows the same pattern for `/workflow/*`.

### How a page is built

Pages are function components that use `useAuth()` for the current user, call service
functions in `useEffect`, and render with the shared components and CSS variables. Example
anatomy (see `pages/WorkflowEngine/WorkflowEngine.jsx`):

```jsx
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import { useAuth } from "../../context/AuthContext";
import * as wf from "../../services/Workflowengineservice";

export default function WorkflowEngine() {
  const { user, permissions } = useAuth();       // user.id is the employee code
  const [instances, setInstances] = useState([]);

  useEffect(() => {                              // load data once on mount
    let cancelled = false;
    wf.getInstances().then((res) => { if (!cancelled) setInstances(res.data); });
    return () => { cancelled = true; };
  }, []);

  return (
    <MainLayout>
      <PageHeader title="Workflow Engine" subtitle="..."/>
      ...table of instances with Approve/Reject buttons...
    </MainLayout>
  );
}
```

### Permissions-driven navigation

`components/layout/Sidebar.jsx` declares each menu item with a `permission` string and
only shows it if `permissions.includes(\`${permission}:read\`)`. So the "Workflows" item
only appears for users holding `workflows:read`. The backend enforces the same permission
on the API — the sidebar is just UX; the API is the real gate.

---

## 6. The Workflow Engine module (backend) — worked example

The best way to learn the module pattern is to read the workflow module end to end:
`backend/src/modules/workflow/` + `backend/src/serializers/workflow.serializer.ts`.

### The data model (`prisma/schema.prisma`)

Four tables (plus a boolean flag on `Employee`):

- **`workflow_definitions`** — an approval template, e.g. "Leave Request — Extended".
  Has a status (`Active`/`Inactive`) and owns ordered steps.
- **`workflow_definition_steps`** — one approval slot: a `name`, an `approverRule`
  (`Direct Reporting Manager`, `Department Head`, `Named Role: Finance`, `Named Role: HR`),
  an SLA in hours, an optional `parallelGroup` (steps with the same group must all be
  approved before the flow moves on), and an optional `condition` (JSON like
  `{ field: "duration_days", operator: ">", value: 5 }`).
- **`workflow_instances`** — one concrete request. It snapshots the requester, a `status`,
  a `currentStepIndex`, and the minimal `attributes` (JSON) the engine needs to evaluate
  conditions. **Data minimization**: the full originating record is never stored here.
- **`workflow_instance_steps`** — the instance's snapshot of each applicable step, with the
  resolved approver (`approverId` is an employee code or a `role-*` pseudo-id), whether
  self-approval was blocked, escalation info, and who acted when.
- **`workflow_events`** — append-only event log (`submitted`, `step_approved`, `rejected`,
  `escalated`, …).
- **`Employee.isDepartmentHead`** — a boolean used to resolve the "Department Head" rule.

Because instances snapshot their steps, an in-flight request keeps its original approver
chain even if the definition is edited or deactivated afterwards (versioning by snapshot).

### The API surface (`workflow.routes.ts`)

| Method & path                            | Permission            | Purpose                                |
|------------------------------------------|-----------------------|----------------------------------------|
| GET  `/workflow/roster`                  | any workflow perm     | employees for dropdowns                |
| GET  `/workflow/definitions`             | any workflow perm     | list templates                         |
| POST `/workflow/definitions`             | `workflows:write`     | create a template                      |
| PUT  `/workflow/definitions/:id/deactivate` | `workflows:write`   | soft-disable                           |
| DELETE `/workflow/definitions/:id`       | `workflows:write`     | hard delete (blocked if in-flight refs)|
| GET  `/workflow/instances`               | any workflow perm     | list requests                          |
| POST `/workflow/instances`               | any workflow perm     | submit a request (starts a chain)      |
| POST `/workflow/instances/:id/act`       | `workflows:write` **or** `workflows:approve` | approve/reject |
| POST `/workflow/instances/:id/assign`    | `workflows:write`     | HR assigns an approver after a failure |
| POST `/workflow/sla-check`               | `workflows:write`     | escalate overdue steps                 |
| GET  `/workflow/events`                  | any workflow perm     | the event log                          |

Note `requirePermission("workflows:read|workflows:write|workflows:approve")` — the OR
syntax lets employees and managers view, while only managers/HR/ADMIN can act.

### The engine rules (`workflow.service.ts`)

1. **Approver resolution** (`resolveOne`): the engine looks up live org data at submit time —
   the requester's `reportingManager`, a department head flagged `isDepartmentHead`, or a
   named role.
2. **Golden Rule #5 — no self-approval** (`resolveWithSelfApprovalGuard`): if a data
   anomaly would make the requester their own approver, the engine walks **one level up the
   reporting line**; if no valid next approver exists, the instance is flagged
   `Approver Resolution Failed` so HR can manually assign.
3. **Condition filtering**: only definition steps whose `condition` matches the submitted
   `attributes` are instantiated. Missing attribute ⇒ step skipped.
4. **Parallel groups**: an instance advances only when *every* step in the current group is
   approved (sequential steps are groups of one).
5. **First action wins**: `actOnStep` claims a step with
   `updateMany({ where: { id, status: "Pending" } })` inside a transaction. If the row is no
   longer pending, the action is rejected — a double-click or second approver can never
   double-count.
6. **Reject is terminal**: any reject flips the whole instance to `Rejected` immediately.
7. **SLA escalations**: `runSlaCheck` finds pending steps older than their SLA and adds the
   approver's manager (or `role-hr`) as an *additional* eligible actor — the original
   approver can still act.
8. **Role steps** (`role-finance`, `role-hr`) can only be acted on by users holding
   `workflows:write` (ADMIN/HR) — passed from the controller as `bypassRoleApprover`.

### The lifecycle of one request

1. EMP001 submits a "Leave Request — Extended" with `{ duration_days: 7 }`.
2. The engine sees 2 definition steps. Condition `duration_days > 5` matches, so both are
   instantiated. Resolver: step 1 → Alice (EMP001's manager), step 2 → department head
   (Engineering → Alice too).
3. `workflow_instances` + 2 `workflow_instance_steps` + 1 `workflow_events` row are created.
4. Alice approves step 1 → current index advances to 1; an event is logged.
5. Alice approves step 2 → all steps done → instance `Approved`; an event is logged.
6. The frontend refetches instances + events and the UI reflects the new status.

---

## 7. Frontend Workflow Engine page

`frontend/src/pages/WorkflowEngine/WorkflowEngine.jsx` is a real, API-backed page with
three tabs:

- **Instances & Approvals** — a table of every request. Each row expands the approval chain
  as step cards. A step shows an Approve/Reject button only when *you* are the eligible
  approver (`user.id === step.approverId`, or the step's `approverId` is a `role-*` and you
  hold `workflows:write`). Resolution-failed instances show a "Assign approver" action for
  HR.
- **Definitions** — the templates with their steps, conditions, parallel groups, and
  Deactivate/Delete actions (write access only).
- **Event Log** — a chronological feed from `/workflow/events`.

The header has **Submit request** (pick a definition + requester + attributes JSON) and
**Run SLA check** (calls `POST /workflow/sla-check`).

Eligibility is re-implemented on the client for *display* only — the backend is the
authority and rejects ineligible actors regardless.

---

## 8. End-to-end flows worth knowing

### Login → authenticated request → refresh → logout

1. `POST /auth/login` → access token + refresh token + user + permissions saved to
   `localStorage` (`hrms_token`, `hrms_refresh`, `hrms_role`, `hrms_permissions`).
2. Every later request gets `Authorization: Bearer <hrms_token>` from the axios interceptor.
3. If the access token expires (15 min), the API returns 401, the interceptor calls
   `/auth/refresh` with the refresh token, stores the new pair, retries the request.
4. Logout calls `POST /auth/logout` with the token; the backend revokes the refresh token,
   so a stale refresh can no longer be used (refresh-after-logout → 401
   "Refresh token is invalid or revoked").

### List employees

`GET /employees?search=&department=&status=` → controller passes filters to the service →
Prisma builds a `where` with `OR` on names/email/code/designation → serializer maps each row
(manager name, department, designation) → `{ data, total }` → the Employees page renders.

### Approve a leave request

`PUT /leave/:id/approve` requires `leave:approve`. The service loads the request, checks
the approver isn't the requester and has a valid status, updates the row, adjusts the
employee's used leave days in a transaction, and writes an audit entry.

---

## 9. How to add a new module (the recipe)

Suppose you were asked to add "Claims". You would:

**Backend**
1. Add tables to `prisma/schema.prisma` (e.g. `Claim`, `ClaimItem`).
2. `npx prisma migrate dev --name claims` → generates SQL + the Prisma Client.
3. Create `src/modules/claims/claims.routes.ts`, `claims.controller.ts`, `claims.service.ts`,
   and a serializer in `src/serializers/claims.serializer.ts`. Copy the workflow module as a
   template.
4. Add permission strings to `PERMISSIONS` + `ROLE_PERMISSIONS` in `prisma/seed.ts` and
   reseed (`npm run prisma:seed`).
5. Mount the router in `src/routes/index.ts` (`router.use("/claims", claimsRoutes)`).
6. `npm run typecheck && npm run build`, restart the server.

**Frontend**
7. Create `services/claimService.js` using `api.get/post/...` returning `res.data`.
8. Create `pages/Claims/Claims.jsx` (copy an existing page's structure, use
   `<MainLayout>`/`<PageHeader>`/shared components).
9. Add a lazy route + sidebar entry with `permission: "claims"`.

---

## 10. Common commands

```bat
:: Backend
cd backend
npm run dev              :: hot-reload dev server
npm run typecheck        :: TypeScript check (no emit)
npm run build            :: compile to dist/
npm start                :: run the compiled server (node dist/index.js)
npm run prisma:migrate   :: prisma migrate dev (apply schema changes)
npm run prisma:seed      :: wipe + reseed demo data
npm run lint             :: eslint on src + prisma

:: Frontend
cd frontend
npm run dev              :: Vite dev server
npm run build            :: production build
npx eslint src/<file>    :: lint one file

:: Database
docker compose up -d     :: start Postgres
```

### Troubleshooting

- **`EPERM ... query_engine-windows.dll`** when running `prisma generate` — the running API
  server holds the Prisma engine DLL open. Stop the API (`stop-all.cmd` or kill the
  `node dist/index.js` process), then regenerate.
- **Port 4000 / 5173 in use** — check with `netstat -ano | findstr "4000 5173"` and kill the
  PID, or the servers will fail to bind.
- **Database connection refused** — is `docker ps` showing `hrms-postgres` as healthy?
- **401 loops after editing roles/permissions** — reseed the DB; tokens only carry the
  permissions that were in the token at login, so log out and back in after reseeding.
- **Refresh token not working** — remember the API reads the raw `refreshToken` from the
  request body (sent by `api.js`), not from any cookie.

---

## 11. What is real vs. mock

The core HR modules are fully wired to the API: **auth, employees, attendance, leave,
payroll, search, and workflow**. Their pages call real services that hit the backend.

Many of the remaining 23 modules (recruiting, LMS, assets, expenses, travel, performance,
security, …) are **frontend-only demos**: their pages render from `frontend/src/mock/*.js`
data and their services still read the mock. They exist so every menu item works in the
demo, but they have no backend route yet. `HOW_TO_RUN.md` and `DEMO_CREDENTIALS.md`
document the current demo state.

If a new feature asks to "make X real", the recipe in §9 shows exactly how each module was
converted from mock → service → backend.

---

## 12. The single biggest idea

**Everything flows through one HTTP contract.** The backend always returns `{ data }` (or
`{ data, total }`) with `AppError`-driven `{ status, message, code }` failures; the
frontend's axios instance handles auth, errors, and token rotation in exactly one place;
every service returns `res.data`; every page reads `result.data`. Once you internalize that
contract — and the module pattern on both sides — you can read any file in this repo and
know immediately what it does and where it plugs in.
