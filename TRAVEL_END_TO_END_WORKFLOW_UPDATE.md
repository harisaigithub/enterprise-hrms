# Travel Management — End-to-End Business Workflow

## Outcome

Travel Management now uses persistent PostgreSQL records and secured backend APIs instead of frontend mock state.

`Employee Request → Manager Review → Finance Review (conditional) → Travel Desk Booking → Trip → Settlement → Expense Draft → Closure`

## Professional business rules

- Only authenticated employees can submit their own travel requests.
- Past start dates, reversed date ranges, trips over 90 days, and invalid costs are blocked.
- Overlapping active trips for the same employee are blocked.
- The reporting manager can act only on direct-report requests.
- Self-approval is prohibited.
- Manager can approve, reject, or request more details.
- Send-back and rejection require comments; employees can edit and resubmit.
- Requests above ₹10,000 require HR/Admin acting as the Finance Desk.
- Only approved requests can be booked or receive an advance.
- Travel advance is capped at 70% of estimated cost and cannot be disbursed twice.
- Settlement is allowed only after the trip end date.
- Settlement automatically creates a linked draft Expense Claim.
- Non-zero settlement balances require an explicit resolution method before closure.
- International passport display is masked; the full number is never returned to the UI.
- Every important transition creates status history, an audit entry, and relevant notification.

## Role access

| Role | Access |
| --- | --- |
| Employee | Submit, view own requests, edit/resubmit, submit settlement |
| Manager | Own requests plus direct-report review |
| HR/Admin | Finance approval, booking, advance and settlement closure |

## Demo setup

1. Apply the Prisma migration.
2. Admin opens **Workflows → Workflow Library** and installs/reinstalls **Business Travel**.
3. Employee submits a future-dated travel request.
4. Reporting Manager approves or sends it back.
5. HR/Admin approves the budget when the cost is above ₹10,000.
6. HR/Admin books travel and optionally records an advance.
7. After the end date, Employee submits settlement.
8. HR/Admin resolves the balance and closes the request.

## Verification

- Prisma schema validation: passed
- Prisma Client generation: passed
- Backend TypeScript typecheck: passed
- Travel page/service ESLint: passed
- Full build in the supplied Linux archive remains blocked by unrelated pre-existing filename-case mismatches. The user's current Windows checkout previously builds successfully and the Travel filename casing is corrected in this update.
