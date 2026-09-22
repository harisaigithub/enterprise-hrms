# Payroll Approval and Release Workflow

## State machine

`Draft → Processing → Approved → Paid → Locked`

A rejected Processing run returns to Draft for correction and recalculation.

## Business controls

- HR or Admin with `payroll:write` can prepare a Draft run.
- Preparation records the employee and timestamp.
- The preparer cannot approve or reject their own run (four-eyes control).
- Only an Admin with `payroll:approve` can approve or reject.
- Approval does not mark salaries as paid.
- Only an approved run can be released for payment.
- Payslips become Paid only during release.
- Only Paid payroll can be locked and made immutable.
- Rejection requires a meaningful reason and clears generated payslips for recalculation.
- Every state transition is written to the central audit log using the authenticated user ID.
- Payroll screens no longer silently fall back to mock payroll data when APIs fail.

## Validation

- Prisma schema validation passed.
- Prisma Client generation passed.
- Backend TypeScript typecheck passed.
- Payroll page and service ESLint passed.
