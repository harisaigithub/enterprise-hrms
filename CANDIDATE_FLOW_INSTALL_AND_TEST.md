# Candidate-to-Employee Workflow Update

## Install on the latest `main`

Extract the update ZIP into the repository root, then run:

```powershell
cd "C:\Users\user\OneDrive\Desktop\batch b hrms\enterprise-hrms\backend"
npx prisma migrate deploy --schema .\prisma\schema.prisma
npx prisma generate --schema .\prisma\schema.prisma
npm run typecheck

cd ..\frontend
npm run build
```

Start the project with the team's `start-local.cmd` (or the normal backend/frontend commands).

## End-to-end test

1. Open `http://localhost:5173/careers`, choose an open requisition, and submit a candidate application.
2. Quick-login as **HR**, open **Recruitment → Candidate Onboarding**, and click **First approval**.
3. Quick-login as **Admin**, return to **Candidate Onboarding**, then click **Second approval & generate offer**. Enter a salary inside the requisition band and a joining date. The secure invitation link is displayed and copied.
4. Open the invitation link in an incognito/private window. Accept or decline the offer.
5. After accepting, upload one or more onboarding documents (demo limit: 650 KB per file).
6. Login as **HR**, verify or reject each document.
7. When every submitted document is verified, click **Create employee account**.
8. Copy the generated employee email and temporary password, then verify the new account on the login page.

## Enforced business rules

- Only open/approved requisitions accept public applications.
- Duplicate applications for the same email and requisition are blocked.
- First approval is HR-only; second approval is Admin-only and must be performed by another user.
- An offer is created only after both approvals and salary-band validation.
- Invitation tokens are random, stored only as SHA-256 hashes, and expire after seven days.
- Documents can be uploaded only after offer acceptance.
- Employee creation is blocked until all uploaded documents are HR-verified.
- Employee/user creation is transactional and duplicate conversion is blocked.

For production, replace database-backed demo document data URLs with object storage and malware scanning.
