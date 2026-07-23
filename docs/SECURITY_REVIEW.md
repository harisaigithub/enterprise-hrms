# Security Review

## Summary

**This application has no real security.** Authentication is fully mocked, there is no backend, and no production deployment exists. This review identifies risks in the current codebase and weaknesses that will need addressing when the backend is built.

---

## 1. Missing Authentication

### Issue
The entire auth system is a mock. Any user can call `login("ADMIN")` to assume the admin role. There is no password, no token, no session.

### Location
`src/context/AuthContext.jsx:116-122`

### Severity
**CRITICAL** — For any production deployment.

### Evidence
```jsx
const login = useCallback((role) => {
    const u = MOCK_USERS[role] || MOCK_USERS.HR;
    ...
    localStorage.setItem("hrms_role", role);
}, []);
```

### Fix
- Implement `POST /api/auth/login` endpoint
- Add bcrypt password verification
- Generate and verify JWT tokens
- Create a real login page UI

---

## 2. Missing Route Guards

### Issue
All 25 routes in `AppRouter.jsx` are publicly accessible. There is no authentication check at the router level.

### Location
`src/routes/AppRouter.jsx`

### Severity
**CRITICAL**

### Evidence
```jsx
<Route path="/payroll" element={<Payroll />} />
// No ProtectedRoute wrapper, no auth check
```

### Fix
- Create a `ProtectedRoute` component that checks `useAuth()` before rendering
- Wrap all authenticated routes
- Redirect to `/login` if not authenticated

---

## 3. Missing Permission Enforcement

### Issue
Permissions are defined in `AuthContext.jsx` (4 arrays with `<module>:<action>` strings) but **no component checks them**. Any role can access any page and see any data.

### Location
`src/context/AuthContext.jsx:13-60` (definitions only, never used)

### Severity
**HIGH**

### Evidence
```jsx
// Permissions defined:
HR: ["employees:read", "employees:write", "payroll:read", ...]

// But no component does:
// if (!permissions.includes("payroll:read")) return <AccessDenied />
```

### Fix
- Create a `RequirePermission` component or hook
- Check permissions before rendering UI elements
- Add permission checks in all page components for write/delete actions
- Backend must also enforce permissions

---

## 4. JWT Stored in localStorage

### Issue
The Axios interceptor reads the JWT token from `localStorage`. This is vulnerable to XSS attacks — if an attacker injects JavaScript, they can steal the token.

### Location
`src/services/api.js:21`

### Severity
**MEDIUM** (for future backend)

### Evidence
```jsx
const token = localStorage.getItem("hrms_token");
if (token) {
    config.headers.Authorization = `Bearer ${token}`;
}
```

### Fix
- Use httpOnly cookies for JWT storage when backend is implemented
- Or use in-memory storage with refresh token rotation
- Implement Content Security Policy (CSP) headers

---

## 5. No Input Validation on Frontend

### Issue
Form validation exists in the UI (required fields, email format, date ranges) but there is no backend to validate inputs. When the backend is built, all validation must be re-implemented server-side.

### Location
- `pages/Employees/Employees.jsx:35-44` — Add Employee form validation
- `pages/Leave/Leave.jsx:21-31` — Apply Leave form validation

### Severity
**MEDIUM** (for future backend)

### Evidence
```jsx
const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    ...
};
```

### Fix
- Backend must validate all inputs independently
- Never trust client-side validation
- Use a validation library (Joi, Zod, express-validator)

---

## 6. SQL Injection Risk (Planned)

### Issue
No backend exists, but when it is built, all database queries must use parameterized queries or an ORM to prevent SQL injection.

### Location
Planned backend (not yet built)

### Severity
**HIGH** (when backend is built)

### Fix
- Use Prisma ORM (parameterized queries by default)
- Never concatenate user input into SQL strings
- Validate and sanitize all query parameters

---

## 7. No Password Handling

### Issue
No passwords exist in the system. The database design specifies `password_hash VARCHAR(255)` with bcrypt, but this has not been implemented.

### Location
`docs/03_Database_Design.md:210` (planned only)

### Severity
**HIGH** (for future)

### Evidence
From the design doc:
```sql
password_hash VARCHAR(255) NOT NULL  -- Bcrypt Hash (comment)
```

