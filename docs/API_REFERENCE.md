# API Reference

## Current State

**No real API endpoints exist.** This document documents the planned API surface based on:
- Service functions in `src/services/`
- Mock data shapes in `src/mock/`
- Database design in `docs/03_Database_Design.md`

When the backend is built, these endpoints should be implemented. The Axios instance at `src/services/api.js` is pre-configured for base URL `/api` with JWT auth headers.

---

## Authentication

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "UUID",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "avatar": "string (url)"
  },
  "token": "string (JWT)"
}
```

**Response 401:**
```json
{
  "status": 401,
  "message": "Invalid email or password"
}
```

**Authorization:** None
**Validation:** Email format, password not empty

### POST /api/auth/logout

Invalidate current session.

**Authorization:** Bearer token
**Response 200:** `{ "message": "Logged out successfully" }`

### POST /api/auth/refresh

Refresh expiring JWT token.

**Authorization:** Bearer token (valid)
**Response 200:** `{ "token": "string (new JWT)" }`

---

## Employees

### GET /api/employees

List employees with filtering and pagination.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name, email, ID, designation |
| `department` | string | No | Filter by department name |
| `status` | string | No | Filter by status (Active, On Leave, Inactive, Terminated) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Results per page (default: 10) |

**Response 200:**
```json
{
  "data": [
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
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}
```

**Authorization:** Bearer token
**Validation:** None (query params sanitized)

### GET /api/employees/:id

Get single employee by ID.

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Employee ID (e.g., EMP001) |

**Response 200:** Single employee object (same shape as list item)
**Response 404:** `{ "status": 404, "message": "Employee not found" }`
**Authorization:** Bearer token

### POST /api/employees

Create new employee.

**Request Body:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, valid email)",
  "designation": "string (required)",
  "department": "string (required)",
  "phone": "string",
  "location": "string",
  "employmentType": "string (default: Full-Time)",
  "salary": "number",
  "managerId": "string",
  "gender": "string",
  "dob": "date"
}
```

**Response 201:** Created employee object with generated ID
**Authorization:** Bearer token (HR, ADMIN only)
**Validation:** firstName, lastName required; valid email; designation required; department required

### PUT /api/employees/:id

Update existing employee.

**Path Parameters:** `id` (string)
**Request Body:** Partial employee object (any subset of fields)
**Response 200:** Updated employee object
**Authorization:** Bearer token (HR, ADMIN only)

### DELETE /api/employees/:id

Delete employee.

**Path Parameters:** `id` (string)
**Response 200:** `{ "id": "EMP001", "deleted": true }`
**Authorization:** Bearer token (ADMIN only)

---

## Attendance

### GET /api/attendance

Get attendance records for an employee.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | No | Employee ID (defaults to current user) |
| `month` | number | No | Month (1-12) |
| `year` | number | No | Year (e.g., 2026) |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "employeeId": "EMP001",
      "date": "2026-07-01",
      "checkIn": "09:02",
      "checkOut": "18:05",
      "status": "Present",
      "hoursWorked": 9.05
    }
  ]
}
```

**Authorization:** Bearer token
**Validation:** month (1-12), year (valid range)

### GET /api/attendance/summary

Get team attendance summary for today.

**Response 200:**
```json
{
  "data": {
    "date": "2026-07-21",
    "present": 42,
    "late": 5,
    "absent": 3,
    "onLeave": 4,
    "wfh": 8,
    "total": 62
  }
}
```

**Authorization:** Bearer token (HR, MANAGER)

### POST /api/attendance/check-in

Record check-in for employee.

**Request Body:**
```json
{
  "employeeId": "string (required)"
}
```

**Response 200:**
```json
{
  "data": {
    "employeeId": "EMP001",
    "date": "2026-07-21",
    "checkIn": "09:02",
    "status": "Present"
  }
}
```

**Authorization:** Bearer token
**Validation:** Cannot check in twice on same day

### POST /api/attendance/check-out

Record check-out for employee.

**Request Body:**
```json
{
  "employeeId": "string (required)"
}
```

**Response 200:**
```json
{
  "data": {
    "employeeId": "EMP001",
    "checkOut": "18:05"
  }
}
```

**Authorization:** Bearer token
**Validation:** Must have checked in first

---

## Leave

### GET /api/leave/types

Get all leave type definitions.

**Response 200:**
```json
{
  "data": [
    {
      "id": "LT01",
      "name": "Earned Leave",
      "code": "EL",
      "maxDays": 18,
      "carryForward": true
    }
  ]
}
```

**Authorization:** Bearer token

### GET /api/leave/balance

Get leave balance for current employee.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | No | Employee ID (defaults to current user) |

**Response 200:**
```json
{
  "data": [
    {
      "leaveTypeId": "LT01",
      "leaveTypeName": "Earned Leave",
      "total": 18,
      "used": 4,
      "pending": 1,
      "available": 13
    }
  ]
}
```

**Authorization:** Bearer token

### GET /api/leave/requests

List leave requests.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | No | Filter by employee |
| `status` | string | No | Filter by status (Pending, Approved, Rejected, Cancelled) |

**Response 200:**
```json
{
  "data": [
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
  ],
  "total": 6
}
```

**Authorization:** Bearer token

### POST /api/leave/apply

Submit a new leave request.

**Request Body:**
```json
{
  "employeeId": "string (required)",
  "leaveTypeId": "string (required)",
  "startDate": "date (required)",
  "endDate": "date (required)",
  "reason": "string (required)"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "LR20260721001",
    "employeeId": "EMP001",
    "leaveTypeId": "LT01",
    "startDate": "2026-07-28",
    "endDate": "2026-07-30",
    "reason": "Personal vacation",
    "status": "Pending",
    "appliedOn": "2026-07-21"
  }
}
```

**Authorization:** Bearer token
**Validation:** startDate <= endDate; reason required; leaveTypeId valid; sufficient balance

### PUT /api/leave/:id/approve

Approve a pending leave request.

**Path Parameters:** `id` (string)
**Request Body:**
```json
{
  "comments": "string"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "LR001",
    "status": "Approved",
    "comments": "Approved."
  }
}
```

**Authorization:** Bearer token (HR, MANAGER)

### PUT /api/leave/:id/reject

Reject a pending leave request.

**Path Parameters:** `id` (string)
**Request Body:**
```json
{
  "comments": "string (required for rejection)"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "LR001",
    "status": "Rejected",
    "comments": "Sprint deadline. Please reschedule."
  }
}
```

**Authorization:** Bearer token (HR, MANAGER)

---

## Payroll

### GET /api/payroll/runs

List all payroll runs.

**Response 200:**
```json
{
  "data": [
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
  ]
}
```

**Authorization:** Bearer token

### GET /api/payroll/payslips

Get payslips for an employee.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | string | No | Employee ID (defaults to current user) |

**Response 200:**
```json
{
  "data": [
    {
      "id": "PS-2026-06-EMP001",
      "payrollRunId": "PR-2026-06",
      "employeeId": "EMP001",
      "employeeName": "Matsya Singh",
      "period": "June 2026",
      "earnings": {
        "basicSalary": 5750,
        "hra": 2300,
        "conveyanceAllowance": 400,
        "medicalAllowance": 250,
        "performanceBonus": 500,
        "otherAllowances": 200,
        "total": 9400
      },
      "deductions": {
        "providentFund": 690,
        "professionalTax": 200,
        "incomeTax": 1200,
        "healthInsurance": 180,
        "total": 2270
      },
      "netPay": 7130,
      "status": "Paid",
      "paidOn": "2026-06-28",
      "paymentMode": "Bank Transfer"
    }
  ]
}
```

**Authorization:** Bearer token

### GET /api/payroll/payslips/:id

Get single payslip by ID.

**Path Parameters:** `id` (string)
**Response 200:** Single payslip object
**Response 404:** `{ "status": 404, "message": "Payslip not found" }`
**Authorization:** Bearer token

### POST /api/payroll/runs/:id/process

Process a draft payroll run.

**Path Parameters:** `id` (string)
**Response 200:**
```json
{
  "data": {
    "id": "PR-2026-07",
    "status": "Processing",
    "startedAt": "2026-07-21T10:30:00.000Z"
  }
}
```

**Authorization:** Bearer token (HR, ADMIN only)
**Validation:** Payroll run must be in "Draft" status

---

## Search

### GET /api/search

Global search across all entities.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |

**Response 200:**
```json
{
  "data": [
    {
      "id": "EMP001",
      "type": "Employee",
      "title": "Matsya Singh",
      "subtitle": "Senior Software Engineer · Engineering",
      "meta": "Matsya.Singh@company.com",
      "avatar": "https://i.pravatar.cc/150?img=1",
      "href": "/employees/EMP001"
    }
  ]
}
```

**Authorization:** Bearer token
**Validation:** `q` parameter required, minimum 2 characters
**Results capped at:** 20
