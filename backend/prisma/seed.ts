/// <reference types="node" />
import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// ── Permissions (mirrors frontend/src/context/AuthContext.jsx ROLE_PERMISSIONS) ──

const PERMISSIONS = [
  "dashboard:read",
  "employees:read", "employees:write", "employees:delete",
  "attendance:read", "attendance:write",
  "leave:read", "leave:write", "leave:approve",
  "payroll:read", "payroll:write", "payroll:approve",
  "recruitment:read", "recruitment:write",
  "performance:read", "performance:write",
  "reports:read", "reports:export",
  "security:read", "security:write",
  "orgmanagement:read", "orgmanagement:write",
  "compliance:read", "compliance:write",
  "onboarding:read", "onboarding:write",
  "lms:read", "lms:write",
  "assets:read", "assets:write",
  "tasks:read", "tasks:write",
  "expenses:read", "expenses:write", "expenses:approve",
  "travel:read", "travel:write", "travel:approve",
  "ess:read", "ess:write",
  "policies:read", "policies:write",
  "helpdesk:read", "helpdesk:write",
  // Separation Management
  "separation:read",
  "separation:write",

  "clearance:read",
  "clearance:write",
  "clearance:approve",

  "exitinterview:read",
  "exitinterview:write",

  "settlement:read",
  "settlement:write",
  "settlement:approve",

  "alumni:read",
  "alumni:write",

  "access:revoke",
  "workflows:read", "workflows:write", "workflows:approve",
  "notifications:read",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "dashboard:read",
    "employees:read", "employees:write", "employees:delete",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read", "payroll:write", "payroll:approve",
    "recruitment:read", "recruitment:write",
    "performance:read", "performance:write",
    "reports:read", "reports:export",
    "security:read", "security:write",
    "orgmanagement:read", "orgmanagement:write",
    "compliance:read", "compliance:write",
    "onboarding:read", "lms:read", "lms:write", "assets:read", "assets:write",
    "tasks:read", "tasks:write", "expenses:read", "travel:read", "policies:read", "policies:write",
    "helpdesk:read", "helpdesk:write",
    // Separation
    "separation:read",
    "separation:write",
    "clearance:read",
    "clearance:write",
    "clearance:approve",
    "exitinterview:read",
    "exitinterview:write",
    "settlement:read",
    "settlement:write",
    "settlement:approve",
    "alumni:read",
    "alumni:write",
    "access:revoke",
    "workflows:read", "workflows:write", "workflows:approve", "notifications:read",
  ],
  HR: [
    "dashboard:read",
    "employees:read", "employees:write",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read",
    "recruitment:read", "recruitment:write",
    "onboarding:read", "onboarding:write",
    "performance:read",
    "reports:read", "reports:export",
    "compliance:read", "compliance:write",
    "policies:read", "policies:write",
    "helpdesk:read", "helpdesk:write",
    "tasks:read", "tasks:write",
    // Separation
    "separation:read",
    "separation:write",
    "clearance:read",
    "clearance:write",
    "clearance:approve",
    "exitinterview:read",
    "exitinterview:write",
    "settlement:read",
    "settlement:write",
    "settlement:approve",
    "alumni:read",
    "alumni:write",
    "access:revoke",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "workflows:read", "workflows:write", "workflows:approve",
    "notifications:read",
  ],
  MANAGER: [
    "dashboard:read",
    "employees:read",
    "attendance:read",
    "leave:read", "leave:approve",
    "payroll:read",
    "performance:read", "performance:write",
    "tasks:read", "tasks:write",
    "reports:read",
    "expenses:read", "expenses:approve",
    "travel:read", "travel:approve",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "separation:read",
    "separation:write",

    "clearance:read",
    "clearance:write",

    "exitinterview:read",
    "exitinterview:write",

    "settlement:read",
    "settlement:write",

    "alumni:read",
    "alumni:write",
    "workflows:read", "workflows:approve",
    "notifications:read",
  ],
  EMPLOYEE: [
    "dashboard:read",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write",
    "payroll:read",
    "ess:read", "ess:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "performance:read", "performance:write",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write",
    "travel:read", "travel:write",
    "separation:read",
    "separation:write",

    "clearance:read",

    "exitinterview:read",
    "exitinterview:write",

    "settlement:read",

    "alumni:read",

    "workflows:read", "workflows:approve",
    "notifications:read",
  ],
};

