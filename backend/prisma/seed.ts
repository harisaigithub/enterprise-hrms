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
    "onboarding:read", "onboarding:write",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "ess:read", "ess:write",
    "policies:read", "policies:write",
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

    "workflows:read", "workflows:write", "workflows:approve",
    "notifications:read",
  ],
  HR: [
    "dashboard:read",
    "employees:read", "employees:write",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read", "payroll:write", "payroll:approve",
    "recruitment:read", "recruitment:write",
    "onboarding:read", "onboarding:write",
    "performance:read", "performance:write",
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

    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "ess:read", "ess:write",

    "workflows:read", "workflows:write", "workflows:approve",
    "notifications:read",
],
  MANAGER: [
    "dashboard:read",
    "employees:read",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read",
    "performance:read", "performance:write",
    "tasks:read", "tasks:write",
    "reports:read",
    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "recruitment:read",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "ess:read", "ess:write",
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
  { code: "EMP016", firstName: "Ananya", lastName: "Verma", email: "ananya.verma@company.com", phone: "+91-981-0021-991", designation: "Senior Software Engineer", department: "Engineering", location: "Delhi", employmentType: "Full-Time", status: "Active", joinDate: "2026-08-01", salary: 98000, managerId: "EMP005", gender: "Female", dob: "1994-04-12", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP017", firstName: "Rishi", lastName: "Saxena", email: "rishi.saxena@company.com", phone: "+91-981-0022-882", designation: "UX Designer", department: "Design", location: "Delhi", employmentType: "Full-Time", status: "Active", joinDate: "2026-08-15", salary: 86000, managerId: "EMP002", gender: "Male", dob: "1995-09-25", role: "EMPLOYEE", isDepartmentHead: false },
  { code: "EMP018", firstName: "Nandini", lastName: "Pillai", email: "nandini.pillai@company.com", phone: "+91-981-0023-773", designation: "HR Specialist", department: "Human Resources", location: "Delhi", employmentType: "Full-Time", status: "Active", joinDate: "2026-09-01", salary: 72000, managerId: "EMP011", gender: "Female", dob: "1996-01-18", role: "EMPLOYEE", isDepartmentHead: false },
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
  await prisma.onboardingChecklistItem.deleteMany();
  await prisma.onboarding.deleteMany();
  await prisma.candidateDocument.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.interviewScorecard.deleteMany();
  await prisma.interviewPanel.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobRequisition.deleteMany();
  await prisma.courseCertificate.deleteMany();
  await prisma.courseContentProgress.deleteMany();
  await prisma.courseQuizAttemptAnswer.deleteMany();
  await prisma.courseQuizAttempt.deleteMany();
  await prisma.courseQuizOption.deleteMany();
  await prisma.courseQuizQuestion.deleteMany();
  await prisma.courseContent.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.policyAcknowledgement.deleteMany();
  await prisma.policyVersion.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.helpdeskComment.deleteMany();
  await prisma.helpdeskTicket.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.assetRequest.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.taskTimeEntry.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.taskHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskMilestone.deleteMany();
  await prisma.taskProjectMember.deleteMany();
  await prisma.taskProject.deleteMany();
  await prisma.separationSettlement.deleteMany();
  await prisma.separationClearance.deleteMany();
  await prisma.exitInterview.deleteMany();
  await prisma.alumni.deleteMany();
  await prisma.separation.deleteMany();
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

  // ── 1. Job Requisitions (Module 5) ──────────────────────────────────────────
  console.log("📋 Seeding Job Requisitions…");
  const deptEng = deptByName.get("Engineering")!;
  const deptDesign = deptByName.get("Design")!;
  const deptHR = deptByName.get("Human Resources")!;
  const deptFin = deptByName.get("Finance")!;
  const deptProd = deptByName.get("Product")!;

  const locNY = locByName.get("New York")!;
  const locDelhi = locByName.get("Delhi")!;
  const locAustin = locByName.get("Austin")!;

  const desigBackend = desigByTitle.get("Backend Engineer") || desigByTitle.get("Senior Software Engineer")!;
  const desigDesigner = desigByTitle.get("UX Designer")!;
  const desigDevOps = desigByTitle.get("DevOps Engineer")!;
  const desigHR = desigByTitle.get("HR Specialist")!;
  const desigFinance = desigByTitle.get("Finance Analyst")!;

  const reqEng = await prisma.jobRequisition.create({
    data: {
      requisitionCode: "REQ-2026-001",
      title: "Senior Backend Engineer",
      departmentId: deptEng,
      designationId: desigBackend,
      locationId: locNY,
      openings: 2,
      salaryMin: 1800000,
      salaryMax: 2600000,
      grade: "L4",
      justification: "Scaling core distributed event streams and database latency reduction.",
      status: "Open",
      raisedBy: empPKByCode.get("EMP005")!,
    },
  });

  const reqDesign = await prisma.jobRequisition.create({
    data: {
      requisitionCode: "REQ-2026-002",
      title: "Lead Product Designer",
      departmentId: deptDesign,
      designationId: desigDesigner,
      locationId: locAustin,
      openings: 1,
      salaryMin: 1600000,
      salaryMax: 2200000,
      grade: "L4",
      justification: "Design systems unification and enterprise design lead.",
      status: "Open",
      raisedBy: empPKByCode.get("EMP002")!,
    },
  });

  const reqDevOps = await prisma.jobRequisition.create({
    data: {
      requisitionCode: "REQ-2026-003",
      title: "Cloud Platform Architect",
      departmentId: deptEng,
      designationId: desigDevOps,
      locationId: locDelhi,
      openings: 2,
      salaryMin: 2000000,
      salaryMax: 2800000,
      grade: "L4",
      justification: "Multi-region Kubernetes migration and SOC2 observability stack.",
      status: "Open",
      raisedBy: empPKByCode.get("EMP005")!,
    },
  });

  const reqHR = await prisma.jobRequisition.create({
    data: {
      requisitionCode: "REQ-2026-004",
      title: "Senior HR Business Partner",
      departmentId: deptHR,
      designationId: desigHR,
      locationId: locDelhi,
      openings: 1,
      salaryMin: 1400000,
      salaryMax: 2000000,
      grade: "L4",
      justification: "APAC regional employee relations and leadership coaching.",
      status: "Open",
      raisedBy: empPKByCode.get("EMP011")!,
    },
  });

  const reqFin = await prisma.jobRequisition.create({
    data: {
      requisitionCode: "REQ-2026-005",
      title: "Financial Planning Analyst",
      departmentId: deptFin,
      designationId: desigFinance,
      locationId: locNY,
      openings: 1,
      salaryMin: 1200000,
      salaryMax: 1800000,
      grade: "L3",
      justification: "Annual budget planning and cashflow forecasting.",
      status: "Open",
      raisedBy: empPKByCode.get("EMP010")!,
    },
  });

  // ── 2. Candidates & Applications across Funnel Stages ─────────────────────
  console.log("👥 Seeding Candidates across Pipeline Funnel…");

  // A. Applied (5 candidates)
  const appliedCandidatesData = [
    { code: "CAN-001", first: "Aarav", last: "Mehta", email: "aarav.mehta@example.com", phone: "+91-982-101-1001", reqId: reqEng.id, rating: 3, notes: "7 years Node & Go experience in logistics." },
    { code: "CAN-002", first: "Sneha", last: "Kapoor", email: "sneha.k.design@example.com", phone: "+1-555-020-2002", reqId: reqDesign.id, rating: 4, notes: "Strong portfolio in Figma enterprise tokens." },
    { code: "CAN-003", first: "Kunal", last: "Joshi", email: "kunal.joshi@example.com", phone: "+91-982-103-3003", reqId: reqDevOps.id, rating: 3, notes: "AWS certified solutions architect." },
    { code: "CAN-004", first: "Pooja", last: "Batra", email: "pooja.batra@example.com", phone: "+91-982-104-4004", reqId: reqHR.id, rating: 4, notes: "SHRM-SCP certified with 6 years tenure." },
    { code: "CAN-005", first: "Devendra", last: "Rao", email: "devendra.rao@example.com", phone: "+1-555-025-5005", reqId: reqFin.id, rating: 3, notes: "FP&A background in consumer tech." },
  ];
  for (const c of appliedCandidatesData) {
    const cand = await prisma.candidate.create({
      data: { candidateCode: c.code, firstName: c.first, lastName: c.last, email: c.email, phone: c.phone, resumeSummary: c.notes },
    });
    await prisma.application.create({
      data: { candidateId: cand.id, requisitionId: c.reqId, stage: "Applied", rating: c.rating, notes: c.notes, approvalStatus: "HR Review" },
    });
  }

  // B. Screening (4 candidates)
  const screeningCandidatesData = [
    { code: "CAN-006", first: "Rahul", last: "Verma", email: "rahul.verma.dev@example.com", phone: "+91-982-106-6006", reqId: reqEng.id, rating: 4, notes: "Passed preliminary technical phone screen." },
    { code: "CAN-007", first: "Meera", last: "Swaminathan", email: "meera.swami@example.com", phone: "+91-982-107-7007", reqId: reqDesign.id, rating: 4, notes: "Reviewed design challenge; great typography." },
    { code: "CAN-008", first: "Gaurav", last: "Sen", email: "gaurav.sen@example.com", phone: "+91-982-108-8008", reqId: reqDevOps.id, rating: 3, notes: "Terraform automation background." },
    { code: "CAN-009", first: "Simran", last: "Kaur", email: "simran.kaur.fin@example.com", phone: "+1-555-029-9009", reqId: reqFin.id, rating: 4, notes: "Cleared financial modeling assessment." },
  ];
  for (const c of screeningCandidatesData) {
    const cand = await prisma.candidate.create({
      data: { candidateCode: c.code, firstName: c.first, lastName: c.last, email: c.email, phone: c.phone, resumeSummary: c.notes },
    });
    await prisma.application.create({
      data: { candidateId: cand.id, requisitionId: c.reqId, stage: "Screening", rating: c.rating, notes: c.notes, approvalStatus: "HR Review" },
    });
  }

  // C. Interview (3 candidates with scheduled interviews & scorecards)
  const interviewCandidatesData = [
    { code: "CAN-010", first: "Aditya", last: "Iyer", email: "aditya.iyer@example.com", phone: "+91-982-110-1010", reqId: reqEng.id, rating: 5, notes: "Exceptional systems design knowledge.", interviewer: emp005 },
    { code: "CAN-011", first: "Tanvi", last: "Shah", email: "tanvi.shah@example.com", phone: "+91-982-111-1011", reqId: reqDesign.id, rating: 4, notes: "Strong design leadership experience.", interviewer: empPKByCode.get("EMP002")! },
    { code: "CAN-012", first: "Harsh", last: "Vardhan", email: "harsh.vardhan@example.com", phone: "+91-982-112-1012", reqId: reqDevOps.id, rating: 4, notes: "Excellent Kubernetes cluster recovery answers.", interviewer: emp004 },
  ];
  for (const c of interviewCandidatesData) {
    const cand = await prisma.candidate.create({
      data: { candidateCode: c.code, firstName: c.first, lastName: c.last, email: c.email, phone: c.phone, resumeSummary: c.notes },
    });
    const app = await prisma.application.create({
      data: { candidateId: cand.id, requisitionId: c.reqId, stage: "Interview", rating: c.rating, notes: c.notes, approvalStatus: "Interview Scheduled" },
    });
    const iv = await prisma.interview.create({
      data: { applicationId: app.id, round: "Technical Round 2", scheduledAt: new Date("2026-09-08T10:00:00Z"), status: "Completed" },
    });
    await prisma.interviewPanel.create({
      data: { interviewId: iv.id, interviewerId: c.interviewer },
    });
    await prisma.interviewScorecard.create({
      data: { interviewId: iv.id, interviewerId: c.interviewer, rating: c.rating, notes: "Strong recommendation to proceed.", submitted: true, submittedAt: new Date("2026-09-02T16:00:00Z") },
    });
  }

  // D. Offer (2 candidates)
  const offer1Cand = await prisma.candidate.create({
    data: { candidateCode: "CAN-013", firstName: "Priya", lastName: "Nair", email: "priya.nair.eng@example.com", phone: "+91-982-113-1013", resumeSummary: "Staff level engineer; offer letter extended." },
  });
  const offer1App = await prisma.application.create({
    data: { candidateId: offer1Cand.id, requisitionId: reqEng.id, stage: "Offer", rating: 5, notes: "Offer rolled out, awaiting signature.", approvalStatus: "Offer Sent" },
  });
  await prisma.offer.create({
    data: {
      applicationId: offer1App.id,
      proposedSalary: 2300000,
      status: "Sent — Awaiting Signature",
      joiningDate: new Date("2026-10-01T00:00:00Z"),
      sentAt: new Date("2026-09-01T00:00:00Z"),
      consentOnFile: true,
    },
  });

  const offer2Cand = await prisma.candidate.create({
    data: { candidateCode: "CAN-014", firstName: "Vikram", lastName: "Malhotra", email: "vikram.m.devops@example.com", phone: "+91-982-114-1014", resumeSummary: "Principal architect; offer pending budget sign-off." },
  });
  const offer2App = await prisma.application.create({
    data: { candidateId: offer2Cand.id, requisitionId: reqDevOps.id, stage: "Offer", rating: 5, notes: "Salary compensation approval pending.", approvalStatus: "Salary Approval Pending" },
  });
  await prisma.offer.create({
    data: {
      applicationId: offer2App.id,
      proposedSalary: 2500000,
      status: "Salary Approval Pending",
      joiningDate: new Date("2026-10-15T00:00:00Z"),
      sentAt: new Date("2026-09-02T00:00:00Z"),
      consentOnFile: true,
    },
  });

  // E. Hired (3 candidates transitioning directly to Onboarding!)
  const hiredData = [
    { code: "CAN-015", empCode: "EMP016", first: "Ananya", last: "Verma", email: "ananya.verma@company.com", phone: "+91-981-0021-991", reqId: reqEng.id, salary: 2400000, joinDate: "2026-08-01", buddyCode: "EMP001" },
    { code: "CAN-016", empCode: "EMP017", first: "Rishi", last: "Saxena", email: "rishi.saxena@company.com", phone: "+91-981-0022-882", reqId: reqDesign.id, salary: 2000000, joinDate: "2026-08-15", buddyCode: "EMP003" },
    { code: "CAN-017", empCode: "EMP018", first: "Nandini", last: "Pillai", email: "nandini.pillai@company.com", phone: "+91-981-0023-773", reqId: reqHR.id, salary: 1800000, joinDate: "2026-09-01", buddyCode: "EMP008" },
  ];

  console.log("🚀 Seeding Onboarding Records for Hired Joiners…");
  for (const h of hiredData) {
    const cand = await prisma.candidate.create({
      data: { candidateCode: h.code, firstName: h.first, lastName: h.last, email: h.email, phone: h.phone, resumeSummary: "Candidate hired and successfully onboarded." },
    });
    const empId = empPKByCode.get(h.empCode)!;
    const app = await prisma.application.create({
      data: { candidateId: cand.id, requisitionId: h.reqId, stage: "Hired", rating: 5, notes: "Accepted offer and joined the company.", approvalStatus: "Employee Created", employeeId: empId },
    });
    const offer = await prisma.offer.create({
      data: {
        applicationId: app.id,
        proposedSalary: h.salary,
        status: "Accepted",
        joiningDate: new Date(`${h.joinDate}T00:00:00Z`),
        decisionAt: new Date("2026-07-25T00:00:00Z"),
        consentOnFile: true,
      },
    });

    const joinDateObj = new Date(`${h.joinDate}T00:00:00Z`);
    const probationEnd = new Date(joinDateObj);
    probationEnd.setDate(probationEnd.getDate() + 90);

    const buddyName = EMPLOYEES.find((e) => e.code === h.buddyCode);
    const buddyStr = buddyName ? `${buddyName.firstName} ${buddyName.lastName}` : "Matsya Singh";

    const onb = await prisma.onboarding.create({
      data: {
        employeeId: empId,
        offerId: offer.id,
        joinDate: joinDateObj,
        probationEndDate: probationEnd,
        buddy: buddyStr,
        status: "IN_PROGRESS",
      },
    });

    const d = (offsetDays: number) => {
      const dt = new Date(joinDateObj);
      dt.setDate(dt.getDate() + offsetDays);
      return dt;
    };

    const checklistItems = [
      { title: "Upload ID & address proof", category: "Documents & Policy", owner: "Employee", dueDate: d(-3), status: "Complete" as const },
      { title: "Upload education certificates", category: "Documents & Policy", owner: "Employee", dueDate: d(-3), status: "Complete" as const },
      { title: "Verify identity documents", category: "Documents & Policy", owner: "HR", dueDate: d(-2), status: "Complete" as const },
      { title: "Accept Code of Conduct & IT Policy", category: "Documents & Policy", owner: "Employee", dueDate: d(-1), status: "Complete" as const },
      { title: "Complete remaining personal details", category: "Documents & Policy", owner: "Employee", dueDate: d(-1), status: "Complete" as const },
      { title: "Create corporate email & core accounts", category: "IT & Assets", owner: "IT", dueDate: d(-1), status: "Complete" as const, dependsOn: "identity-verify" },
      { title: "Allocate laptop", category: "IT & Assets", owner: "IT", dueDate: d(0), status: "Complete" as const },
      { title: "Allocate access card", category: "IT & Assets", owner: "IT", dueDate: d(0), status: "Complete" as const },
      { title: "Confirm laptop handover (condition ack.)", category: "IT & Assets", owner: "Employee", dueDate: d(0), status: "Pending" as const, dependsOn: "asset-laptop" },
      { title: "Attend induction session", category: "Induction & Buddy", owner: "HR", dueDate: d(1), status: "Pending" as const },
      { title: "Assign onboarding buddy", category: "Induction & Buddy", owner: "Manager", dueDate: d(-1), status: "Complete" as const },
      { title: "Schedule probation review", category: "Probation", owner: "Manager", dueDate: d(90), status: "Pending" as const },
    ];

    for (const item of checklistItems) {
      await prisma.onboardingChecklistItem.create({
        data: {
          onboardingId: onb.id,
          title: item.title,
          category: item.category,
          owner: item.owner,
          dueDate: item.dueDate,
          status: item.status,
          dependsOn: item.dependsOn || null,
        },
      });
    }
  }

  // ── 3. Learning Management System (LMS) Seed ──────────────────────────────
  console.log("📚 Seeding LMS Courses & Accurately Themed Thumbnails…");

  const lmsCourses = [
    {
      title: "Information Security & Cyber Defense (ISO 27001)",
      description: "Comprehensive training covering data classification, zero-trust access, anti-phishing defense, and enterprise incident response protocols.",
      thumbnailUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
      isCompliance: true,
      expiryMonths: 12,
      passThreshold: 80,
      modules: ["Data Classification & Handling", "Zero-Trust & Access Governance", "Phishing Defenses & Social Engineering", "Security Incident Reporting Protocols"],
      contents: [
        { title: "Module 1: Principles of Enterprise Security", type: "TEXT" as const, content: "# Enterprise Information Security\n\nAll company data is classified into Public, Internal, Confidential, and Restricted. Encryption at rest and in transit is mandatory." },
        { title: "Module 2: SOC2 & ISO 27001 Controls", type: "LINK" as const, content: "https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final" },
      ],
      questions: [
        { question: "What classification applies to customer PII and financial records?", options: [{ optionText: "Public", isCorrect: false }, { optionText: "Restricted", isCorrect: true }, { optionText: "Internal", isCorrect: false }] },
        { question: "When should an unauthorized access attempt be reported?", options: [{ optionText: "Immediately within 1 hour", isCorrect: true }, { optionText: "At month end", isCorrect: false }, { optionText: "Only if data was deleted", isCorrect: false }] },
      ],
    },
    {
      title: "Workplace POSH & Anti-Harassment Compliance",
      description: "Statutory training on the Prevention of Sexual Harassment at Workplace (POSH Act), establishing safe, inclusive, and respectful working environments.",
      thumbnailUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
      isCompliance: true,
      expiryMonths: 12,
      passThreshold: 80,
      modules: ["Understanding the POSH Statutory Framework", "Recognizing Inappropriate Behaviors", "Internal Complaints Committee (ICC) Redressal", "Bystander Intervention & Support"],
      contents: [
        { title: "Module 1: POSH Policy & Scope", type: "TEXT" as const, content: "# Workplace POSH Compliance\n\nZero tolerance for sexual harassment. The Internal Complaints Committee (ICC) ensures swift, confidential, and unbiased resolution." },
      ],
      questions: [
        { question: "What is the primary role of the Internal Complaints Committee (ICC)?", options: [{ optionText: "Conduct fair, confidential inquiries into complaints", isCorrect: true }, { optionText: "Publish public dispute lists", isCorrect: false }] },
      ],
    },
    {
      title: "Modern Full-Stack Web Architecture with React & Node",
      description: "Master modern microservice paradigms, scalable REST/GraphQL APIs, clean React architecture, state management, and PostgreSQL optimization.",
      thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
      isCompliance: false,
      expiryMonths: null,
      passThreshold: 70,
      modules: ["Design System Componentry & Micro-Frontends", "High-Performance REST & Async Queues", "Prisma ORM & PostgreSQL Optimization", "Zero-Downtime Deployment & CI/CD"],
      contents: [
        { title: "Module 1: Resilient Component Patterns", type: "TEXT" as const, content: "# Frontend Architecture\n\nEncapsulate state, enforce unidirectional data flow, and use strict TypeScript contracts with backend endpoints." },
      ],
      questions: [
        { question: "Why are database transactions critical in multi-step onboarding mutations?", options: [{ optionText: "To guarantee all records commit together atomically or roll back on error", isCorrect: true }, { optionText: "To improve CSS rendering speed", isCorrect: false }] },
      ],
    },
    {
      title: "Strategic Leadership & Engineering Management",
      description: "Proven practices for engineering leaders: running impactful 1-on-1s, fostering psychological safety, OKR alignment, and high-performance team coaching.",
      thumbnailUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
      isCompliance: false,
      expiryMonths: null,
      passThreshold: 75,
      modules: ["High-Trust 1-on-1 Coaching Frameworks", "Engineering Team OKR Cascading", "Conflict Resolution & Healthy Disagreement", "Talent Retention & Staff-Plus Career Tracks"],
      contents: [
        { title: "Module 1: 1-on-1 Frameworks", type: "TEXT" as const, content: "# Leadership Coaching\n\n1-on-1s belong to the direct report. Focus on long-term career growth, blockers, and bidirectional feedback." },
      ],
      questions: [
        { question: "What should be the primary focus of bi-weekly 1-on-1s?", options: [{ optionText: "Career growth, personal check-in, and strategic alignment", isCorrect: true }, { optionText: "A mechanical task status readout", isCorrect: false }] },
      ],
    },
    {
      title: "Ergonomics, Mental Health & Workplace Safety",
      description: "Practical guidance for hybrid and office setups, proper workstation ergonomics, avoiding repetitive strain injuries, and holistic wellness resources.",
      thumbnailUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      isCompliance: true,
      expiryMonths: 24,
      passThreshold: 70,
      modules: ["Workstation Setup: Chair, Monitor & Lumbar Support", "Repetitive Strain Prevention (RSI)", "Stress Awareness & Wellness Support", "Office Emergency Evacuation Procedures"],
      contents: [
        { title: "Module 1: Ergonomic Best Practices", type: "TEXT" as const, content: "# Posture & Health\n\nKeep eye level aligned with top third of display. Ensure 90-degree arm resting angle and take micro-breaks every 45 minutes." },
      ],
      questions: [
        { question: "What is the recommended monitor height for neutral neck posture?", options: [{ optionText: "Eye level aligned with the top third of the monitor", isCorrect: true }, { optionText: "Below desk height", isCorrect: false }] },
      ],
    },
  ];

  for (const c of lmsCourses) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        isCompliance: c.isCompliance,
        expiryMonths: c.expiryMonths,
        passThreshold: c.passThreshold,
        status: "PUBLISHED",
        contentModules: c.modules,
        contents: {
          create: c.contents.map((cnt, idx) => ({ moduleName: c.modules[idx] || c.modules[0] || "Overview", title: cnt.title, type: cnt.type, content: cnt.content, order: idx + 1 })),
        },
        questions: {
          create: c.questions.map((q, idx) => ({
            question: q.question,
            order: idx + 1,
            options: { create: q.options },
          })),
        },
      },
    });

    // Enroll key active employees
    for (const [empCode, st] of [["EMP001", "PASSED"], ["EMP002", "IN_PROGRESS"], ["EMP003", "NOT_STARTED"]] as const) {
      const eId = empPKByCode.get(empCode);
      const empInfo = EMPLOYEES.find((e) => e.code === empCode);
      const eName = empInfo ? `${empInfo.firstName} ${empInfo.lastName}` : "Matsya Singh";
      if (eId) {
        await prisma.courseEnrollment.create({
          data: {
            courseId: course.id,
            employeeId: eId,
            employeeName: eName,
            status: st,
            score: st === "PASSED" ? 90 : null,
            attempts: st === "PASSED" ? 1 : 0,
          },
        });
      }
    }
  }

  // ── 4. Policies (Module 15) ────────────────────────────────────────────────
  console.log("📜 Seeding Policies…");
  const policiesData = [
    { title: "Information Security & Acceptable Use Policy", category: "Security", scope: "company-wide", summary: "Mandates encryption, password hygiene, and VPN use on public Wi-Fi." },
    { title: "Code of Business Conduct & Ethics", category: "HR", scope: "company-wide", summary: "Sets standards for professional integrity, anti-bribery, and conflicts of interest." },
    { title: "Global Remote & Hybrid Work Policy", category: "Operations", scope: "company-wide", summary: "Guidelines for core working hours, home office stipend, and data protection outside the office." },
    { title: "Corporate Travel & Expense Policy", category: "Finance", scope: "company-wide", summary: "Guidelines on flight booking tiers, per diem limits, and receipt submission deadlines." },
  ];
  for (const pol of policiesData) {
    const policy = await prisma.policy.create({
      data: {
        title: pol.title,
        category: pol.category,
        scope: pol.scope,
        mandatoryAcknowledgement: true,
        status: "Published",
        versions: {
          create: [
            {
              versionNumber: 1,
              summary: pol.summary,
              createdByName: "Sunita Reddy",
              effectiveDate: new Date("2026-01-01T00:00:00Z"),
              acknowledgementDeadlineDays: 14,
              publishedAt: new Date("2026-01-01T00:00:00Z"),
            },
          ],
        },
      },
      include: { versions: true },
    });
    // Acknowledge for EMP001
    await prisma.policyAcknowledgement.create({
      data: { versionId: policy.versions[0].id, employeeId: emp001 },
    });
  }

  // ── 5. Helpdesk Tickets (Module 16) ─────────────────────────────────────────
  console.log("🎫 Seeding Helpdesk Tickets…");
  const emp002 = empPKByCode.get("EMP002")!;
  const emp003 = empPKByCode.get("EMP003")!;
  const emp008 = empPKByCode.get("EMP008")!;
  const emp010 = empPKByCode.get("EMP010")!;
  const emp011 = empPKByCode.get("EMP011")!;

  const helpdeskData = [
    { ticketNumber: "HD-1001", requester: emp001, assignee: emp004, cat: "Hardware", queue: "IT Operations", sub: "MacBook Pro M3 battery health degraded below 70%", desc: "Device rapidly drains power during video calls.", prio: "Urgent", st: "Open" },
    { ticketNumber: "HD-1002", requester: emp002, assignee: emp005, cat: "Software", queue: "DevOps", sub: "Request for AWS Staging Sandbox Access", desc: "Need permissions to validate new billing workflow in staging environment.", prio: "High", st: "In Progress" },
    { ticketNumber: "HD-1003", requester: emp003, assignee: emp011, cat: "HR", queue: "Human Resources", sub: "Clarification on Q3 tax deduction in payslip", desc: "Section 80C investment proof verification query.", prio: "Medium", st: "Resolved" },
    { ticketNumber: "HD-1004", requester: emp004, assignee: emp008, cat: "Facilities", queue: "Office Admin", sub: "Ergonomic monitor arm for Seattle desk", desc: "Dual monitor mount requisition.", prio: "Low", st: "Open" },
    { ticketNumber: "HD-1005", requester: emp001, assignee: emp011, cat: "Leave", queue: "Human Resources", sub: "Comp-off balance crediting for weekend deployment", desc: "Production migration support on Sunday Aug 23.", prio: "Medium", st: "Resolved" },
  ];
  for (const h of helpdeskData) {
    const sla = new Date();
    sla.setHours(sla.getHours() + (h.prio === "Urgent" ? 4 : h.prio === "High" ? 12 : 48));
    const ticket = await prisma.helpdeskTicket.create({
      data: {
        ticketNumber: h.ticketNumber,
        requesterId: h.requester,
        assignedToId: h.assignee,
        category: h.cat,
        queue: h.queue,
        subject: h.sub,
        description: h.desc,
        priority: h.prio,
        status: h.st,
        slaDeadline: sla,
      },
    });
    await prisma.helpdeskComment.create({
      data: { ticketId: ticket.id, authorId: h.requester, message: `Ticket logged: ${h.desc}` },
    });
  }

  // ── 6. Assets (Module 12) ──────────────────────────────────────────────────
  console.log("💻 Seeding Physical & IT Assets…");
  const assetsData = [
    { serial: "MBP-2024-8841", cat: "Laptop", make: "Apple", model: "MacBook Pro 16 M3 Max", st: "ASSIGNED" as const, holder: emp001 },
    { serial: "MON-4K-2024-102", cat: "Peripheral", make: "Dell", model: "UltraSharp 27 4K U2723QE", st: "ASSIGNED" as const, holder: emp001 },
    { serial: "YUBI-89021", cat: "Security", make: "Yubico", model: "YubiKey 5 NFC", st: "ASSIGNED" as const, holder: emp001 },
    { serial: "XPS-2024-5512", cat: "Laptop", make: "Dell", model: "XPS 15 9530 Core i9", st: "ASSIGNED" as const, holder: emp002 },
    { serial: "APL-KB-3301", cat: "Peripheral", make: "Apple", model: "Magic Keyboard with Touch ID", st: "ASSIGNED" as const, holder: emp003 },
    { serial: "TP-2024-9912", cat: "Laptop", make: "Lenovo", model: "ThinkPad P1 Gen 6", st: "ASSIGNED" as const, holder: emp004 },
    { serial: "MBP-2024-7721", cat: "Laptop", make: "Apple", model: "MacBook Pro 14 M3 Pro", st: "IN_STOCK" as const, holder: null },
    { serial: "HM-2024-0044", cat: "Furniture", make: "Herman Miller", model: "Aeron Ergonomic Chair B", st: "ASSIGNED" as const, holder: emp005 },
  ];
  for (const a of assetsData) {
    await prisma.asset.create({
      data: {
        serial: a.serial,
        category: a.cat,
        make: a.make,
        model: a.model,
        status: a.st,
        currentHolderId: a.holder,
        acknowledged: Boolean(a.holder),
      },
    });
  }

  // ── 7. Tasks & Projects (Module 13) ─────────────────────────────────────────
  console.log("📌 Seeding Tasks & Projects…");
  const taskProject = await prisma.taskProject.create({
    data: { name: "HRMS 2.0 Enterprise Platform" },
  });
  const taskMilestone = await prisma.taskMilestone.create({
    data: {
      projectId: taskProject.id,
      title: "Sprint 14: Core Module Hardening & Polish",
      dueDate: new Date("2026-09-30T00:00:00Z"),
    },
  });
  const tasksData = [
    { title: "Implement live Admin Dashboard hiring funnel aggregation", prio: "High", st: "Done", assignee: emp001, days: 5 },
    { title: "Audit LMS course thumbnails and design system fallbacks", prio: "High", st: "In Progress", assignee: emp003, days: 3 },
    { title: "Fix currency symbol encodings across travel and expenses", prio: "Medium", st: "Done", assignee: emp001, days: 2 },
    { title: "Automate onboarding asset assignment upon offer acceptance", prio: "Medium", st: "In Progress", assignee: emp004, days: 4 },
    { title: "SOC2 Compliance Type II evidence collection", prio: "Critical", st: "Todo", assignee: emp005, days: 10 },
    { title: "Configure SMTP candidate invitation dispatch", prio: "Low", st: "Done", assignee: emp001, days: 1 },
  ];
  for (const t of tasksData) {
    const due = new Date();
    due.setDate(due.getDate() + t.days);
    await prisma.task.create({
      data: {
        projectId: taskProject.id,
        milestoneId: taskMilestone.id,
        title: t.title,
        priority: t.prio,
        status: t.st,
        assigneeId: t.assignee,
        dueDate: due,
      },
    });
  }

  // ── 8. Separation Management (Module 14) ────────────────────────────────────
  console.log("🚪 Seeding Separation Record…");
  const sepEmpId = empPKByCode.get("EMP015")!;
  const separation = await prisma.separation.create({
    data: {
      employeeId: sepEmpId,
      type: "Resignation",
      reason: "Relocating to London office",
      noticePeriodDays: 30,
      submittedOn: new Date("2026-07-01T00:00:00Z"),
      lastWorkingDay: new Date("2026-07-31T00:00:00Z"),
      status: "Settled",
      exitInterviewCompleted: true,
      accessRevoked: true,
    },
  });
  await prisma.separationClearance.createMany({
    data: [
      { separationId: separation.id, item: "Hardware Return (Laptop & Badge)", owner: "IT", status: "Complete", completedAt: new Date("2026-07-30T00:00:00Z") },
      { separationId: separation.id, item: "Knowledge Transfer & Code Handoff", owner: "Engineering Manager", status: "Complete", completedAt: new Date("2026-07-28T00:00:00Z") },
      { separationId: separation.id, item: "Finance & Travel Advance Clearance", owner: "Finance", status: "Complete", completedAt: new Date("2026-07-31T00:00:00Z") },
    ],
  });
  await prisma.exitInterview.create({
    data: {
      separationId: separation.id,
      conductedBy: "Sunita Reddy",
      responses: { primaryReason: "Relocation to London headquarters", overallExperience: 5, wouldRecommend: true },
    },
  });
  await prisma.separationSettlement.create({
    data: {
      separationId: separation.id,
      pendingSalary: 80000,
      leaveEncashment: 24000,
      reimbursements: 5000,
      recoveries: 0,
      netSettlement: 109000,
    },
  });
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
