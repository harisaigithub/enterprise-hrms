# Candidate Workflow V2

This follow-up update includes:

- Redesigned responsive Careers, Offer and Document Upload portal.
- Fixed the Candidate Onboarding React effect warning.
- Blocks users without `recruitment:read` from opening `/recruitment` directly.
- Makes the development seed repeat-safe for Performance data.
- Retains the previously tested two-level approval, secure invitation, offer decision, document verification and employee-conversion workflow.

## Apply

Extract the ZIP into the repository root with `-Force`, then run:

```powershell
cd .\backend
npx prisma generate --schema .\prisma\schema.prisma
npm run typecheck

cd ..\frontend
npm run build
```

Restart both development servers. Disable the Careerflow browser extension while visually testing `/careers`; the extension injects its own broken panel below the application and is not part of HRMS.
