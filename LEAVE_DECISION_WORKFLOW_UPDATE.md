# Leave decision workflow update

## Included

- Manager/HR/Admin can approve pending leave with an optional comment.
- Rejecting leave requires a reason in both the UI and backend API.
- Employees can see approver, decision date, approval note, or rejection reason.
- Employees can only retrieve their own leave requests.
- Managers can retrieve their own and direct-report requests only.
- HR/Admin retain organization-level approval access.
- Self-approval is hidden in the UI and blocked by the backend.
- Employees cannot apply for leave on behalf of another employee.

## Install

Extract this ZIP into the `enterprise-hrms` repository root with overwrite enabled.

## Verify

```powershell
cd "C:\Users\user\OneDrive\Desktop\batch b hrms\enterprise-hrms\backend"
npm run typecheck

cd ..\frontend
npm run build
```

## End-to-end test

1. Sign in as Employee (`matsya.singh@company.com` / `Password@123`).
2. Open Leave, apply for a new non-overlapping date range, then sign out.
3. Sign in as Manager (`anjali.desai@company.com` / `Password@123`).
4. Open Leave and reject the pending request. Confirm a blank reason is blocked, then enter a clear reason and submit.
5. Sign back in as Employee and open Leave. Confirm Rejected status, approver, decision date, and rejection reason are visible.
6. Repeat with a new request and Approve it. Approval comments are optional and appear in decision details when entered.

Do not push until both builds and the browser flow pass.
