# Professional Employee Bulk Import

## What was added

- Admin/HR-only bulk employee onboarding from CSV.
- Downloadable CSV template with supported fields.
- Server-side dry-run validation before import.
- Row and field-level validation errors in the UI.
- Duplicate email and phone detection within the file and database.
- Department, designation, location, manager, employment type, and joining-date validation.
- Maximum batch size of 500 employees and maximum browser file size of 5 MB.
- Atomic database transaction: either every validated employee is created or none are.
- Employee user accounts, employee codes, reporting hierarchy, and initial movement history are created together.
- One audit event records the authenticated administrator and all imported employee codes.

## Business workflow

1. Admin or HR downloads the template.
2. They populate employee and organizational data and upload the CSV.
3. HRMS performs a dry run and displays exact row-level corrections.
4. Import remains disabled until the complete file is valid.
5. A confirmed import creates all accounts and employee records atomically.

## Security and integrity

- The backend independently enforces ADMIN/HR role and `employees:write` permission.
- Unknown organization master data is rejected instead of being silently created.
- Managers must exist and be active.
- Existing records are not modified and partial batches are never committed.
