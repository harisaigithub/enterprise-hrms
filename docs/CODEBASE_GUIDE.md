# Codebase Guide

## Folder Structure

```
enterprise-hrms/                              # Root project folder
├── Batch_B_EnterpriseHRMS_V1_21-Jul-2026.md  # Comment-only file (rename reminder)
├── CHANGELOG.md                              # Changelog (not reviewed)
├── CODE_OF_CONDUCT.md                        # Code of conduct (not reviewed)
├── CONTRIBUTING.md                           # Contributing guidelines (not reviewed)
├── SECURITY.md                               # Empty
├── README.md                                 # Root README (2 lines only)
├── .env.example                              # Empty
├── .gitignore                                # Git ignore rules
├── docker-compose.yml                        # Empty
├── docs/                                     # Design documentation
│   ├── 01_Project_Overview.md                # Empty
│   ├── 02_System_Architecture.md             # Empty
│   ├── 03_Database_Design.md                 # COMPLETE — 15-table PostgreSQL schema
│   ├── 04_API_Design.md                      # Empty
│   ├── 05_Coding_Standards.md                # Empty
│   ├── 06_Git_Workflow.md                    # Empty
│   ├── 07_Development_Guide.md               # Empty
│   ├── 08_Deployment.md                      # Empty
│   ├── 09_Testing.md                         # Empty
│   └── 10_Security.md                        # Empty
│
└── frontend/                                 # React SPA application
    ├── index.html                            # HTML entry point
    ├── package.json                          # Dependencies & scripts
    ├── vite.config.js                        # Vite config (React + Tailwind)
    ├── eslint.config.js                      # ESLint configuration
    ├── README.md                             # Default Vite README
    ├── .gitignore
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    │
    └── src/
        ├── main.jsx                          # ReactDOM.createRoot entry
        ├── App.jsx                           # Root component: AuthProvider > SearchProvider > AppRouter
        ├── index.css                         # Global styles + Tailwind import
        │
        ├── routes/
        │   ├── AppRouter.jsx                 # MAIN: 25 routes with lazy loading
        │   └── DashboardRouter.jsx           # DEPRECATED — redirects to HRDashboard
        │
        ├── context/
        │   ├── AuthContext.jsx               # Mock auth: user, role, permissions, login(), logout()
        │   └── SearchContext.jsx             # Global search: query, results, debounce
        │
        ├── services/                         # API service layer
        │   ├── api.js                        # Axios instance with interceptors
        │   ├── employeeService.js            # Employee CRUD (mock)
        │   ├── attendanceService.js          # Attendance + check-in/out (mock)
        │   ├── leaveService.js               # Leave types, balance, requests (mock)
        │   └── payrollService.js             # Payroll runs, payslips (mock)
        │
        ├── mock/                             # Mock data files
        │   ├── employees.js                  # 15 employees
        │   ├── attendance.js                 # 17 attendance records
        │   ├── leave.js                      # 6 types, 4 balances, 6 requests
        │   ├── payroll.js                    # 3 runs, 2 payslips
        │   └── searchIndex.js                # Search index builder + fuzzy search
        │
        ├── data/                             # Static display data
        │   ├── user.js                       # UNUSED — no component imports this
        │   ├── people.js                     # 8 team members
        │   ├── payroll.js                    # Static payroll summary
        │   ├── alerts.js                     # 3 dashboard alerts
        │   ├── resources.js                  # 4 resource links
        │   └── hiringChart.js                # Weekly hiring chart data
        │
        ├── components/
        │   ├── layout/
        │   │   ├── MainLayout.jsx            # App shell: Sidebar + Navbar + content
        │   │   ├── Sidebar.jsx               # 23 nav items in 5 groups
        │   │   └── Navbar.jsx                # Search bar, notifications bell, user menu
        │   │
        │   ├── dashboard/
        │   │   ├── WelcomeCard.jsx           # Time-based greeting
        │   │   ├── QuickActions.jsx          # 6 action buttons
        │   │   ├── ResourcesCard.jsx         # Resource links
        │   │   ├── PeopleCard.jsx            # Team member avatars
        │   │   ├── PayrollCard.jsx           # Payroll summary
        │   │   ├── HiringInsights.jsx        # 4 hiring KPIs
        │   │   ├── HiringChart.jsx           # Recharts bar chart
        │   │   └── AlertCard.jsx             # Alert feed
        │   │
        │   └── shared/
        │       ├── Spinner.jsx               # Loading spinner (CSS animation)
        │       ├── StatusBadge.jsx           # Color-coded pill badge
        │       ├── EmptyState.jsx            # Empty list placeholder
        │       ├── PageHeader.jsx            # Page title + actions
        │       ├── Modal.jsx                 # Generic modal overlay
        │       ├── ConfirmDialog.jsx         # Destructive action confirmation
        │       └── ModuleStub.jsx            # "Under Construction" placeholder
        │
        ├── pages/                            # 28 page components
        │   ├── Dashboard/
        │   │   ├── HRDashboard.jsx           # COMPLETE — 8 widgets
        │   │   ├── AdminDashboard.jsx        # PLACEHOLDER — text only
        │   │   ├── ManagerDashboard.jsx      # PLACEHOLDER — text only
        │   │   └── EmployeeDashboard.jsx     # PLACEHOLDER — text only
        │   │
        │   ├── Employees/
        │   │   ├── Employees.jsx             # COMPLETE — list + add modal
        │   │   └── EmployeeProfile.jsx       # COMPLETE — 3 tabs
        │   │
        │   ├── Attendance/
        │   │   └── Attendance.jsx            # COMPLETE — check-in/out + records
        │   │
        │   ├── Leave/
        │   │   └── Leave.jsx                 # COMPLETE — balances + requests
        │   │
        │   ├── Payroll/
        │   │   └── Payroll.jsx               # COMPLETE — runs + payslips
        │   │
        │   ├── Login.jsx                     # EMPTY — no login UI
        │   ├── Settings.jsx                  # EMPTY — no settings UI
        │   │
        │   └── (18 stub modules — see FRONTEND.md for list)
        │
        └── styles/
            ├── variables.css                 # 47 CSS custom properties
            └── dashboard.css                 # EMPTY
```

