# Dashboard and Leave UI Update

## Included improvements

- Interactive leave-balance donut chart using the existing leave API data.
- Clickable donut sections, legend items and leave cards.
- Selected leave details: total, used, remaining and pending days.
- Clickable request-status summaries for All, Pending, Approved and Rejected.
- Responsive layout for desktop, tablet and mobile.
- Employee and Manager dashboards reorganized into essential information and collapsible updates.
- Quick actions for Leave, Payroll, Performance and Tasks.
- No backend, database or API-contract changes.

## Apply on Windows

From the repository root:

```powershell
Expand-Archive `
"$env:USERPROFILE\Downloads\dashboard-leave-ui-update.zip" `
-DestinationPath . `
-Force
```

## Validate

```powershell
cd .\frontend
npm run build
```

Then start the project and test Employee and Manager dashboards plus the Leave page.

## Expected Leave interaction

1. Open Leave Management.
2. Click a donut colour, legend item or leave card.
3. Confirm Total, Used, Remaining and Pending values change for the selected type.
4. Click Pending, Approved or Rejected status summaries.
5. Confirm the request table filters correctly.

## Expected Dashboard interaction

1. Sign in as Employee and then Manager.
2. Confirm Quick Actions navigate to Leave, Payroll, Performance and Tasks.
3. Confirm essential cards are visible initially.
4. Expand `Updates & reminders` to view holidays, announcements, birthdays and training.
