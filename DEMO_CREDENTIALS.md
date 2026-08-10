# Demo Credentials — Proteccio Enterprise HRMS

All seeded accounts share the password **`Password@123`**.

## Quick access (one-click on the login screen)

| Role     | Name            | Employee ID | Email                          |
|----------|-----------------|-------------|--------------------------------|
| Admin    | Robert King     | EMP010      | `robert.king@company.com`      |
| HR       | Sunita Reddy    | EMP011      | `sunita.reddy@company.com`     |
| Manager  | Anjali Desai    | EMP005      | `anjali.desai@company.com`     |
| Employee | Matsya Singh    | EMP001      | `matsya.singh@company.com`     |

## Full employee list (all can log in)

| Employee ID | Name             | Department        | Designation            | Status   | Email                          |
|-------------|------------------|-------------------|------------------------|----------|--------------------------------|
| EMP001      | Matsya Singh     | Engineering       | Senior Software Eng.   | Active   | `matsya.singh@company.com`     |
| EMP002      | Vijay Mudgal     | Product           | Product Manager        | Active   | `vijay.mudgal@company.com`     |
| EMP003      | Vikas Agarwal    | Design            | UX Designer            | Active   | `vikas.agarwal@company.com`    |
| EMP004      | Rohan Sharma     | Engineering       | DevOps Engineer        | Active   | `rohan.sharma@company.com`     |
| EMP005      | Anjali Desai     | Engineering       | Engineering Manager    | Active   | `anjali.desai@company.com`     |
| EMP006      | Rahul Verma      | Analytics         | Data Analyst           | On Leave | `rahul.verma@company.com`      |
| EMP007      | Sneha Kapoor     | Product           | VP of Product          | Active   | `sneha.kapoor@company.com`     |
| EMP008      | Amit Patel       | Human Resources   | HR Specialist          | Active   | `amit.patel@company.com`       |
| EMP009      | Priya Mehta      | Analytics         | Head of Analytics      | Active   | `priya.mehta@company.com`      |
| EMP010      | Robert King      | Executive         | CEO                    | Active   | `robert.king@company.com`      |
| EMP011      | Sunita Reddy     | Human Resources   | HR Manager             | Active   | `sunita.reddy@company.com`     |
| EMP012      | Manish Gupta     | Engineering       | Backend Engineer       | Active   | `manish.gupta@company.com`     |
| EMP013      | Neha Joshi       | Marketing         | Marketing Manager      | Active   | `neha.joshi@company.com`       |
| EMP014      | Kiran Kumar      | Engineering       | Frontend Engineer      | Active   | `kiran.kumar@company.com`      |
| EMP015      | Pooja Iyer       | Finance           | Finance Analyst        | Inactive | `pooja.iyer@company.com`       |

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