## How Requests Flow

### Current Flow (Frontend Mock)

```
User clicks button / page loads
        │
        ▼
Page component (e.g., Attendance.jsx)
        │
        ├── useEffect() on mount
        │       │
        │       ▼
        │   Calls service function: getMyAttendance({ month, year })
        │       │
        │       ▼
        │   Service function (src/services/attendanceService.js):
        │       1. Imports mock data from src/mock/attendance.js
        │       2. Simulates network delay with setTimeout (300-1000ms)
        │       3. Filters/processes data manually
        │       4. Returns { data: filteredRecords }
        │       │
        │       ▼
        │   Page receives response
        │   Sets state: setRecords(res.data)
        │       │
        │       ▼
        │   React re-renders with data
        │
        └── User interacts (e.g., clicks "Check In")
                │
                ▼
            Calls service function: checkIn("EMP001")
                │
                ▼
            Service returns mock response with current timestamp
                │
                ▼
            Page updates UI state (checkedIn = true)
```

### Planned Future Flow (with Backend)

```
User action
        │
        ▼
Page component
        │
        ▼
Service function → Axios HTTP request
        │               │
        │               ├── Request interceptor adds JWT Bearer token
        │               │
        ▼               ▼
    Node.js/Express API server
        │
        ├── Authentication middleware (verify JWT)
        ├── Authorization middleware (check permissions)
        ├── Input validation middleware
        ├── Controller function
        │       │
        │       ▼
        │   Prisma ORM query → PostgreSQL database
        │       │
        │       ▼
        │   Response
        │
        ▼
Axios response interceptor
        │
        ├── If 401 → clear auth, redirect to login
        ├── If error → normalize to { status, message }
        │
        ▼
Service returns data to page component
        │
        ▼
Page updates state → re-render
```

## Authentication Flow

### Current (Mock)

```
App loads
    │
    ▼
AuthProvider initializes
    │
    ├── Reads "hrms_role" from localStorage
    │   (defaults to "HR" if not found)
    │
    ├── Looks up MOCK_USERS[role] → gets user object
    │   (ADMIN: Robert King | HR: lewis hamilton | MANAGER: Alice Quinn | EMPLOYEE: Matsya Singh)
    │
    ├── Looks up ROLE_PERMISSIONS[role] → gets permissions array
    │
    └── Provides { user, role, permissions, login, logout } via context

login(role) function:
    1. Selects user from MOCK_USERS[role]
    2. Selects permissions from ROLE_PERMISSIONS[role]
    3. Stores "hrms_role" in localStorage
    4. Updates React state

logout() function:
    1. Removes "hrms_role" and "hrms_token" from localStorage
    2. Resets user to default HR user
    3. Does NOT redirect (commented: FUTURE: window.location.href = '/login')
```

