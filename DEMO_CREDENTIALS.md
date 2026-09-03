# Demo Credentials — Proteccio Enterprise HRMS

All seeded accounts share the password **`Password@123`**.

## Quick access (one-click on the login screen)

| Role     | Name            | Employee ID | Email                          | Hub Location |
|----------|-----------------|-------------|--------------------------------|--------------|
| Admin    | Rajesh Menon    | EMP010      | `rajesh.menon@company.com`     | Bengaluru    |
| HR       | Sunita Reddy    | EMP011      | `sunita.reddy@company.com`     | Bengaluru    |
| Manager  | Anjali Desai    | EMP005      | `anjali.desai@company.com`     | Bengaluru    |
| Employee | Matsya Singh    | EMP001      | `matsya.singh@company.com`     | Bengaluru    |

*(Note: Legacy alias `robert.king@company.com` is also supported for Admin sign-in).*

---

## Full employee list (all can log in with Password@123)

| Employee ID | Name             | Department        | Designation            | Status   | Email                          | Role       | Hub Location |
|-------------|------------------|-------------------|------------------------|----------|--------------------------------|------------|--------------|
| EMP001      | Matsya Singh     | Engineering       | Senior Software Eng.   | Active   | `matsya.singh@company.com`     | EMPLOYEE   | Bengaluru    |
| EMP002      | Vijay Mudgal     | Product           | Product Manager        | Active   | `vijay.mudgal@company.com`     | EMPLOYEE   | Delhi NCR    |
| EMP003      | Vikas Agarwal    | Design            | UX Designer            | Active   | `vikas.agarwal@company.com`    | EMPLOYEE   | Pune         |
| EMP004      | Rohan Sharma     | Engineering       | DevOps Engineer        | Active   | `rohan.sharma@company.com`     | EMPLOYEE   | Hyderabad    |
| EMP005      | Anjali Desai     | Engineering       | Engineering Manager    | Active   | `anjali.desai@company.com`     | MANAGER    | Bengaluru    |
| EMP006      | Rahul Verma      | Analytics         | Data Analyst           | On Leave | `rahul.verma@company.com`      | EMPLOYEE   | Pune         |
| EMP007      | Sneha Kapoor     | Product           | VP of Product          | Active   | `sneha.kapoor@company.com`     | EMPLOYEE   | Delhi NCR    |
| EMP008      | Amit Patel       | Human Resources   | HR Specialist          | Active   | `amit.patel@company.com`       | EMPLOYEE   | Hyderabad    |
| EMP009      | Priya Mehta      | Analytics         | Head of Analytics      | Active   | `priya.mehta@company.com`      | EMPLOYEE   | Bengaluru    |
| EMP010      | Rajesh Menon     | Executive         | CEO                    | Active   | `rajesh.menon@company.com`     | ADMIN      | Bengaluru    |
| EMP011      | Sunita Reddy     | Human Resources   | HR Manager             | Active   | `sunita.reddy@company.com`     | HR         | Bengaluru    |
| EMP012      | Manish Gupta     | Engineering       | Backend Engineer       | Active   | `manish.gupta@company.com`     | EMPLOYEE   | Pune         |
| EMP013      | Neha Joshi       | Marketing         | Marketing Manager      | Active   | `neha.joshi@company.com`       | EMPLOYEE   | Mumbai       |
| EMP014      | Kiran Kumar      | Engineering       | Frontend Engineer      | Active   | `kiran.kumar@company.com`      | EMPLOYEE   | Hyderabad    |
| EMP015      | Pooja Iyer       | Finance           | Finance Analyst        | Inactive | `pooja.iyer@company.com`       | EMPLOYEE   | Mumbai       |
| EMP016      | Ananya Verma     | Engineering       | Senior Software Eng.   | Active   | `ananya.verma@company.com`     | EMPLOYEE   | Bengaluru    |
| EMP017      | Rishi Saxena     | Design            | UX Designer            | Active   | `rishi.saxena@company.com`     | EMPLOYEE   | Pune         |
| EMP018      | Nandini Pillai   | Human Resources   | HR Specialist          | Active   | `nandini.pillai@company.com`   | EMPLOYEE   | Hyderabad    |

---

## Role Hierarchy & Approval Permissions

The platform enforces strict role-based access control (RBAC):

1. **EMPLOYEE (e.g. Matsya Singh — EMP001)**:
   - **Self-Service Only**: Punch attendance, view personal leave balances, apply for leaves (with medical certificates if sick/maternity), submit expense reimbursement claims with GST receipts, view own monthly payslips, view corporate holiday calendar, browse LMS courses, and raise IT helpdesk tickets.
   - **No Approval Capabilities**: An employee **never** sees the "Approvals" tab and has no authority to review, approve, or reject expense claims or leave requests of colleagues.

2. **MANAGER (e.g. Anjali Desai — EMP005)**:
   - **Team Oversight & Approvals**: Accesses the "Approvals" tab in Expense Management and Leave Management. Can inspect receipts, review medical certificates, and approve/reject claims submitted by direct reports.
   - Manages team sprint tasks, conducts 1-on-1s, and monitors team attendance.

3. **HR (e.g. Sunita Reddy — EMP011)**:
   - **People Operations**: Full access to employee master directory (View profile & payroll, Active/Inactive quick toggle, Leaver offboarding/removal, Edit corporate details), manage recruitment pipeline, 12-step onboarding checklists, corporate policies, and annual holiday notices.

4. **ADMIN / Super Admin (e.g. Rajesh Menon — EMP010)**:
   - **Executive & Global Governance**: Full organization oversight (Executive dashboard KPIs, department performance analytics, company-wide monthly payroll runs, system security, role permissions, and access revocation).

---

## How to reset the database

```bash
# from backend/
npm run prisma:migrate          # applies migrations
npm run prisma:seed             # wipes + reseeds authentic demo data
```
