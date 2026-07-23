# Authentication Flow

## Current Implementation (Mock)

The authentication system is currently **entirely mocked** with hardcoded users and no real security.

### AuthContext (`src/context/AuthContext.jsx`)

#### Mock Users

| Role | ID | Name | Designation |
|------|-----|------|-------------|
| ADMIN | EMP010 | Robert King | CEO |
| HR | EMP011 | lewis hamilton | HR Manager |
| MANAGER | EMP005 | Alice Quinn | Engineering Manager |
| EMPLOYEE | EMP001 | Matsya Singh | Senior Software Engineer |

#### Login Flow

1. User calls `login(role)` — selects a role string directly
2. The function looks up `MOCK_USERS[role]` for user data
3. Looks up `ROLE_PERMISSIONS[role]` for permission array
4. Stores `hrms_role` in localStorage
5. Updates React state with user and permissions

#### Logout Flow

1. Removes `hrms_role` and `hrms_token` from localStorage
2. Resets user to default HR user

### Role-Based Permissions

Permissions are stored as arrays of `<module>:<action>` strings:

| Permission | ADMIN | HR | MANAGER | EMPLOYEE |
|-----------|-------|----|---------|----------|
| dashboard:read | ✓ | ✓ | ✓ | ✓ |
| employees:read | ✓ | ✓ | ✓ | — |
| employees:write | ✓ | ✓ | — | — |
| employees:delete | ✓ | — | — | — |
| attendance:read | ✓ | ✓ | ✓ | ✓ |
| leave:read | ✓ | ✓ | ✓ | ✓ |
| leave:write | ✓ | ✓ | — | ✓ |
| leave:approve | ✓ | ✓ | ✓ | — |
| payroll:read | ✓ | ✓ | ✓ | ✓ |
| payroll:write | ✓ | — | — | — |
| security:read | ✓ | — | — | — |
| reports:read | ✓ | ✓ | ✓ | — |

### How Permissions Are Used

Permissions are currently **defined but not enforced** in the UI. The `permissions` array from AuthContext is available to any component via `useAuth()`, but no component currently checks permissions before rendering actions.

## Planned Real Authentication Flow

Based on the database design and code comments, the intended flow is:

```
Frontend                          Backend
   │                                │
   │  POST /api/auth/login          │
   │  { email, password }           │
   │ ──────────────────────────▶    │
   │                                │
   │         Validate credentials   │
   │         bcrypt.compare()       │
   │         Generate JWT           │
   │                                │
   │  { user, token }              │
   │ ◀──────────────────────────    │
   │                                │
   │  Store token in localStorage  │
   │  Store "hrms_token"           │
   │                                │
   │  Subsequent API calls:         │
   │  GET /api/employees            │
   │  Authorization: Bearer <token> │
   │ ──────────────────────────▶    │
   │                                │
   │         JWT.verify(token)      │
   │         Extract role/user      │
   │         Check permissions      │
   │         Return data            │
   │ ◀──────────────────────────    │
```

### JWT Token

- **Generation**: On successful login, backend creates a JWT with claims: `{ userId, role, permissions, iat, exp }`
- **Storage**: Frontend stores in `localStorage.getItem("hrms_token")`
- **Transmission**: Axios interceptor adds `Authorization: Bearer <token>` to all requests
- **Expiry**: Token has an expiration (e.g., 24 hours); refresh mechanism planned

### Password Security

- **Hashing**: bcrypt with cost factor 12
- **Storage**: `users.password_hash` column
- **Validation**: `bcrypt.compare(password, hash)` on login

### Middleware Chain (Planned)

```
Request → Rate Limiter → CORS → Body Parser → JWT Verification → 
Role Check → Permission Check → Controller → Response
```

### Database Tables for Auth

- `users` — authentication accounts (email, password_hash, role_id)
- `roles` — role definitions (Admin, HR, Manager, Employee)
- `permissions` — granular permission codes
- `role_permissions` — junction table linking roles to permissions
- `audit_logs` — tracks all CRUD operations for compliance

### Security Considerations (from code comments)

- Do NOT expose raw stack traces — errors are normalized in Axios interceptor
- ConfirmDialog is used for high-impact actions (Golden Rule #7)
- JWT stored in localStorage (susceptible to XSS — future improvement: httpOnly cookies)
- API timeout set to 15 seconds
- 401 responses trigger automatic logout
