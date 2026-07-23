# Features

## Implemented Features

### Dashboard
- ✅ Time-based greeting (Good morning/afternoon/evening)
- ✅ Alert feed with urgency levels (urgent, warning, info)
- ✅ Hiring insights with 4 KPIs (Applicants, Interviewing, Offer, Onboarded)
- ✅ Bar chart showing weekly hiring pipeline
- ✅ Quick actions grid (6 action buttons)
- ✅ People snapshot (8 team members)
- ✅ Payroll summary card
- ✅ Resources quick links
- ✅ Role-specific dashboards (HR, Admin, Manager, Employee)

### Employee Management
- ✅ Searchable employee table (by name, email, ID, designation)
- ✅ Department filter dropdown
- ✅ Status filter dropdown
- ✅ Sortable pagination (8 per page)
- ✅ Add Employee modal with form validation
- ✅ Employee profile page with 3 tabs:
  - Personal Info (email, phone, location, DOB)
  - Employment (designation, department, join date, employment type)
  - Payroll (CTC, monthly gross)
- ✅ Back navigation
- ✅ Status badges (Active, On Leave, Inactive, Terminated)
- ✅ Loading states
- ✅ Empty state handling
- ✅ Error handling with retry navigation

### Attendance
- ✅ Check-in / Check-out toggle button
- ✅ Team summary stats (Present, WFH, Late, Absent, On Leave)
- ✅ Monthly records table with status badges
- ✅ Month/year picker
- ✅ Status count chips per month
- ✅ Date formatting with weekday display

### Leave Management
- ✅ Leave balance cards with usage progress bar
- ✅ Leave type definitions (Earned, Sick, Casual, Compensatory Off, Maternity, Paternity)
- ✅ Apply for Leave modal with:
  - Leave type dropdown
  - Date range picker
  - Duration calculation
  - Reason textarea
  - Form validation
- ✅ Leave requests table with status filter
- ✅ Status badges (Pending, Approved, Rejected, Cancelled)

### Payroll
- ✅ Payroll runs table with financial figures
- ✅ Status badges (Draft, Processing, Approved, Paid, Failed)
- ✅ Run Payroll with ConfirmDialog (confirmation before processing)
- ✅ Payslip detail view with earnings/deductions breakdown
- ✅ Two-tab layout (Payroll Runs / My Payslips)
- ✅ Indian number formatting (₹)
- ✅ Download button for paid runs

### Global Search
- ✅ Ctrl+K / Cmd+K keyboard shortcut
- ✅ Global search input in navbar
- ✅ Debounced search (150ms)
- ✅ Searchable entities: Employees, Leave Requests, Payroll Runs
- ✅ Fuzzy matching (starts-with priority over contains)
- ✅ Dropdown results with type badges
- ✅ Result count display
- ✅ Click-to-navigate
- ✅ Clear button
- ✅ Escape key to close
- ✅ Outside click to close

### UI Framework
- ✅ Consistent sidebar navigation with 23 items in 5 groups
- ✅ Active route highlighting with indicator bar
- ✅ Notification bell with badge count (hardcoded: 3)
- ✅ User avatar and info display
- ✅ Responsive layout with CSS variables
- ✅ Sticky header and sidebar
- ✅ Hover effects on all interactive elements
- ✅ Animations on modals and dialogs
- ✅ Scrollbar styling
- ✅ Loading spinner with animation
- ✅ Empty states for all lists
- ✅ Confirmation dialogs for destructive actions

## Partially Implemented Features

### Authentication
- ✅ AuthContext provider with user/role/permissions state
- ✅ 4 mock users with roles
- ✅ localStorage persistence
- ✅ Permission arrays defined for each role
- ❌ No login page — Login.jsx is empty
- ❌ No real JWT authentication
- ❌ Permissions not enforced in UI components
- ❌ No route guards

### Role-Based Dashboards
- ✅ HRDashboard — fully implemented
- ⚠️ AdminDashboard — placeholder text only
- ⚠️ ManagerDashboard — placeholder text only
- ⚠️ EmployeeDashboard — placeholder text only

## Features Not Started

### 18 Module Stubs (no implementation)

These pages only show the `ModuleStub` "Under Construction" component:

1. **Recruitment (ATS)** — Job requisitions, candidate pipeline, interviews
2. **Onboarding** — Checklists, document collection, IT provisioning
3. **Performance Management** — OKRs, 360 feedback, reviews
4. **Learning Management (LMS)** — Courses, certifications, compliance training
5. **Asset Management** — Inventory, assignment, maintenance
6. **Task Management** — Boards, time logging, task assignment
7. **Expense Management** — Claims, receipts, approval workflow
8. **Travel Management** — Requests, booking, settlement
9. **Employee Self Service (ESS)** — Profile, payslips, requests
10. **Helpdesk** — Ticketing, SLA, escalation
11. **Policy Management** — Documents, acknowledgements, expiry
12. **Separation Management** — Resignation, clearance, F&F
13. **Organization Management** — Structure, departments, locations
14. **Workflow Engine** — Approval chains, routing, delegation
15. **Reports & Analytics** — Standard/custom reports, scheduling
16. **Notifications** — Email, SMS, push, in-app
17. **Compliance** — Statutory filing, POSH, data retention
18. **Security & Administration** — RBAC, SSO, MFA, audit logs

### Backend (Not Started)
- ✅ Database design document exists (15 tables, PostgreSQL)
- ❌ No server implementation
- ❌ No API endpoints
- ❌ No real database
- ❌ No migration files
- ❌ No authentication middleware
- ❌ No tests

### Empty/Failed Pages
- **Login.jsx** — Empty file
- **Settings.jsx** — Empty file
- **styles/dashboard.css** — Empty file
- **docs/ files** — 7 empty markdown files

## Key UI Behaviors

- Lazy loading with React.lazy() for all module pages
- Suspense fallback with Spinner during page transitions
- Inline styles throughout (no CSS modules or styled-components)
- CSS custom properties for consistent theming
- Mouse enter/leave handlers for hover effects
- Use of `id` attributes for test selectors
