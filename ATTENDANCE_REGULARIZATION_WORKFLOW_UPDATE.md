# Attendance Regularization — End-to-End Workflow

## Outcome

Attendance correction is now a controlled business process instead of a direct record edit.

`Employee submission → Manager review → HR verification → Attendance update`

The workflow also supports `More Details Required → Employee resubmission`, rejection at either approval stage, notifications, audit logs, and immutable status history.

## Business rules implemented

- Only past attendance dates can be regularized.
- Punch-in and punch-out are mandatory, ordered correctly, and limited to 18 hours.
- Duplicate active requests for the same employee/date are blocked.
- A reporting manager can act only on requests from direct reports.
- Self-approval is blocked.
- HR/Admin can verify only after manager approval.
- Rejection and “More Details” comments are mandatory.
- The attendance punch is updated only after final HR verification.
- Every transition records actor, previous status, new status, comment, and timestamp.
- Employees and approvers receive in-app notifications.
- Every important action is written to the audit log.

## Status lifecycle

- Submitted
- More Details Required
- Resubmitted
- Manager Approved
- Approved or Rejected

## Setup and demo

1. Run the new Prisma migration.
2. As Admin, open **Workflows → Workflow Library** and install **Attendance Regularization**.
3. Employee submits a correction from **Attendance → Regularization**.
4. Reporting Manager approves, rejects, or requests more details.
5. If sent back, Employee edits and resubmits it.
6. HR/Admin performs final verification; only then is the attendance record updated.

## Verification completed

- Prisma schema validation: passed
- Prisma Client generation: passed
- Backend TypeScript typecheck: passed
- Attendance page and service ESLint: passed
- Full frontend build is currently blocked by pre-existing case-sensitive imports in unrelated modules in the supplied archive (Policies, Recruitment, Helpdesk, and others). The changed attendance files pass targeted validation.