### Planned (Real)

```
1. User visits /login
2. Login page renders email/password form
3. Form submit → POST /api/auth/login
4. Backend:
   a. Find user by email in users table
   b. Verify password with bcrypt.compare()
   c. Generate JWT with { userId, role, permissions, exp }
   d. Return { user, token }
5. Frontend:
   a. Store token in localStorage (future: httpOnly cookie)
   b. Store user info in AuthContext
   c. Redirect to dashboard
6. Subsequent requests:
   a. Axios interceptor reads token
   b. Attaches Authorization: Bearer <token>
   c. Backend verifies JWT, extracts user/role
   d. Checks permissions for the requested resource
   e. Returns data or 401/403
```

## Database Flow

### Current

```
No database. All data comes from mock files in src/mock/:
    ├── mock/employees.js      → 15 employee records
    ├── mock/attendance.js     → 17 attendance records for EMP001
    ├── mock/leave.js          → 6 leave types, 4 balances, 6 requests
    ├── mock/payroll.js        → 3 payroll runs, 2 payslips
    └── mock/searchIndex.js    → Builds search corpus from above
```

### Planned (based on docs/03_Database_Design.md)

```
PostgreSQL with 15 tables:

Core Organization:   companies → departments → employees
                    companies → locations
                    designations → employees

Identity & RBAC:    roles → role_permissions ← permissions
                    roles → users → employees → audit_logs

Leave Management:   leave_types → leave_balances → employees
                    leave_types → leave_requests → employees

Attendance:         attendance_shifts
                    attendance_punches → employees

All primary keys use UUIDs (gen_random_uuid()).
All tables use TIMESTAMP for created_at.
```

## Frontend Architecture

```
Layer 1: Root
    main.jsx → App.jsx (AuthProvider > SearchProvider > AppRouter)

Layer 2: Routing
    AppRouter.jsx → BrowserRouter with 25 Routes (24 modules + catch-all)

Layer 3: Layout
    MainLayout.jsx → Sidebar + Navbar + {children}

Layer 4: Pages
    Each page component receives layout via wrapping in <MainLayout>
    Pages use useState + useEffect for data fetching
    Pages render shared components (Spinner, EmptyState, StatusBadge, Modal, etc.)

Layer 5: Services
    Each service imports mock data, simulates delays, returns { data }
    All services have FUTURE comments showing the real API equivalent

Layer 6: Data
    Mock data in src/mock/ (5 files)
    Static data in src/data/ (6 files)

State Management:
    AuthContext — user, role, permissions (global)
    SearchContext — query, results, isOpen (global)
    useState — page-level state
    useEffect — data fetching on mount
    TanStack React Query — INSTALLED BUT NOT USED
```

## Backend Architecture

### Current

**No backend exists.** The entire "backend" is:
1. `src/services/api.js` — Axios instance with interceptors (configured but unused)
2. `src/services/*.js` — Mock service functions that import from `src/mock/`
3. `docs/03_Database_Design.md` — Database design specification

### Planned (from code comments + design doc)

```
Architecture: REST API over HTTP

Framework:     Node.js + Express.js (assumed from standard conventions)
Database:      PostgreSQL
ORM:           Prisma (implied by package.json dependencies? No — not in deps)
Auth:          JWT (Bearer tokens)
Password:      bcrypt hashing
Validation:    Express validation / Joi / Zod (not specified)
Documentation: Swagger / OpenAPI (not specified)

Middleware Chain (predicted):
    CORS → Rate Limiter → Body Parser → 
    JWT Verification → Permission Check → 
    Input Validation → Controller → Response

Data Flow:
    Controller → Service → Prisma ORM → PostgreSQL
    Controller ← Service ← Prisma ORM ← PostgreSQL

Error Handling:
    Centralized error middleware
    All errors normalized to { status, message }
    Stack traces hidden in production
```

### Missing Backend Artifacts

- No server entry point (app.js/server.js)
- No package.json for backend
- No route definitions
- No controllers
- No middleware
- No Prisma schema
- No migration files
- No seed script
- No test files
- No .env configuration
- No Docker configuration (docker-compose.yml is empty)
