# Frontend Analysis

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.7 | UI framework |
| Vite | 8.1.1 | Build tool / dev server |
| React Router | 7.18.1 | Client-side routing |
| Tailwind CSS | 4.3.3 | Utility CSS framework |
| TanStack React Query | 5.101.2 | Server state management |
| Axios | 1.18.1 | HTTP client |
| Recharts | 3.9.2 | Charting library |
| Lucide React | 1.25.0 | Icon library |
| React Hook Form | 7.82.0 | Form handling |
| ESLint | 10.6.0 | Linting |

## Folder Structure

```
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx                 # Root component
│   ├── main.jsx                # Entry point
│   ├── index.css               # Global styles + Tailwind
│   ├── components/
│   │   ├── dashboard/          # Dashboard widgets
│   │   │   ├── AlertCard.jsx
│   │   │   ├── HiringChart.jsx
│   │   │   ├── HiringInsights.jsx
│   │   │   ├── PayrollCard.jsx
│   │   │   ├── PeopleCard.jsx
│   │   │   ├── QuickActions.jsx
│   │   │   ├── ResourcesCard.jsx
│   │   │   └── WelcomeCard.jsx
│   │   ├── layout/             # App shell components
│   │   │   ├── MainLayout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── shared/             # Reusable UI components
│   │       ├── ConfirmDialog.jsx
│   │       ├── EmptyState.jsx
│   │       ├── Modal.jsx
│   │       ├── ModuleStub.jsx
│   │       ├── PageHeader.jsx
│   │       ├── Spinner.jsx
│   │       └── StatusBadge.jsx
│   ├── context/
│   │   ├── AuthContext.jsx      # Authentication state
│   │   └── SearchContext.jsx    # Global search state
│   ├── data/                    # Static data for dashboard
│   │   ├── alerts.js
│   │   ├── hiringChart.js
│   │   ├── payroll.js
│   │   ├── people.js
│   │   ├── resources.js
│   │   └── user.js
│   ├── mock/                    # Mock API data
│   │   ├── attendance.js
│   │   ├── employees.js
│   │   ├── leave.js
│   │   ├── payroll.js
│   │   └── searchIndex.js
│   ├── pages/                   # Page components (23 modules)
│   │   ├── Dashboard/
│   │   ├── Employees/
│   │   ├── Attendance/
│   │   ├── Leave/
│   │   ├── Payroll/
│   │   ├── Login/               # Empty file
│   │   ├── Settings/            # Empty file
│   │   └── ... (18 stub pages)
│   ├── routes/
│   │   ├── AppRouter.jsx        # Main router (all 23 routes)
│   │   └── DashboardRouter.jsx  # Deprecated
│   ├── services/                # API service layer
│   │   ├── api.js               # Axios instance
│   │   ├── attendanceService.js
│   │   ├── employeeService.js
│   │   ├── leaveService.js
│   │   └── payrollService.js
│   └── styles/
│       ├── dashboard.css        # Empty
│       └── variables.css        # CSS custom properties
├── index.html
├── vite.config.js
├── package.json
└── eslint.config.js
```

## Routing

**File**: `src/routes/AppRouter.jsx`

Uses `react-router-dom` v7 with `BrowserRouter`. All routes are top-level (no nested layout route — each page manually wraps in `MainLayout`).

| Route | Page Component | Status |
|-------|---------------|--------|
| `/` | HRDashboard | **Complete** |
| `/employees` | Employees | **Complete** |
| `/employees/:id` | EmployeeProfile | **Complete** |
| `/attendance` | Attendance | **Complete** |
| `/leave` | Leave | **Complete** |
| `/payroll` | Payroll | **Complete** |
| `/performance` | Performance | Stub |
| `/recruitment` | Recruitment | Stub |
| `/onboarding` | Onboarding | Stub |
| `/lms` | LMS | Stub |
| `/assets` | Assets | Stub |
| `/tasks` | Tasks | Stub |
| `/expenses` | Expenses | Stub |
| `/travel` | Travel | Stub |
| `/ess` | ESS | Stub |
| `/helpdesk` | Helpdesk | Stub |
| `/policies` | Policies | Stub |
| `/separation` | Separation | Stub |
| `/org-management` | OrgManagement | Stub |
| `/workflows` | WorkflowEngine | Stub |
| `/reports` | Reports | Stub |
| `/notifications` | Notifications | Stub |
| `/compliance` | Compliance | Stub |
| `/security` | SecurityAdmin | Stub |
| `*` | Navigate to `/` | — |

## Page Details

### Complete Pages (5 active + 1 dashboard)

#### 1. HRDashboard (`/`)
- **File**: `src/pages/Dashboard/HRDashboard.jsx`
- **Components**: WelcomeCard, AlertCard, HiringInsights, QuickActions, PeopleCard, PayrollCard, ResourcesCard
- **Features**: Greeting, hiring stats, alerts, quick actions, team snapshot, payroll summary
- **Data**: Static data files in `src/data/` and `src/mock/`

