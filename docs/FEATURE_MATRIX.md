# Feature Matrix

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete (full implementation) |
| ⚠️ | Partial (some UI but not functional) |
| ❌ | Missing (stub, placeholder, or not started) |

---

## Core Framework

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| App Shell (Sidebar + Navbar + Layout) | ✅ | `components/layout/MainLayout.jsx`, `Sidebar.jsx`, `Navbar.jsx` | — | — | 23 nav items in 5 groups; active highlighting; no route protection |
| Global Search | ✅ | `context/SearchContext.jsx`, `components/layout/Navbar.jsx`, `mock/searchIndex.js` | — | `GET /api/search?q=` (planned) | Ctrl+K; searches employees, leave, payroll; debounced 150ms |
| CSS Theme | ✅ | `styles/variables.css` | — | — | 47 CSS custom properties for theming |
| Routing | ✅ | `routes/AppRouter.jsx` | — | — | 25 routes; lazy loading; fallback to `/` |
| Loading States | ✅ | `components/shared/Spinner.jsx` | — | — | CSS animation spinner |
| Empty States | ✅ | `components/shared/EmptyState.jsx` | — | — | Used in all list pages |
| Confirmation Dialogs | ✅ | `components/shared/ConfirmDialog.jsx` | — | — | Used for "Run Payroll" action |
| Modals | ✅ | `components/shared/Modal.jsx` | — | — | Escape close, backdrop click close |

## Authentication & Authorization

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| Auth Context | ⚠️ | `context/AuthContext.jsx` | — | — | Mock only; 4 hardcoded users |
| Login Page | ❌ | `pages/Login/Login.jsx` | — | — | Empty file — zero content |
| User Registration | ❌ | — | — | — | Not planned in design doc |
| Password Reset | ❌ | — | — | — | Not planned in design doc |
| JWT Token Flow | ⚠️ | `services/api.js` | — | — | Interceptor ready; no backend to call |
| Route Guards | ❌ | — | — | — | All routes publicly accessible |
| Permission Enforcement | ❌ | — | — | — | Permissions defined but never checked |
| Role Management | ❌ | — | — | — | 4 roles hardcoded in AuthContext |
| Session Persistence | ⚠️ | `context/AuthContext.jsx` | — | — | Stores `hrms_role` in localStorage |

## Dashboard

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| HR Dashboard | ✅ | `pages/Dashboard/HRDashboard.jsx`, `components/dashboard/*` | — | — | 8 widget components; static data |
| Admin Dashboard | ❌ | `pages/Dashboard/AdminDashboard.jsx` | — | — | Placeholder text only |
| Manager Dashboard | ❌ | `pages/Dashboard/ManagerDashboard.jsx` | — | — | Placeholder text only |
| Employee Dashboard | ❌ | `pages/Dashboard/EmployeeDashboard.jsx` | — | — | Placeholder text only |
| Welcome Greeting | ✅ | `components/dashboard/WelcomeCard.jsx` | — | — | Time-based greeting |
| Alert Feed | ✅ | `components/dashboard/AlertCard.jsx` | — | — | 3 hardcoded alerts with severity |
| Hiring Insights | ✅ | `components/dashboard/HiringInsights.jsx`, `HiringChart.jsx` | — | — | 4 KPIs + bar chart |
| Quick Actions | ✅ | `components/dashboard/QuickActions.jsx` | — | — | 6 action buttons |
| People Snapshot | ✅ | `components/dashboard/PeopleCard.jsx` | — | — | 8 team members |
| Payroll Summary | ✅ | `components/dashboard/PayrollCard.jsx` | — | — | Static payroll data |
| Resources Links | ✅ | `components/dashboard/ResourcesCard.jsx` | — | — | 4 resource links |

## Employees

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| Employee List | ✅ | `pages/Employees/Employees.jsx` | — | `GET /api/employees` (planned) | Search, filter by dept/status, pagination (8/page) |
| Employee Profile | ✅ | `pages/Employees/EmployeeProfile.jsx` | — | `GET /api/employees/:id` (planned) | 3 tabs: Personal, Employment, Payroll |
| Add Employee | ✅ | `pages/Employees/Employees.jsx` (modal) | — | `POST /api/employees` (planned) | Form with validation; mock creation |
| Edit Employee | ⚠️ | `services/employeeService.js` has `updateEmployee` | — | `PUT /api/employees/:id` (planned) | Service exists; no UI for editing |
| Delete Employee | ⚠️ | `services/employeeService.js` has `deleteEmployee` | — | `DELETE /api/employees/:id` (planned) | Service exists; no UI for deletion |
| Employee Photo | ✅ | Inline in list/profile | — | — | Uses pravatar.cc placeholder images |
| Employment Type Badges | ✅ | Inline in list | — | — | Contract vs Full-Time styling |
| Status Badges | ✅ | `components/shared/StatusBadge.jsx` | — | — | Active, On Leave, Inactive, Terminated |