// ── Organization master data (mirrors mock/employees.js) ──

const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Analytics",
  "Human Resources", "Finance", "Marketing", "Executive",
];

const LOCATIONS = [
  { name: "New York", address: "200 Fifth Avenue, New York, NY" },
  { name: "Delhi", address: "DLF Cyber City, Gurugram, Haryana" },
  { name: "Austin", address: "400 Congress Ave, Austin, TX" },
  { name: "Seattle", address: "1200 4th Ave, Seattle, WA" },
  { name: "Chicago", address: "230 S LaSalle St, Chicago, IL" },
  { name: "Boston", address: "1 Federal St, Boston, MA" },
  { name: "Miami", address: "600 Brickell Ave, Miami, FL" },
  { name: "London", address: "1 Canada Square, Canary Wharf, London" },
  { name: "Remote", address: null },
];

const DESIGNATIONS = [
  "Senior Software Engineer", "Product Manager", "UX Designer", "DevOps Engineer",
  "Engineering Manager", "Data Analyst", "VP of Product", "HR Specialist",
  "Head of Analytics", "CEO", "HR Manager", "Backend Engineer",
  "Marketing Manager", "Frontend Engineer", "Finance Analyst",
];

interface EmployeeSeed {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  joinDate: string;
  salary: number;
  managerId: string | null;
  gender: string;
  dob: string;
  role: string;
  isDepartmentHead: boolean;
}