#### 2. Employees (`/employees`)
- **File**: `src/pages/Employees/Employees.jsx`
- **Features**: Searchable/filterable table, department/status filters, Add Employee modal, pagination
- **Data**: `mock/employees.js` (15 employees)
- **Service**: `employeeService.js`

#### 3. EmployeeProfile (`/employees/:id`)
- **File**: `src/pages/Employees/EmployeeProfile.jsx`
- **Features**: Profile header, 3 tabs (Personal Info, Employment, Payroll), back navigation
- **Data**: Loaded via `getEmployee(id)` from service

#### 4. Attendance (`/attendance`)
- **File**: `src/pages/Attendance/Attendance.jsx`
- **Features**: Check-in/out button, summary stat cards, monthly records table, month/year picker
- **Data**: `mock/attendance.js`
- **Service**: `attendanceService.js`

#### 5. Leave (`/leave`)
- **File**: `src/pages/Leave/Leave.jsx`
- **Features**: Leave balance cards, Apply Leave modal, requests table with status filter
- **Data**: `mock/leave.js`
- **Service**: `leaveService.js`

#### 6. Payroll (`/payroll`)
- **File**: `src/pages/Payroll/Payroll.jsx`
- **Features**: Two tabs (Payroll Runs, My Payslips), Run Payroll with ConfirmDialog, payslip detail view
- **Data**: `mock/payroll.js`
- **Service**: `payrollService.js`

### Stub Pages (18 modules)
- **Pattern**: Each uses `ModuleStub` component with title, description, and planned features list
- **Components**: Performance, Recruitment, Onboarding, LMS, Assets, Tasks, Expenses, Travel, ESS, Helpdesk, Policies, Separation, OrgManagement, WorkflowEngine, Reports, Notifications, Compliance, SecurityAdmin

### Placeholder Pages (2)
- **Login.jsx**: Empty file
- **Settings.jsx**: Empty file

## Reusable Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `components/layout/MainLayout.jsx` | Sidebar + Navbar + content area wrapper |
| `Sidebar` | `components/layout/Sidebar.jsx` | Navigation with 23 items in 5 groups |
| `Navbar` | `components/layout/Navbar.jsx` | Global search (Ctrl+K), notifications bell, user menu |
| `PageHeader` | `components/shared/PageHeader.jsx` | Standard page title + subtitle + action buttons |
| `Spinner` | `components/shared/Spinner.jsx` | Loading spinner with CSS animation |
| `StatusBadge` | `components/shared/StatusBadge.jsx` | Color-coded pill badge for statuses |
| `EmptyState` | `components/shared/EmptyState.jsx` | Placeholder for empty lists |
| `Modal` | `components/shared/Modal.jsx` | Generic modal with backdrop, Escape key close |
| `ConfirmDialog` | `components/shared/ConfirmDialog.jsx` | Destructive action confirmation |
| `ModuleStub` | `components/shared/ModuleStub.jsx` | Placeholder for unimplemented modules |

## State Management

### AuthContext
- **File**: `src/context/AuthContext.jsx`
- **State**: `user`, `role`, `permissions`
- **Functions**: `login(role)`, `logout()`
- **Initialization**: Reads `hrms_role` from localStorage
- **Mock Users**: ADMIN, HR, MANAGER, EMPLOYEE (hardcoded with avatars)
- **Permission System**: 4 hardcoded permission arrays mapping roles to `<module>:<action>` strings
- **Note**: Currently mock only — designed to be replaced with real JWT API

### SearchContext
- **File**: `src/context/SearchContext.jsx`
- **State**: `query`, `results`, `isOpen`
- **Features**: Debounced search (150ms), fuzzy matching (starts-with > contains), max 20 results
- **Search Corpus**: Builds index from employees, leave requests, and payroll runs

## API Integration

- **Current**: All services import mock data directly from `src/mock/` and simulate delays with `setTimeout`
- **Future**: Each service has a comment showing the real API call. Switch by uncommenting the Axios import and commenting the mock import
- **Axios Instance**: Pre-configured with auth interceptor and error handler in `src/services/api.js`
- **Environment Variable**: `VITE_API_URL` for API base URL

## Incomplete Pages

| Page | Issue |
|------|-------|
| `Login.jsx` | Empty file — no login UI |
| `Settings.jsx` | Empty file — no settings page |
| `AdminDashboard.jsx` | Placeholder text only |
| `ManagerDashboard.jsx` | Placeholder text only |
| `EmployeeDashboard.jsx` | Placeholder text only |

## UI Placeholders

- **ModuleStub**: Used by 18 modules — shows "Under Construction" with construction icon and planned features
- **EmptyState**: Used in Employees, Attendance, Leave pages when no data matches filters
- **DashboardRouter.jsx**: Deprecated — only redirects to HRDashboard