## Attendance

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| Check In/Out | ✅ | `pages/Attendance/Attendance.jsx` | — | `POST /api/attendance/check-in` (planned) | Toggle button; mock response |
| Team Summary | ✅ | `pages/Attendance/Attendance.jsx` | — | `GET /api/attendance/summary` (planned) | 5 stat cards with icons |
| Monthly Records Table | ✅ | `pages/Attendance/Attendance.jsx` | — | `GET /api/attendance` (planned) | 17 mock records for July 2026 |
| Month/Year Picker | ✅ | `pages/Attendance/Attendance.jsx` | — | — | Select elements |
| Status Count Chips | ✅ | `pages/Attendance/Attendance.jsx` | — | — | Dynamic count per status |

## Leave

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| Leave Balance Cards | ✅ | `pages/Leave/Leave.jsx` | — | `GET /api/leave/balance` (planned) | 4 leave types with progress bars |
| Apply for Leave | ✅ | `pages/Leave/Leave.jsx` (modal) | — | `POST /api/leave/apply` (planned) | Type, date range, reason; validation |
| Leave Requests Table | ✅ | `pages/Leave/Leave.jsx` | — | `GET /api/leave/requests` (planned) | Status filter |
| Approve/Reject Leave | ⚠️ | `services/leaveService.js` has functions | — | `PUT /api/leave/:id/approve`, `/reject` (planned) | Service exists; no UI buttons |
| Leave Types | ✅ | `mock/leave.js` | — | `GET /api/leave/types` (planned) | 6 leave types defined |

## Payroll

| Feature | Status | Frontend Files | Backend Files | APIs | Notes |
|---------|--------|----------------|---------------|------|-------|
| Payroll Runs Table | ✅ | `pages/Payroll/Payroll.jsx` | — | `GET /api/payroll/runs` (planned) | 3 mock runs; financial figures |
| Pay Amount Formatting | ✅ | `pages/Payroll/Payroll.jsx` | — | — | Indian number format (₹) |
| Payslip Detail View | ✅ | `pages/Payroll/Payroll.jsx` | — | `GET /api/payroll/payslips` (planned) | Earnings/deductions breakdown |
| Run Payroll Action | ✅ | `pages/Payroll/Payroll.jsx` | — | `POST /api/payroll/runs/:id/process` (planned) | ConfirmDialog before execution |
| Download Payslip Button | ⚠️ | `pages/Payroll/Payroll.jsx` | — | — | Button exists but no actual download |
| Payroll Status Badges | ✅ | `mock/payroll.js` | — | — | Draft, Processing, Approved, Paid, Failed |

## 18 Module Stubs (All ❌ Missing)

| Module | Files | APIs Needed | Notes |
|--------|-------|-------------|-------|
| Performance Management | `pages/Performance/Performance.jsx` | Goal setting, reviews, feedback | Stub with 5 planned features |
| Recruitment (ATS) | `pages/Recruitment/Recruitment.jsx` | Candidates, jobs, interviews | Stub with 5 planned features |
| Onboarding | `pages/Onboarding/Onboarding.jsx` | Checklists, documents, IT provisioning | Stub with 5 planned features |
| LMS | `pages/LMS/LMS.jsx` | Courses, certifications, training | Stub with 5 planned features |
| Asset Management | `pages/Assets/Assets.jsx` | Inventory, assignment, maintenance | Stub with 5 planned features |
| Task Management | `pages/Tasks/Tasks.jsx` | Boards, time logging, assignment | Stub with 5 planned features |
| Expense Management | `pages/Expenses/Expenses.jsx` | Claims, receipts, approvals | Stub with 5 planned features |
| Travel Management | `pages/Travel/Travel.jsx` | Requests, booking, settlement | Stub with 5 planned features |
| Employee Self Service | `pages/ESS/ESS.jsx` | Profile, payslips, requests | Stub with 5 planned features |
| Helpdesk | `pages/Helpdesk/Helpdesk.jsx` | Tickets, SLA, escalation | Stub with 5 planned features |
| Policy Management | `pages/Policies/Policies.jsx` | Documents, acknowledgements | Stub with 5 planned features |
| Separation Management | `pages/Separation/Separation.jsx` | Resignation, clearance, F&F | Stub with 5 planned features |
| Org Management | `pages/OrgManagement/OrgManagement.jsx` | Structure, departments, locations | Stub with 5 planned features |
| Workflow Engine | `pages/WorkflowEngine/WorkflowEngine.jsx` | Approval chains, routing | Stub with 5 planned features |
| Reports & Analytics | `pages/Reports/Reports.jsx` | Standard/custom reports | Stub with 5 planned features |
| Notifications | `pages/Notifications/Notifications.jsx` | Email, SMS, push, in-app | Stub with 5 planned features |
| Compliance | `pages/Compliance/Compliance.jsx` | Statutory filing, POSH, data retention | Stub with 5 planned features |
| Security & Admin | `pages/SecurityAdmin/SecurityAdmin.jsx` | RBAC, SSO, MFA, audit logs | Stub with 5 planned features |