const EMPLOYEES: EmployeeSeed[] = [
  { code: "EMP001", firstName: "Matsya", lastName: "Singh", email: "matsya.singh@company.com", phone: "+1-555-0101", designation: "Senior Software Engineer", department: "Engineering", location: "New York", employmentType: "Full-Time", status: "Active", joinDate: "2021-03-15", salary: 95000, managerId: "EMP005", gender: "Female", dob: "1990-07-22", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP002", firstName: "Vijay", lastName: "Mudgal", email: "vijay.mudgal@company.com", phone: "+91-921-3217-008", designation: "Product Manager", department: "Product", location: "Delhi", employmentType: "Full-Time", status: "Active", joinDate: "2020-08-01", salary: 110000, managerId: "EMP007", gender: "Male", dob: "1988-02-14", role: "EMPLOYEE", isDepartmentHead: true },
  { code: "EMP003", firstName: "Vikas", lastName: "Agarwal", email: "vikas.agarwal@company.com", phone: "+1-555-0103", designation: "UX Designer", department: "Design", location: "Austin", employmentType: "Full-Time", status: "Active", joinDate: "2022-01-10", salary: 85000, managerId: "EMP002", gender: "Male", dob: "1993-11-30", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP004", firstName: "Rohan", lastName: "Sharma", email: "rohan.sharma@company.com", phone: "+1-555-0104", designation: "DevOps Engineer", department: "Engineering", location: "Seattle", employmentType: "Full-Time", status: "Active", joinDate: "2019-11-05", salary: 105000, managerId: "EMP005", gender: "Male", dob: "1987-05-18", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP005", firstName: "Anjali", lastName: "Desai", email: "anjali.desai@company.com", phone: "+1-555-0105", designation: "Engineering Manager", department: "Engineering", location: "New York", employmentType: "Full-Time", status: "Active", joinDate: "2018-06-20", salary: 135000, managerId: "EMP010", gender: "Female", dob: "1985-03-07", role: "MANAGER", isDepartmentHead: true },
  { code: "EMP006", firstName: "Rahul", lastName: "Verma", email: "rahul.verma@company.com", phone: "+1-555-0106", designation: "Data Analyst", department: "Analytics", location: "Chicago", employmentType: "Full-Time", status: "On Leave", joinDate: "2021-09-14", salary: 78000, managerId: "EMP009", gender: "Male", dob: "1991-08-25", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP007", firstName: "Sneha", lastName: "Kapoor", email: "sneha.kapoor@company.com", phone: "+1-555-0107", designation: "VP of Product", department: "Product", location: "Delhi", employmentType: "Full-Time", status: "Active", joinDate: "2017-04-01", salary: 160000, managerId: "EMP010", gender: "Female", dob: "1983-12-01", role: "EMPLOYEE", isDepartmentHead: true },
  { code: "EMP008", firstName: "Amit", lastName: "Patel", email: "amit.patel@company.com", phone: "+1-555-0108", designation: "HR Specialist", department: "Human Resources", location: "New York", employmentType: "Full-Time", status: "Active", joinDate: "2022-06-01", salary: 70000, managerId: "EMP011", gender: "Male", dob: "1994-09-12", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP009", firstName: "Priya", lastName: "Mehta", email: "priya.mehta@company.com", phone: "+1-555-0109", designation: "Head of Analytics", department: "Analytics", location: "Boston", employmentType: "Full-Time", status: "Active", joinDate: "2019-07-22", salary: 125000, managerId: "EMP010", gender: "Female", dob: "1986-04-18", role: "EMPLOYEE", isDepartmentHead: true },
  { code: "EMP010", firstName: "Robert", lastName: "King", email: "robert.king@company.com", phone: "+1-555-0110", designation: "CEO", department: "Executive", location: "New York", employmentType: "Full-Time", status: "Active", joinDate: "2015-01-01", salary: 300000, managerId: null, gender: "Male", dob: "1975-10-05", role: "ADMIN", isDepartmentHead: false },
  { code: "EMP011", firstName: "Sunita", lastName: "Reddy", email: "sunita.reddy@company.com", phone: "+1-555-0111", designation: "HR Manager", department: "Human Resources", location: "New York", employmentType: "Full-Time", status: "Active", joinDate: "2018-03-12", salary: 95000, managerId: "EMP010", gender: "Female", dob: "1984-06-28", role: "HR", isDepartmentHead: true },
  { code: "EMP012", firstName: "Manish", lastName: "Gupta", email: "manish.gupta@company.com", phone: "+1-555-0112", designation: "Backend Engineer", department: "Engineering", location: "Remote", employmentType: "Full-Time", status: "Active", joinDate: "2023-02-06", salary: 88000, managerId: "EMP005", gender: "Male", dob: "1995-01-14", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP013", firstName: "Neha", lastName: "Joshi", email: "neha.joshi@company.com", phone: "+1-555-0113", designation: "Marketing Manager", department: "Marketing", location: "Miami", employmentType: "Full-Time", status: "Active", joinDate: "2020-11-15", salary: 92000, managerId: "EMP010", gender: "Female", dob: "1989-07-03", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP014", firstName: "Kiran", lastName: "Kumar", email: "kiran.kumar@company.com", phone: "+1-555-0114", designation: "Frontend Engineer", department: "Engineering", location: "Remote", employmentType: "Contract", status: "Active", joinDate: "2023-07-01", salary: 75000, managerId: "EMP005", gender: "Male", dob: "1996-03-22", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP015", firstName: "Pooja", lastName: "Iyer", email: "pooja.iyer@company.com", phone: "+1-555-0115", designation: "Finance Analyst", department: "Finance", location: "London", employmentType: "Full-Time", status: "Inactive", joinDate: "2021-04-19", salary: 80000, managerId: "EMP010", gender: "Female", dob: "1992-11-08", role: "EMPLOYEE", isDepartmentHead: false },
];

const LEAVE_TYPES = [
  { code: "LT01", name: "Earned Leave", maxDays: 18, carryForward: true },
  { code: "LT02", name: "Sick Leave", maxDays: 12, carryForward: false },
  { code: "LT03", name: "Casual Leave", maxDays: 6, carryForward: false },
  { code: "LT04", name: "Compensatory Off", maxDays: 10, carryForward: false },
  { code: "LT05", name: "Maternity Leave", maxDays: 180, carryForward: false },
  { code: "LT06", name: "Paternity Leave", maxDays: 15, carryForward: false },
];

async function main() {
  console.log("🌱 Seeding database…");

  // Wipe in FK-safe order
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workflowEvent.deleteMany();
  await prisma.workflowInstanceStep.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.workflowDefinitionStep.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.performanceReviewItem.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.performanceKeyResult.deleteMany();
  await prisma.performanceGoal.deleteMany();
  await prisma.performanceFeedback.deleteMany();
  await prisma.performanceOneOnOneAgenda.deleteMany();
  await prisma.performanceOneOnOneAction.deleteMany();
  await prisma.performanceOneOnOne.deleteMany();
  await prisma.performanceRatingHistory.deleteMany();
  await prisma.performanceReviewCycle.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.attendancePunch.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.attendanceShift.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.location.deleteMany();
  await prisma.department.deleteMany();
  await prisma.businessUnit.deleteMany();
  await prisma.company.deleteMany();

  // Company
  const company = await prisma.company.create({
    data: { name: "Proteccio Technologies Pvt. Ltd.", registrationNumber: "U72900TG2023PTC123456", country: "India", currency: "INR" },
  });

  // Business Unit
  const bu = await prisma.businessUnit.create({
    data: { companyId: company.id, name: "Core Business" },
  });

  // Departments / Locations / Designations
  const deptByName = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const d = await prisma.department.create({ data: { companyId: company.id, businessUnitId: bu.id, name } });
    deptByName.set(name, d.id);
  }

  const locByName = new Map<string, string>();
  for (const l of LOCATIONS) {
    const loc = await prisma.location.create({ data: { companyId: company.id, name: l.name, address: l.address } });
    locByName.set(l.name, loc.id);
  }

  const desigByTitle = new Map<string, string>();
  for (const title of DESIGNATIONS) {
    const d = await prisma.designation.create({ data: { title, grade: title === "CEO" ? "L1" : "L2" } });
    desigByTitle.set(title, d.id);
  }

  // Roles + Permissions
  const roles: Record<string, string> = {};
  for (const name of ["ADMIN", "HR", "MANAGER", "EMPLOYEE"]) {
    const role = await prisma.role.create({ data: { name, description: `${name} role` } });
    roles[name] = role.id;
  }

  const permByCode = new Map<string, string>();
  for (const code of PERMISSIONS) {
    const p = await prisma.permission.create({ data: { code, description: code } });
    permByCode.set(code, p.id);
  }

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of perms) {
      const permId = permByCode.get(code);
      if (permId) {
        await prisma.rolePermission.create({ data: { roleId: roles[roleName], permissionId: permId } });
      }
    }
  }

  // Leave types
  const leaveTypeByCode = new Map<string, string>();
  for (const lt of LEAVE_TYPES) {
    const t = await prisma.leaveType.create({
      data: { name: lt.name, code: lt.code, defaultAnnualDays: lt.maxDays, carryForward: lt.carryForward },
    });
    leaveTypeByCode.set(lt.code, t.id);
  }

  // Attendance shift
  const shift = await prisma.attendanceShift.create({
    data: { name: "General Shift", startTime: new Date("1970-01-01T09:00:00"), endTime: new Date("1970-01-01T18:00:00") },
  });
  void shift;

  // Users + Employees
  const empByCode = new Map<string, string>(); // code -> employee PK
  const passwordHash = await hashPassword("Password@123");

  for (const e of EMPLOYEES) {
    const user = await prisma.user.create({
      data: { email: e.email.toLowerCase(), passwordHash, roleId: roles[e.role] },
    });
    const emp = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: e.code,
        firstName: e.firstName,
        lastName: e.lastName,
        dateOfBirth: new Date(`${e.dob}T00:00:00Z`),
        gender: e.gender,
        personalEmail: e.email.toLowerCase(),
        personalMobile: e.phone,
        address: `${e.location}, ${e.department}`,
        departmentId: deptByName.get(e.department),
        designationId: desigByTitle.get(e.designation),
        locationId: locByName.get(e.location),
        dateOfJoining: new Date(`${e.joinDate}T00:00:00Z`),
        employmentType: e.employmentType,
        status: e.status,
        isDepartmentHead: e.isDepartmentHead,
      },
    });
    empByCode.set(e.code, emp.id);
  }

  // Assign managers (self-referencing FK)
  for (const e of EMPLOYEES) {
    if (e.managerId) {
      const managerId = empByCode.get(e.managerId);
      if (managerId) {
        await prisma.employee.update({
          where: { id: empByCode.get(e.code)! },
          data: { reportingManagerId: managerId },
        });
      }
    }
  }

  // Salary structures (per employee, monthly components derived from annual salary)
  const empPKByCode = empByCode;
  for (const e of EMPLOYEES) {
    const monthly = e.salary / 12;
    const basic = Math.round((monthly * 0.5) / 10) * 10;
    const hra = Math.round((monthly * 0.2) / 10) * 10;
    const conveyance = 400;
    const medical = 250;
    const other = Math.max(0, Math.round((monthly - basic - hra - conveyance - medical) / 10) * 10);
    await prisma.salaryStructure.create({
      data: {
        employeeId: empPKByCode.get(e.code)!,
        effectiveFrom: new Date("2026-01-01T00:00:00Z"),
        basicSalary: basic,
        hra,
        conveyanceAllowance: conveyance,
        medicalAllowance: medical,
        performanceBonus: 0,
        otherAllowances: other,
        providentFund: Math.round((basic * 0.12) / 10) * 10,
        professionalTax: 200,
        incomeTax: Math.round((monthly * 0.05) / 10) * 10,
        healthInsurance: 180,
      },
    });
  }

  // Leave balances (2026) — mirror mock/leave.js for EMP001, defaults for the rest
  const year = 2026;
  const mockBalances: Record<string, Record<string, { total: number; used: number }>> = {
    EMP001: {
      LT01: { total: 18, used: 4 },
      LT02: { total: 12, used: 2 },
      LT03: { total: 6, used: 1 },
      LT04: { total: 3, used: 0 },
    },
  };
  for (const e of EMPLOYEES) {
    const balances = mockBalances[e.code] ?? { LT01: { total: 18, used: 1 }, LT02: { total: 12, used: 0 }, LT03: { total: 6, used: 0 } };
    for (const [ltCode, b] of Object.entries(balances)) {
      await prisma.leaveBalance.create({
        data: { employeeId: empPKByCode.get(e.code)!, leaveTypeId: leaveTypeByCode.get(ltCode)!, year, totalDays: b.total, usedDays: b.used },
      });
    }
  }

  // Leave requests (mirror mock/leave.js LR001–LR006)
  const requests = [
    { id: "LR001", emp: "EMP001", type: "LT01", start: "2026-07-28", end: "2026-07-30", reason: "Personal vacation", status: "Pending", approver: "EMP005", applied: "2026-07-20", approvedOn: null, comments: "" },
    { id: "LR002", emp: "EMP001", type: "LT02", start: "2026-06-10", end: "2026-06-11", reason: "Fever", status: "Approved", approver: "EMP005", applied: "2026-06-10", approvedOn: "2026-06-10", comments: "Approved. Get well soon." },
    { id: "LR003", emp: "EMP001", type: "LT03", start: "2026-05-04", end: "2026-05-04", reason: "Personal work", status: "Approved", approver: "EMP005", applied: "2026-05-01", approvedOn: "2026-05-01", comments: "" },
    { id: "LR004", emp: "EMP002", type: "LT01", start: "2026-07-27", end: "2026-07-27", reason: "Family event", status: "Pending", approver: "EMP007", applied: "2026-07-19", approvedOn: null, comments: "" },
    { id: "LR005", emp: "EMP006", type: "LT02", start: "2026-07-14", end: "2026-07-21", reason: "Surgery recovery", status: "Approved", approver: "EMP009", applied: "2026-07-12", approvedOn: "2026-07-12", comments: "Approved. Please share medical certificate on return." },
    { id: "LR006", emp: "EMP003", type: "LT01", start: "2026-07-22", end: "2026-07-23", reason: "Travel", status: "Rejected", approver: "EMP002", applied: "2026-07-18", approvedOn: "2026-07-19", comments: "Sprint deadline. Please reschedule." },
  ];
  for (const r of requests) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: empPKByCode.get(r.emp)!,
        leaveTypeId: leaveTypeByCode.get(r.type)!,
        startDate: new Date(`${r.start}T00:00:00Z`),
        endDate: new Date(`${r.end}T00:00:00Z`),
        reason: r.reason,
        status: r.status,
        approvedBy: r.approver ? empPKByCode.get(r.approver) ?? null : null,
        approvedOn: r.approvedOn ? new Date(`${r.approvedOn}T00:00:00Z`) : null,
        comments: r.comments,
        createdAt: new Date(`${r.applied}T00:00:00Z`),
      },
    });
  }

  // Attendance (mirror mock/attendance.js 17 records for EMP001, July 2026)
  const mockAttendance = [
    ["2026-07-01", "09:02", "18:05", "Present"], ["2026-07-02", "09:45", "18:10", "Late"],
    ["2026-07-03", null, null, "WFH"], ["2026-07-04", null, null, "Holiday"],
    ["2026-07-05", "08:55", "17:50", "Present"], ["2026-07-06", null, null, "Weekend"],
    ["2026-07-07", null, null, "Weekend"], ["2026-07-08", "09:10", "18:00", "Present"],
    ["2026-07-09", null, null, "Absent"], ["2026-07-10", "09:00", "17:55", "Present"],
    ["2026-07-11", "09:05", "18:10", "Present"], ["2026-07-14", "10:15", "18:30", "Late"],
    ["2026-07-15", null, null, "WFH"], ["2026-07-16", "09:00", "18:00", "Present"],
    ["2026-07-17", "09:02", "17:45", "Present"], ["2026-07-18", "08:50", "18:05", "Present"],
    ["2026-07-21", "09:30", "18:00", "Late"],
  ];
  const emp001 = empPKByCode.get("EMP001")!;
  for (const [date, checkIn, checkOut, status] of mockAttendance) {
    const punchIn = checkIn ? new Date(`${date}T${checkIn}:00Z`) : null;
    const punchOut = checkOut ? new Date(`${date}T${checkOut}:00Z`) : null;
    await prisma.attendancePunch.create({
      data: { employeeId: emp001, punchDate: new Date(`${date}T00:00:00Z`), punchIn, punchOut, status: status ?? "Present", method: "Web" },
    });
  }

  // Payroll runs + payslips (mirror mock/payroll.js)
  const runSpecs = [
    { month: 7, year: 2026, status: "Draft", processedOn: null, approvedBy: null, employees: 15 },
    { month: 6, year: 2026, status: "Paid", processedOn: "2026-06-28", approvedBy: "EMP011", employees: 15 },
    { month: 5, year: 2026, status: "Paid", processedOn: "2026-05-30", approvedBy: "EMP011", employees: 15 },
  ];

  const runByKey = new Map<string, { id: string; month: number; year: number }>();
  for (const spec of runSpecs) {
    const run = await prisma.payrollRun.create({
      data: {
        period: `${spec.month}/${spec.year}`,
        month: spec.month,
        year: spec.year,
        status: spec.status,
        processedOn: spec.processedOn ? new Date(`${spec.processedOn}T00:00:00Z`) : null,
        approvedBy: spec.approvedBy ? empPKByCode.get(spec.approvedBy) ?? null : null,
        totalEmployees: spec.employees,
        grossPayroll: 4250000,
        totalDeductions: 680000,
        netPayroll: 3570000,
      },
    });
    runByKey.set(`${spec.month}-${spec.year}`, run);
  }

  // Payslips for EMP001 for June & May 2026 (mock shapes)
  const mockPayslips = [
    {
      runKey: "6-2026", period: "June 2026",
      earnings: { basicSalary: 5750, hra: 2300, conveyanceAllowance: 400, medicalAllowance: 250, performanceBonus: 500, otherAllowances: 200, total: 9400 },
      deductions: { providentFund: 690, professionalTax: 200, incomeTax: 1200, healthInsurance: 180, total: 2270 },
      netPay: 7130, status: "Paid", paidOn: "2026-06-28",
    },
    {
      runKey: "5-2026", period: "May 2026",
      earnings: { basicSalary: 5750, hra: 2300, conveyanceAllowance: 400, medicalAllowance: 250, performanceBonus: 0, otherAllowances: 200, total: 8900 },
      deductions: { providentFund: 690, professionalTax: 200, incomeTax: 1100, healthInsurance: 180, total: 2170 },
      netPay: 6730, status: "Paid", paidOn: "2026-05-30",
    },
  ];
  const emp001Structure = await prisma.salaryStructure.findFirst({ where: { employeeId: emp001 } });
  for (const slip of mockPayslips) {
    const run = runByKey.get(slip.runKey);
    if (!run) continue;
    await prisma.payslip.create({
      data: {
        payrollRunId: run.id,
        employeeId: emp001,
        salaryStructureId: emp001Structure!.id,
        period: slip.period,
        earnings: slip.earnings as unknown as Prisma.InputJsonValue,
        deductions: slip.deductions as unknown as Prisma.InputJsonValue,
        netPay: slip.netPay,
        status: slip.status,
        paidOn: new Date(`${slip.paidOn}T00:00:00Z`),
      },
    });
  }

  // Workflow Engine definitions (mirror mock/workflowEngine.js)
  const workflowDefs = [
    {
      requestType: "Leave Request — Extended",
      steps: [
        { name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24, parallelGroup: null, condition: null },
        { name: "Second-Level Approval", approverRule: "Department Head", slaHours: 24, parallelGroup: null, condition: { field: "duration_days", operator: ">", value: 5 } },
      ],
    },
    {
      requestType: "Job Requisition",
      steps: [
        { name: "Hiring Manager Sign-off", approverRule: "Direct Reporting Manager", slaHours: 48, parallelGroup: "A", condition: null },
        { name: "Finance Sign-off", approverRule: "Named Role: Finance", slaHours: 48, parallelGroup: "A", condition: null },
      ],
    },
    {
      requestType: "Salary Change",
      steps: [
        { name: "Manager Approval", approverRule: "Direct Reporting Manager", slaHours: 24, parallelGroup: null, condition: null },
        { name: "Finance Approval (over band only)", approverRule: "Named Role: Finance", slaHours: 24, parallelGroup: null, condition: { field: "amount", operator: ">", value: 2000000 } },
      ],
    },
  ];
  for (const [i, def] of workflowDefs.entries()) {
    await prisma.workflowDefinition.create({
      data: {
        requestType: def.requestType,
        status: "Active",
        createdAt: new Date(`2026-0${i + 1}-${i === 0 ? "10" : i === 1 ? "01" : "15"}T00:00:00Z`),
        steps: {
          create: def.steps.map((s, idx) => ({
            name: s.name,
            approverRule: s.approverRule,
            slaHours: s.slaHours,
            parallelGroup: s.parallelGroup,
            condition: s.condition ? (s.condition as Prisma.InputJsonValue) : undefined,
            orderIndex: idx,
          })),
        },
      },
    });
  }

  // Performance Management seed data (Module 10)
  const q3Cycle = await prisma.performanceReviewCycle.create({
    data: {
      name: "Q3 2026 Performance Review",
      cycleCode: "Q3-2026",
      phase: "Goal Setting",
      goalSettingStart: new Date("2026-07-01T00:00:00Z"),
      goalSettingEnd: new Date("2026-07-10T00:00:00Z"),
      selfAssessmentStart: new Date("2026-09-15T00:00:00Z"),
      selfAssessmentEnd: new Date("2026-09-22T00:00:00Z"),
      managerReviewStart: new Date("2026-09-23T00:00:00Z"),
      managerReviewEnd: new Date("2026-09-30T00:00:00Z"),
      is360Enabled: true,
      isActive: true,
    },
  });

  const emp004 = empPKByCode.get("EMP004")!;
  const emp005 = empPKByCode.get("EMP005")!;

  const g1 = await prisma.performanceGoal.create({
    data: {
      employeeId: emp001,
      reviewCycleId: q3Cycle.id,
      title: "Improve API response times across core services",
      category: "Technical",
      status: "Locked",
      createdAt: new Date("2026-07-02T00:00:00Z"),
      keyResults: {
        create: [
          { text: "Reduce p95 latency on /employees endpoint to <200ms", progress: 70 },
          { text: "Add caching layer for payroll queries", progress: 40 },
        ],
      },
    },
  });

  const g2 = await prisma.performanceGoal.create({
    data: {
      employeeId: emp001,
      reviewCycleId: q3Cycle.id,
      title: "Mentor two junior engineers",
      category: "Leadership",
      status: "Locked",
      createdAt: new Date("2026-07-02T00:00:00Z"),
      keyResults: {
        create: [
          { text: "Weekly 1:1s with 2 mentees", progress: 85 },
          { text: "Pair on at least 4 features together", progress: 50 },
        ],
      },
    },
  });

  await prisma.performanceGoal.create({
    data: {
      employeeId: emp001,
      reviewCycleId: q3Cycle.id,
      title: "Own the migration to the new deployment pipeline",
      category: "Technical",
      status: "Pending Approval",
      createdAt: new Date("2026-07-20T00:00:00Z"),
      keyResults: {
        create: [
          { text: "Draft migration plan and get manager sign-off", progress: 100 },
          { text: "Migrate 3 services to the new pipeline", progress: 20 },
        ],
      },
    },
  });

  // Self-assessment for EMP001
  const selfRev = await prisma.performanceReview.create({
    data: {
      employeeId: emp001,
      reviewerId: emp001,
      reviewCycleId: q3Cycle.id,
      reviewType: "Self",
      status: "Submitted",
      submittedAt: new Date("2026-09-20T00:00:00Z"),
      items: {
        create: [
          { goalId: g1.id, rating: 4, comments: "Made strong progress on latency work; caching layer is in progress and on track." },
          { goalId: g2.id, rating: 5, comments: "Both mentees shipped their first independent features this quarter." },
        ],
      },
    },
  });

  // Feedback for EMP001
  await prisma.performanceFeedback.createMany({
    data: [
      {
        fromEmployeeId: emp005,
        toEmployeeId: emp001,
        type: "Praise",
        goalTag: "Improve API response times across core services",
        message: "Great debugging work isolating the payroll query bottleneck — saved the team real time this sprint.",
        isPrivate: false,
        createdAt: new Date("2026-07-18T00:00:00Z"),
      },
      {
        fromEmployeeId: emp004,
        toEmployeeId: emp001,
        type: "Constructive",
        goalTag: null,
        message: "Would help to get PR descriptions a bit more detailed for the deployment pipeline changes.",
        isPrivate: false,
        createdAt: new Date("2026-07-22T00:00:00Z"),
      },
      {
        fromEmployeeId: emp001,
        toEmployeeId: emp005,
        type: "General",
        goalTag: null,
        message: "Thanks for the quick unblock on staging environment access yesterday.",
        isPrivate: false,
        createdAt: new Date("2026-07-25T00:00:00Z"),
      },
    ],
  });

  // 1-on-1 notes for EMP001
  await prisma.performanceOneOnOne.create({
    data: {
      employeeId: emp001,
      managerId: emp005,
      date: new Date("2026-07-15T00:00:00Z"),
      notes: "Discussed the deployment migration timeline and agreed to prioritize service A and B first.",
      agendas: {
        create: [
          { itemText: "Migration plan review", orderIndex: 0 },
          { itemText: "Career growth check-in", orderIndex: 1 },
        ],
      },
      actionItems: {
        create: [
          { text: "Share migration doc with platform team", done: true },
          { text: "Look into staff-engineer track requirements", done: false },
        ],
      },
    },
  });

  await prisma.performanceOneOnOne.create({
    data: {
      employeeId: emp001,
      managerId: emp005,
      date: new Date("2026-07-01T00:00:00Z"),
      notes: "Set final Q3 goals; agreed on mentoring two junior engineers this quarter.",
      agendas: {
        create: [
          { itemText: "Q3 goal setting", orderIndex: 0 },
          { itemText: "Mentee pairing", orderIndex: 1 },
        ],
      },
      actionItems: {
        create: [
          { text: "Finalize Q3 OKRs", done: true },
        ],
      },
    },
  });

  // Ratings History
  await prisma.performanceRatingHistory.createMany({
    data: [
      {
        employeeId: emp001,
        reviewCycleId: q3Cycle.id,
        cycleName: "Q1 2026",
        selfRating: 4,
        originalManagerRating: 4,
        finalRating: 4,
        calibrationAdjusted: false,
        increment: "8%",
        promotion: false,
        appraisalLetterUrl: "#",
        releasedOn: new Date("2026-04-15T00:00:00Z"),
      },
      {
        employeeId: emp001,
        reviewCycleId: q3Cycle.id,
        cycleName: "Q4 2025",
        selfRating: 5,
        originalManagerRating: 3,
        finalRating: 4,
        calibrationAdjusted: true,
        increment: "6%",
        promotion: false,
        appraisalLetterUrl: "#",
        releasedOn: new Date("2026-01-15T00:00:00Z"),
      },
    ],
  });

  console.log("✅ Seed complete.");
  console.log("🔑 Login credentials (all): email from list below / Password@123");
  console.log("   ADMIN  → robert.king@company.com (Robert King, CEO)");
  console.log("   HR     → sunita.reddy@company.com (Sunita Reddy, HR Manager)");
  console.log("   MANAGER→ anjali.desai@company.com (Anjali Desai, Engineering Manager)");
  console.log("   EMP    → matsya.singh@company.com (Matsya Singh, Senior Software Engineer)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
