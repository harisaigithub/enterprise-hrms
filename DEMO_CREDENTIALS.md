# Demo Credentials — Proteccio Enterprise HRMS

All seeded accounts share the password **`Password@123`**.

## Quick access (one-click on the login screen)

| Role     | Name            | Employee ID | Email                          |
|----------|-----------------|-------------|--------------------------------|
| Admin    | Robert King     | EMP010      | `robert.king@company.com`      |
| HR       | Lewis Hamilton  | EMP011      | `lewis.hamilton@company.com`   |
| Manager  | Alice Quinn     | EMP005      | `alice.quinn@company.com`      |
| Employee | Matsya Singh    | EMP001      | `matsya.singh@company.com`     |

## Full employee list (all can log in)

| Employee ID | Name             | Department        | Designation            | Status   | Email                          |
|-------------|------------------|-------------------|------------------------|----------|--------------------------------|
| EMP001      | Matsya Singh     | Engineering       | Senior Software Eng.   | Active   | `matsya.singh@company.com`     |
| EMP002      | Vijay Mudgal     | Product           | Product Manager        | Active   | `vijay.mudgal@company.com`     |
| EMP003      | Vikas Agarwal    | Design            | UX Designer            | Active   | `vikas.agarwal@company.com`    |
| EMP004      | Gary Chen        | Engineering       | DevOps Engineer        | Active   | `gary.chen@company.com`        |
| EMP005      | Alice Quinn      | Engineering       | Engineering Manager    | Active   | `alice.quinn@company.com`      |
| EMP006      | James Sullivan   | Analytics         | Data Analyst           | On Leave | `james.sullivan@company.com`   |
| EMP007      | Viki Vance       | Product           | VP of Product          | Active   | `viki.vance@company.com`       |
| EMP008      | Kirk Wilson      | Human Resources   | HR Specialist          | Active   | `kirk.wilson@company.com`      |
| EMP009      | Priya Mehta      | Analytics         | Head of Analytics      | Active   | `priya.mehta@company.com`      |
| EMP010      | Robert King      | Executive         | CEO                    | Active   | `robert.king@company.com`      |
| EMP011      | Lewis Hamilton   | Human Resources   | HR Manager             | Active   | `lewis.hamilton@company.com`   |
| EMP012      | Mohammed Al-Rashid | Engineering    | Backend Engineer       | Active   | `m.alrashid@company.com`       |
| EMP013      | Laura Perez      | Marketing         | Marketing Manager      | Active   | `laura.perez@company.com`      |
| EMP014      | Tom Nguyen       | Engineering       | Frontend Engineer      | Active   | `tom.nguyen@company.com`       |
| EMP015      | Aisha Okonkwo    | Finance           | Finance Analyst        | Inactive | `aisha.okonkwo@company.com`    |

## Roles & permissions

The backend enforces role-based access (`<module>:<action>`). The four seeded roles:

- **ADMIN** — superset: everything readable, employees/payroll/leave writable, delete access.
- **HR** — employee/attendance/leave/payroll read+write, leave approvals, onboarding, policies, LMS, workflows.
- **MANAGER** — team reads, leave approvals, performance/tasks write, expense/travel approvals.
- **EMPLOYEE** — own attendance/leave/payroll reads, self-service (ESS), expenses, travel, helpdesk.

## How to reset the database

```bash
# from backend/
npm run prisma:migrate          # applies migrations
npm run prisma:seed             # wipes + reseeds demo data
```

## Planned: Google / Firebase SSO

Email/password auth is in place. Google Sign-In (or Firebase Auth) will be layered
on top of the same `/auth/*` flow so `user`, `token`, and `permissions` shapes
stay unchanged on the frontend.
