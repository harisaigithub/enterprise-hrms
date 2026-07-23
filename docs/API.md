# API Documentation

## Current Status

**No backend API has been implemented.** The Axios instance (`src/services/api.js`) is configured and ready, but all service calls currently resolve with mock data from `src/mock/` files.

## Axios Configuration

**File**: `src/services/api.js`

| Setting | Value |
|---------|-------|
| Base URL | `VITE_API_URL` env var or `/api` |
| Timeout | 15,000ms |
| Content-Type | `application/json` |

### Request Interceptor

Attaches `Authorization: Bearer <token>` header from `localStorage.getItem("hrms_token")`.

### Response Interceptor

On 401 response: clears `hrms_token` and `hrms_role` from localStorage. All errors are normalized to `{ status, message }` shape.

## Planned API Endpoints

Based on the service modules and database design, the following endpoints are planned:

### Authentication

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |

### Employees

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/employees` | List employees (paginated, filterable) | Yes |
| GET | `/api/employees/:id` | Get single employee | Yes |
| POST | `/api/employees` | Create employee | Yes |
| PUT | `/api/employees/:id` | Update employee | Yes |
| DELETE | `/api/employees/:id` | Delete employee | Yes |

**Query Parameters for GET `/api/employees`:**
- `search` - Search by name, email, ID, designation
- `department` - Filter by department
- `status` - Filter by status
- `page` - Page number
- `limit` - Results per page

### Attendance

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/attendance` | Get attendance records | Yes |
| GET | `/api/attendance/summary` | Get team attendance summary | Yes |
| POST | `/api/attendance/check-in` | Check in | Yes |
| POST | `/api/attendance/check-out` | Check out | Yes |

**Query Parameters for GET `/api/attendance`:**
- `employeeId` - Filter by employee
- `month` - Filter by month
- `year` - Filter by year

### Leave

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/leave/types` | List leave types | Yes |
| GET | `/api/leave/balance` | Get leave balance | Yes |
| GET | `/api/leave/requests` | List leave requests | Yes |
| POST | `/api/leave/apply` | Apply for leave | Yes |
| PUT | `/api/leave/:id/approve` | Approve leave request | Yes |
| PUT | `/api/leave/:id/reject` | Reject leave request | Yes |

**Query Parameters for GET `/api/leave/requests`:**
- `employeeId` - Filter by employee
- `status` - Filter by status (Pending, Approved, Rejected)

### Payroll

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/payroll/runs` | List payroll runs | Yes |
| GET | `/api/payroll/payslips` | Get payslips for employee | Yes |
| GET | `/api/payroll/payslips/:id` | Get single payslip | Yes |
| POST | `/api/payroll/runs/:id/process` | Run payroll processing | Yes |

### Search

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/search?q=` | Global search across all entities | Yes |

## Mock Service Functions

All current "API" calls are in `src/services/` and use mock data:

### `employeeService.js`
- `getEmployees({ search, department, status })` → filters against `mock/employees.js`
- `getEmployee(id)` → finds by ID or throws 404
- `createEmployee(payload)` → returns payload with generated ID
- `updateEmployee(id, payload)` → returns mock success
- `deleteEmployee(id)` → returns `{ deleted: true }`

### `attendanceService.js`
- `getMyAttendance({ employeeId, month, year })` → filters against `mock/attendance.js`
- `getTeamSummary()` → returns team attendance summary
- `checkIn(employeeId)` → returns current timestamp as check-in
- `checkOut(employeeId)` → returns current timestamp as check-out

### `leaveService.js`
- `getLeaveTypes()` → returns leave type definitions
- `getMyLeaveBalance(employeeId)` → returns leave balances
- `getLeaveRequests({ employeeId, status })` → filters against `mock/leave.js`
- `applyLeave(payload)` → returns payload with generated ID
- `approveLeave(requestId, comments)` → returns approval mock
- `rejectLeave(requestId, comments)` → returns rejection mock

### `payrollService.js`
- `getPayrollRuns()` → returns payroll run history
- `getPayslips(employeeId)` → filters payslips by employee
- `getPayslip(id)` → finds by ID or throws 404
- `runPayroll(payrollRunId)` → returns processing status

## Response Shapes

All services wrap responses in `{ data: ... }` to match Axios response convention.

### Employee Object
```json
{
  "id": "EMP001",
  "avatar": "https://i.pravatar.cc/150?img=1",
  "firstName": "Matsya",
  "lastName": "Singh",
  "email": "Matsya.Singh@company.com",
  "phone": "+1-555-0101",
  "designation": "Senior Software Engineer",
  "department": "Engineering",
  "location": "New York",
  "employmentType": "Full-Time",
  "status": "Active",
  "joinDate": "2021-03-15",
  "salary": 95000,
  "managerId": "EMP005",
  "gender": "Female",
  "dob": "1990-07-22"
}
```

### Leave Request Object
```json
{
  "id": "LR001",
  "employeeId": "EMP001",
  "employeeName": "Matsya Singh",
  "leaveTypeId": "LT01",
  "leaveTypeName": "Earned Leave",
  "startDate": "2026-07-28",
  "endDate": "2026-07-30",
  "days": 3,
  "reason": "Personal vacation",
  "status": "Pending",
  "appliedOn": "2026-07-20",
  "approverId": "EMP005",
  "approverName": "Alice Quinn",
  "approvedOn": null,
  "comments": ""
}
```

### Attendance Record Object
```json
{
  "id": 1,
  "employeeId": "EMP001",
  "date": "2026-07-01",
  "checkIn": "09:02",
  "checkOut": "18:05",
  "status": "Present",
  "hoursWorked": 9.05
}
```

### Payroll Run Object
```json
{
  "id": "PR-2026-07",
  "period": "July 2026",
  "month": 7,
  "year": 2026,
  "status": "Draft",
  "processedOn": null,
  "approvedBy": null,
  "totalEmployees": 62,
  "grossPayroll": 4250000,
  "totalDeductions": 680000,
  "netPayroll": 3570000
}
```
