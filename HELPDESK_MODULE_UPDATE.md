# Helpdesk module update

Implemented a persistent Helpdesk workflow backed by PostgreSQL.

## Included

- Ticket creation with category, subject, description, priority and optional attachment name
- Category-based queue routing and SLA deadline calculation
- Confidential grievance queue protection
- Employee/Manager access limited to their own tickets
- HR/Admin queue access and ticket resolution
- Mandatory resolution notes
- Three-day requester-only reopen window
- Ticket comments and internal-agent note support in the API
- Assignment API for HR/Admin
- Pagination, status/search query support and audit logging

## Apply and validate

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run typecheck

cd ..\frontend
npm run build
```

After migration, sign out and sign back in once so seeded permission changes are reflected in a fresh JWT.