### Fix
- Use bcrypt with cost factor 12
- Never store plaintext passwords
- Implement password reset flow
- Enforce password strength requirements

---

## 8. No CORS Configuration

### Issue
No CORS configuration exists anywhere. When the backend is built, CORS must be configured to allow only the frontend origin.

### Location
No backend code exists

### Severity
**MEDIUM** (for future)

### Fix
- Add `cors` middleware to Express
- Whitelist specific origins (not `*`)
- Restrict allowed HTTP methods
- Handle preflight OPTIONS requests

---

## 9. Environment Variable Issues

### Issue
`.env.example` is empty. No environment variables are documented. The only env var used in code is `VITE_API_URL` which defaults to `/api`.

### Location
- `.env.example` (empty)
- `src/services/api.js:13` (usage)

### Severity
**LOW**

### Evidence
```jsx
baseURL: import.meta.env.VITE_API_URL || "/api",
```

### Fix
- Document all environment variables in `.env.example`
- Add validation for required env vars at startup
- Never commit real secrets to `.env` files

---

## 10. Audit Trail

### Issue
The database design includes an `audit_logs` table with JSONB for tracking changes, but it has not been implemented. There is no way to track who changed what.

### Location
`docs/03_Database_Design.md:279-304`

### Severity
**MEDIUM** (for compliance)

### Fix
- Implement audit logging middleware
- Log all CREATE, UPDATE, DELETE operations
- Store actor, action, entity, old/new values, timestamp
- Make audit logs immutable (append-only)

---

## 11. Rate Limiting

### Issue
No rate limiting is configured. When the backend is built, API endpoints (especially auth) need rate limiting to prevent brute force attacks.

### Severity
**MEDIUM** (for future)

### Fix
- Use `express-rate-limit` package
- Limit auth endpoints to 5-10 requests per minute per IP
- Lock accounts after N failed login attempts

---

## 12. Security Headers

### Issue
No security headers are configured (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.).

### Severity
**LOW** (for future deployment)

### Fix
- Use `helmet` middleware in Express
- Configure Content Security Policy
- Enable HSTS in production

---

## 13. Dependency Vulnerabilities

### Issue
The project has dependencies but no `npm audit` has been run. Vulnerabilities may exist in:
- React 19.2.7
- Vite 8.1.1
- Axios 1.18.1
- Other transitive dependencies

### Location
`frontend/package.json`

### Severity
**MEDIUM** (should be checked regularly)

### Fix
- Run `npm audit` regularly
- Update dependencies promptly when vulnerabilities are published
- Consider using Dependabot or Snyk for automated monitoring

---

## 14. Information Exposure via Error Messages

### Issue
The Axios response interceptor normalizes errors (good), but when the backend is built, ensure no stack traces or internal details leak in error responses.

### Location
`src/services/api.js:40-46`

### Current Positive Practice
```jsx
return Promise.reject({
    status: error.response?.status || 0,
    message: error.response?.data?.message || error.message || "An unexpected error occurred."
});
```

### Status
**PARTIALLY ADDRESSED** — Frontend side covered. Backend must also normalize errors.

---

## Summary Table

| # | Issue | Severity | Status | Priority |
|---|-------|----------|--------|----------|
| 1 | Missing Authentication | CRITICAL | Not Started | P0 |
| 2 | Missing Route Guards | CRITICAL | Not Started | P0 |
| 3 | Missing Permission Enforcement | HIGH | Not Started | P1 |
| 4 | JWT in localStorage | MEDIUM | Future Risk | P2 |
| 5 | No Backend Input Validation | MEDIUM | Future Risk | P1 |
| 6 | SQL Injection Risk | HIGH | Future Risk | P1 |
| 7 | No Password Handling | HIGH | Not Started | P0 |
| 8 | No CORS Configuration | MEDIUM | Future Risk | P2 |
| 9 | Environment Variable Issues | LOW | Needs Fixing | P3 |
| 10 | No Audit Trail | MEDIUM | Not Started | P2 |
| 11 | No Rate Limiting | MEDIUM | Future Risk | P2 |
| 12 | No Security Headers | LOW | Future Risk | P3 |
| 13 | Dependency Vulnerabilities | MEDIUM | Should Check | P2 |
| 14 | Error Normalization | PARTIAL | Addressed | — |
