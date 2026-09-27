import type {
  Employee,
  Department,
  Designation,
  Location,
  SalaryStructure,
  EmployeeDocument,
} from "@prisma/client";
import { toNumber, formatDate } from "./helpers";
import { hashStringToRange } from "./helpers";

export const LOCATION_FULL_NAMES: Record<string, string> = {
  "Bengaluru": "Bengaluru, Karnataka, India",
  "Hyderabad": "Hyderabad, Telangana, India",
  "Pune": "Pune, Maharashtra, India",
  "Delhi NCR": "Delhi NCR, Haryana, India",
  "Delhi": "Delhi, India",
  "Mumbai": "Mumbai, Maharashtra, India",
  "Chennai": "Chennai, Tamil Nadu, India",
  "Kolkata": "Kolkata, West Bengal, India",
  "Ahmedabad": "Ahmedabad, Gujarat, India",
  "Remote": "Remote, India",
};

export function formatFullLocation(locName?: string | null): string {
  if (!locName) return "";
  if (locName.includes(",")) return locName;
  return LOCATION_FULL_NAMES[locName] || `${locName}, India`;
}

type EmployeeWithRelations = Employee & {
  department?: Department | null;
  designation?: Designation | null;
  location?: Location | null;
  user?: { email: string | null } | null;
  reportingManager?: { employeeCode: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
  salaryStructures?: SalaryStructure[];
  documents?: EmployeeDocument[];
  emergencyContacts?: any[];
  movements?: any[];
  shift?: any | null;
};

export interface SerializerOptions {
  role?: string;
  isSelf?: boolean;
}

/**
 * Maps a DB employee row to the frontend contract.
 * Supports sensitive data masking for Managers viewing team members.
 */
/**
 * Maps a DB employee row to the frontend contract.
 * Supports sensitive data masking for Managers and regular Employees viewing peers.
 */
export function serializeEmployee(emp: EmployeeWithRelations, options: SerializerOptions = {}) {
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
  const defaultAvatar = `https://randomuser.me/api/portraits/${genderPath}/${avatarId}.jpg`;

  const role = options.role?.toUpperCase();
  const isManagerRestricted = role === "MANAGER" && !options.isSelf;
  const isEmployeeRestricted = role === "EMPLOYEE" && !options.isSelf;
  const isRestricted = isManagerRestricted || isEmployeeRestricted;

  // Filter sensitive documents for managers and peers
  let filteredDocs = emp.documents ?? [];
  if (isRestricted) {
    const RESTRICTED_DOC_TYPES = ["PAN", "Aadhaar", "Passport", "Bank Proof", "Salary Document"];
    filteredDocs = filteredDocs.filter((d) => {
      const type = (d.category || d.documentType || "").toLowerCase();
      return !RESTRICTED_DOC_TYPES.some((rt) => type.includes(rt.toLowerCase()));
    });
  }

  return {
    id: emp.employeeCode,
    dbId: emp.id,
    avatar: emp.avatarUrl || defaultAvatar,
    hasCustomAvatar: Boolean(emp.avatarUrl),
    firstName: emp.firstName,
    middleName: emp.middleName ?? "",
    lastName: emp.lastName,
    fullName: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" "),
    email: emp.user?.email ?? emp.personalEmail ?? "",
    companyEmail: emp.user?.email ?? "",
    personalEmail: isRestricted ? "REDACTED" : (emp.personalEmail ?? ""),
    phone: isRestricted ? "REDACTED" : (emp.personalMobile ?? ""),
    personalMobile: isRestricted ? "REDACTED" : (emp.personalMobile ?? ""),
    alternateMobile: isRestricted ? "REDACTED" : (emp.alternateMobile ?? ""),
    guardianName: isRestricted ? "REDACTED" : (emp.guardianName ?? ""),
    guardianPhone: isRestricted ? "REDACTED" : (emp.guardianPhone ?? ""),
    currentAddress: isRestricted ? "REDACTED" : (emp.address ?? ""),
    permanentAddress: isRestricted ? "REDACTED" : (emp.address ?? ""),
    city: emp.city ?? "",
    state: emp.state ?? "",
    country: emp.country ?? "India",
    postalCode: emp.location?.postalCode ?? "",
    designation: emp.designation?.title ?? "",
    designationLevel: emp.designation?.level ?? "L3",
    department: emp.department?.name ?? "",
    location: formatFullLocation(emp.location?.name),
    employmentType: emp.employmentType,
    status: emp.status,
    joinDate: formatDate(emp.dateOfJoining),
    dateOfJoining: formatDate(emp.dateOfJoining),
    probationPeriodMonths: emp.probationPeriodMonths ?? 6,
    expectedConfirmationDate: emp.expectedConfirmationDate ? formatDate(emp.expectedConfirmationDate) : null,
    actualConfirmationDate: emp.actualConfirmationDate ? formatDate(emp.actualConfirmationDate) : null,
    confirmationStatus: emp.confirmationStatus ?? "PROBATION",
    noticePeriodDays: emp.noticePeriodDays ?? 60,
    salary: isRestricted ? null : Math.round(annualSalary),
    panNumber: isRestricted ? "REDACTED" : (emp.panNumber ?? null),
    bankAccountNumber: isRestricted ? "REDACTED" : (emp.bankAccountNumber ?? null),
    bankIfsc: isRestricted ? "REDACTED" : (emp.bankIfsc ?? null),
    bankName: isRestricted ? "REDACTED" : (emp.bankName ?? null),
    managerId: emp.reportingManager?.employeeCode ?? null,
    managerName: emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}` : null,
    reportingManager: emp.reportingManager ? {
      code: emp.reportingManager.employeeCode,
      firstName: emp.reportingManager.firstName,
      lastName: emp.reportingManager.lastName,
      fullName: `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}`,
      avatar: emp.reportingManager.avatarUrl || null,
    } : null,
    shift: emp.shift ? {
      id: emp.shift.id,
      name: emp.shift.name,
      startTime: emp.shift.startTime,
      endTime: emp.shift.endTime,
      gracePeriodMinutes: emp.shift.gracePeriodMinutes,
    } : null,
    gender: emp.gender ?? "",
    dob: emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null,
    documentsCount: filteredDocs.length,
    documents: isRestricted ? [] : filteredDocs,
    emergencyContacts: isRestricted ? [] : (emp.emergencyContacts ?? []),
    movements: isRestricted ? [] : (emp.movements ?? []),
  };
}

export function serializeEmployeeList(employees: EmployeeWithRelations[], options: SerializerOptions = {}) {
  return employees.map((e) => serializeEmployee(e, options));
}

