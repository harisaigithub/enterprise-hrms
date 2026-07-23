# TODO Report

## Explicit TODO Comments in Code

### `src/context/AuthContext.jsx`

```
Line 5-7:   "TODAY: Mock auth — role is set from localStorage with a fallback to 'HR'."
            "FUTURE: Replace mockLogin with a real JWT POST /api/auth/login call."
Line 110-115: Block-commented FUTURE login implementation (3 lines)
Line 129:    "FUTURE: window.location.href = '/login';"
```

### `src/services/api.js`

```
Line 3-7:   "TODAY: All calls resolve with mock data — no real network request."
            "FUTURE: Set VITE_API_URL in .env and remove the mock imports from each service file."
Line 37:    "FUTURE: window.location.href = '/login';"
```

### `src/services/employeeService.js`

```
Line 1-6:   Block comment describing FUTURE swap to real API
```

### `src/services/attendanceService.js`

```
Line 1-5:   Block comment describing FUTURE swap to real API
```

### `src/services/leaveService.js`

```
Line 1-5:   Block comment describing FUTURE swap to real API
```

### `src/services/payrollService.js`

```
Line 1-5:   Block comment describing FUTURE swap to real API
```

## Empty Components (Zero Content)

| File | Path | Size |
|------|------|------|
| Login page | `frontend/src/pages/Login/Login.jsx` | 0 bytes |
| Settings page | `frontend/src/pages/Settings/Settings.jsx` | 0 bytes |
| Dashboard CSS | `frontend/src/styles/dashboard.css` | 0 bytes |

## Placeholder Pages

| File | Path | Content |
|------|------|---------|
| Admin Dashboard | `pages/Dashboard/AdminDashboard.jsx` | 14 lines — `<h1>Admin Dashboard</h1>` + placeholder `<p>` |
| Manager Dashboard | `pages/Dashboard/ManagerDashboard.jsx` | 14 lines — same pattern |
| Employee Dashboard | `pages/Dashboard/EmployeeDashboard.jsx` | 14 lines — same pattern |
| 18 Module Stubs | `pages/*/Module.jsx` | 20 lines each — `<ModuleStub>` with title + description + planned features |

## Unfinished Functions

### `AuthContext.login(role)`
- Takes a role string directly (no email/password)
- No API call — selects from hardcoded MOCK_USERS object
- No error handling for invalid roles

### `AuthContext.logout()`
- Clears localStorage but does not redirect to login page
- Comment on line 129 shows this is intentionally missing

### `DashboardRouter.jsx`
- Marked `@deprecated` at line 3
- No other file imports this component
- Only renders HRDashboard — does not handle role-based routing

## Unused Files

| File | Reason |
|------|--------|
| `src/data/user.js` | Exports `{ firstName, greeting, role }` but NO component imports it. Dead code. |
| `src/routes/DashboardRouter.jsx` | Marked `@deprecated`. Not imported by any file. |
| `src/styles/dashboard.css` | Empty file. Not imported by any component. |
| `src/pages/Login/Login.jsx` | Empty file. Route not defined in AppRouter. |
| `src/pages/Settings/Settings.jsx` | Empty file. Route not defined in AppRouter. |

## Unfinished APIs (Mock Services That Need Real Backends)

All 4 service files have FUTURE comment blocks showing the real API call pattern.
None are connected to a real backend.

| Service | Functions | Real API Needed |
|---------|-----------|-----------------|
| `employeeService.js` | 5 functions | GET/POST/PUT/DELETE /api/employees |
| `attendanceService.js` | 4 functions | GET/POST /api/attendance |
| `leaveService.js` | 6 functions | GET/POST/PUT /api/leave |
| `payrollService.js` | 4 functions | GET/POST /api/payroll |

## Empty Documentation Files

| File | Should Contain |
|------|----------------|
| `docs/01_Project_Overview.md` | Project overview |
| `docs/02_System_Architecture.md` | Architecture diagrams |
| `docs/04_API_Design.md` | API specification |
| `docs/05_Coding_Standards.md` | Coding conventions |
| `docs/06_Git_Workflow.md` | Git branching strategy |
| `docs/07_Development_Guide.md` | Developer setup guide |
| `docs/08_Deployment.md` | Deployment instructions |
| `docs/09_Testing.md` | Testing strategy |
| `docs/10_Security.md` | Security policies |
| `frontend/README.md` | Default Vite template README |
| `root/SECURITY.md` | Empty |
| `root/docker-compose.yml` | Empty |
| `root/.env.example` | Empty |

## Missing Tests

- **No test files exist anywhere** in the repository
- No `test` script in `package.json`
- No testing framework installed (Jest, Vitest, etc.)
- No test configuration

## Missing Features (Not Implemented at All)

- Login page (file exists but empty)
- Settings page (file exists but empty)
- Admin dashboard (placeholder text only)
- Manager dashboard (placeholder text only)
- Employee dashboard (placeholder text only)
- All 18 module stubs (no implementation)
- Real backend (no server code)
- Database connection (no Prisma/Sequelize)
- Authentication (mock only)
- Route guards (all routes public)
- Permission enforcement (defined but not used)
- File upload
- Email notifications
- Reports generation (CSV/PDF)
- Audit logging
- Error tracking
- TypeScript usage (types installed but not used)
