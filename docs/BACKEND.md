# Backend Analysis

## Current Status

**No backend has been implemented.** The project is entirely frontend-only. There is no Node.js/Express server, no database connection, and no real API.

## What Exists

### 1. Axios API Instance (`src/services/api.js`)

A pre-configured Axios instance that is ready to connect to a backend:

- **Base URL**: Reads from `VITE_API_URL` environment variable, falls back to `/api`
- **Timeout**: 15 seconds
- **Request Interceptor**: Automatically attaches JWT token from `localStorage.getItem("hrms_token")` as `Authorization: Bearer <token>`
- **Response Interceptor**: On 401 responses, clears auth state. All errors are normalized to `{ status, message }`.

### 2. Service Modules (Mock-based)

| Service File | Functions | Mock Data |
|-------------|-----------|-----------|
| `employeeService.js` | `getEmployees`, `getEmployee`, `createEmployee`, `updateEmployee`, `deleteEmployee` | `mock/employees.js` |
| `attendanceService.js` | `getMyAttendance`, `getTeamSummary`, `checkIn`, `checkOut` | `mock/attendance.js` |
| `leaveService.js` | `getLeaveTypes`, `getMyLeaveBalance`, `getLeaveRequests`, `applyLeave`, `approveLeave`, `rejectLeave` | `mock/leave.js` |
| `payrollService.js` | `getPayrollRuns`, `getPayslips`, `getPayslip`, `runPayroll` | `mock/payroll.js` |

### 3. Planned Backend Modules (based on mock data)

1. **Authentication** — Login/logout, JWT token management, password reset
2. **Employee Management** — CRUD operations, profile management
3. **Attendance Tracking** — Check-in/out, monthly reports, team summary
4. **Leave Management** — Leave types, balances, requests, approvals
5. **Payroll** — Payroll runs, payslips, processing
6. **Recruitment (ATS)** — Job requisitions, candidate pipeline
7. **Onboarding** — Checklists, document collection
8. **Performance Management** — OKRs, reviews, feedback
9. **Learning Management (LMS)** — Courses, certifications
10. **Asset Management** — Inventory, assignment, maintenance
11. **Task Management** — Project tracking, time logging
12. **Expense Management** — Claims, approvals, reimbursement
13. **Travel Management** — Requests, booking, settlement
14. **Employee Self Service (ESS)** — Personal data, payslips
15. **Helpdesk** — Ticketing, SLA, escalation
16. **Policy Management** — Documents, acknowledgements
17. **Separation Management** — Resignation, clearance, F&F
18. **Organization Management** — Structure, departments, locations
19. **Workflow Engine** — Configurable approval chains
20. **Reports & Analytics** — Standard and custom reports
21. **Notifications** — Email, SMS, push, in-app
22. **Compliance** — Statutory filing, POSH, data retention
23. **Security & Administration** — RBAC, SSO, MFA, audit logs

## Database Design

A PostgreSQL schema with 15 tables exists as a design document (`docs/03_Database_Design.md`). See `DATABASE.md` for full details.

## Authentication & Authorization (Planned)

- **Strategy**: JWT (JSON Web Tokens)
- **Password Storage**: bcrypt hashing
- **Authorization**: Role-based access control (RBAC) via `roles`, `permissions`, and `role_permissions` tables
- **Current Mock Implementation**: See `AUTHENTICATION.md`

## Missing Backend Components

- [ ] Node.js/Express server
- [ ] Database connection (Prisma/Sequelize)
- [ ] Migration files
- [ ] Seed scripts
- [ ] API routes
- [ ] Controller logic
- [ ] Validation middleware
- [ ] Error handling middleware
- [ ] Authentication middleware (JWT verification)
- [ ] Authorization middleware (role/permission check)
- [ ] Logging
- [ ] Rate limiting
- [ ] File upload handling
- [ ] Email service
- [ ] Unit tests
- [ ] Integration tests
- [ ] CI/CD configuration
- [ ] Docker configuration (docker-compose.yml is empty)
