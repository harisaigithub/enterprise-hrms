# Security Admin — End-to-End Update

## What changed

- Replaced the frontend-only mock service with authenticated backend APIs.
- Restricted every Security Admin endpoint to the `ADMIN` role.
- Enforced `security:read` and `security:write` permissions.
- Connected roles and permissions to the existing RBAC database tables.
- Added custom-role creation, explicit permission grants/revocations, MFA policy controls, user creation/deactivation, forced password reset, and session revocation.
- Added persistent password, SSO, session, IP restriction, encryption-key, backup, and restore configuration.
- Added two-person restore approval with requester/self-approval and duplicate-approval protection.
- Added emergency break-glass justification and critical audit events.
- Connected the audit screen to real backend audit records and chain-integrity verification.
- Fixed the case-sensitive Security service import and removed runtime dependency on mock Security data.

## Business rules

1. Only Admin users can access these APIs.
2. Built-in roles cannot be deleted.
3. A custom role cannot be deleted while users are assigned to it.
4. Admin and HR roles require a documented exception before MFA can be disabled.
5. An Admin cannot deactivate their own account.
6. Deactivation and forced password reset revoke active refresh sessions.
7. Restore execution requires approvals from two distinct users; the requester cannot approve.
8. All sensitive changes are written to the central audit log.

## Validation completed

- Prisma schema validation: passed.
- Prisma Client generation: passed.
- Backend TypeScript typecheck: passed.
- Security Admin page/service ESLint: passed.

The full frontend production build is still blocked by pre-existing case-sensitive imports in unrelated modules (Compliance, LMS, Separation, Reports, and others). The Security Admin import casing itself is fixed in this update.