## Infrastructure

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Build Tool (Vite) | ✅ | `frontend/vite.config.js` | Configured with React + Tailwind plugins |
| ESLint | ✅ | `frontend/eslint.config.js` | Basic lint setup |
| Environment Variables | ❌ | `.env.example` | Empty file |
| Docker | ❌ | `docker-compose.yml` | Empty file |
| CI/CD | ❌ | — | Not configured |
| Unit Tests | ❌ | — | No test files |
| Integration Tests | ❌ | — | No test files |
| TypeScript | ❌ | — | Not used despite `@types/react` being in devDependencies |

## Data Layer

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Mock Employee Data | ✅ | `mock/employees.js` | 15 employees with full profiles |
| Mock Attendance Data | ✅ | `mock/attendance.js` | 17 records for EMP001 |
| Mock Leave Data | ✅ | `mock/leave.js` | 6 leave types, 4 balances, 6 requests |
| Mock Payroll Data | ✅ | `mock/payroll.js` | 3 payroll runs, 2 payslips |
| Search Index | ✅ | `mock/searchIndex.js` | Builds from employees, leave, payroll |
| Static Dashboard Data | ✅ | `data/people.js`, `payroll.js`, `alerts.js`, `resources.js`, `hiringChart.js` | Static display data |
| Axios API Client | ⚠️ | `services/api.js` | Configured but unused (no backend) |
| Employee Service | ⚠️ | `services/employeeService.js` | Mock implementation |
| Attendance Service | ⚠️ | `services/attendanceService.js` | Mock implementation |
| Leave Service | ⚠️ | `services/leaveService.js` | Mock implementation |
| Payroll Service | ⚠️ | `services/payrollService.js` | Mock implementation |
| Database Schema | ⚠️ | `docs/03_Database_Design.md` | Design document only |
| Prisma Schema | ❌ | — | Not created |
| Database Migrations | ❌ | — | Not created |
| Seed Script | ❌ | — | Not created |

## State Management

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| React Context (Auth) | ✅ | `context/AuthContext.jsx` | Mock auth state |
| React Context (Search) | ✅ | `context/SearchContext.jsx` | Global search state |
| TanStack React Query | ❌ | `package.json` (dependency) | Installed but not used anywhere |

## Empty/Dead Artifacts

| File | Status | Notes |
|------|--------|-------|
| `data/user.js` | ⚠️ | Exports data but is not imported anywhere |
| `routes/DashboardRouter.jsx` | ⚠️ | Marked @deprecated |
| `styles/dashboard.css` | ❌ | Empty file |
| `pages/Login/Login.jsx` | ❌ | Empty file |
| `pages/Settings/Settings.jsx` | ❌ | Empty file |
| `docs/01_Project_Overview.md` | ❌ | Empty |
| `docs/02_System_Architecture.md` | ❌ | Empty |
| `docs/04_API_Design.md` | ❌ | Empty |
| `docs/05_Coding_Standards.md` | ❌ | Empty |
| `docs/06_Git_Workflow.md` | ❌ | Empty |
| `docs/07_Development_Guide.md` | ❌ | Empty |
| `docs/08_Deployment.md` | ❌ | Empty |
| `docs/09_Testing.md` | ❌ | Empty |
| `docs/10_Security.md` | ❌ | Empty |
| `SECURITY.md` | ❌ | Empty |
| `CHANGELOG.md` | ❌ | Content exists but not reviewed |
| `CONTRIBUTING.md` | ❌ | Content exists but not reviewed |
| `CODE_OF_CONDUCT.md` | ❌ | Content exists but not reviewed |
| `Batch_B_EnterpriseHRMS_V1_21-Jul-2026.md` | ❌ | Comment-only file |
