import type {
  Employee,
  Department,
  Designation,
  Location,
  SalaryStructure,
} from "@prisma/client";
import { toNumber, formatDate } from "./helpers";
import { hashStringToRange } from "./helpers";

type EmployeeWithRelations = Employee & {
  department?: Department | null;
  designation?: Designation | null;
  location?: Location | null;
  user?: { email: string | null } | null;
  reportingManager?: { employeeCode: string; firstName: string; lastName: string } | null;
  salaryStructures?: SalaryStructure[];
};

/**
 * Maps a DB employee row to the frontend contract (see docs/API.md + mock/employees.js).
 * Note: `id` is the human-readable employee_code (EMP001), NOT the UUID PK.
 */
export function serializeEmployee(emp: EmployeeWithRelations) {
  const activeStructure = emp.salaryStructures?.find((s) => s.isActive);
  const annualSalary = activeStructure
    ? toNumber(activeStructure.basicSalary) +
      toNumber(activeStructure.hra) +
      toNumber(activeStructure.conveyanceAllowance) +
      toNumber(activeStructure.medicalAllowance) +
      toNumber(activeStructure.performanceBonus) +
      toNumber(activeStructure.otherAllowances)
    : 0;

    const genderPath = emp.gender?.toLowerCase() === "female" ? "women" : "men";
    const avatarId = hashStringToRange(emp.employeeCode, 1, 99);

  return {
    id: emp.employeeCode,
    avatar: `https://randomuser.me/api/portraits/${genderPath}/${avatarId}.jpg`,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.user?.email ?? emp.personalEmail ?? "",
    phone: emp.personalMobile ?? "",
    designation: emp.designation?.title ?? "",
    department: emp.department?.name ?? "",
    location: emp.location?.name ?? "",
    employmentType: emp.employmentType,
    status: emp.status,
    joinDate: formatDate(emp.dateOfJoining),
    salary: Math.round(annualSalary),
    managerId: emp.reportingManager?.employeeCode ?? null,
    gender: emp.gender ?? "",
    dob: emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null,
  };
}

export function serializeEmployeeList(employees: EmployeeWithRelations[]) {
  return employees.map(serializeEmployee);
}
