import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { writeAuditLog } from "../../services/audit.service";
import { serializeEmployeeList } from "../../serializers/employee.serializer";
import { parsePagination } from "../../lib/utils";
import { saveUploadedFile, deleteStoredFile } from "../../lib/fileStorage";

/** Safely convert a value to a Prisma Decimal-compatible number. */
function toDecimal(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

const EMPLOYEE_INCLUDE = {
  department: true,
  designation: true,
  location: true,
  user: { select: { email: true } },
  reportingManager: { select: { employeeCode: true, firstName: true, lastName: true, avatarUrl: true } },
  salaryStructures: { where: { isActive: true } },
  documents: { orderBy: { createdAt: "desc" } },
  emergencyContacts: { orderBy: { isPrimary: "desc" } },
  movements: { orderBy: { createdAt: "desc" }, take: 20 },
  shift: true,
} satisfies Prisma.EmployeeInclude;

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listEmployees(filters: EmployeeFilters, options: { role?: string; currentUserId?: string } = {}) {
  const { page, limit, skip } = parsePagination({
    page: filters.page,
    limit: filters.limit,
  });

  const where: Prisma.EmployeeWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.department) {
    where.department = { name: filters.department };
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { employeeCode: { contains: q, mode: "insensitive" } },
      { personalEmail: { contains: q, mode: "insensitive" } },
      { designation: { title: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.employee.findMany({ where, include: EMPLOYEE_INCLUDE, orderBy: { employeeCode: "asc" }, skip, take: limit }),
    prisma.employee.count({ where }),
  ]);

  return {
    data: serializeEmployeeList(rows, { role: options.role }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmployeeById(id: string, options: { role?: string; isSelf?: boolean } = {}) {
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: EMPLOYEE_INCLUDE,
  });
  if (!emp) throw AppError.notFound("Employee not found");
  return { data: serializeEmployeeList([emp], options)[0] };
}

export async function getEmployeeByCode(code: string, options: { role?: string; isSelf?: boolean } = {}) {
  const emp = await prisma.employee.findUnique({
    where: { employeeCode: code },
    include: EMPLOYEE_INCLUDE,
  });
  if (!emp) throw AppError.notFound("Employee not found");
  return { data: serializeEmployeeList([emp], options)[0] };
}

export interface CreateEmployeeInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  alternateMobile?: string;
  guardianName?: string;
  guardianPhone?: string;
  avatarUrl?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  designationId?: string;
  departmentId?: string;
  locationId?: string;
  designation?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  dateOfJoining?: string;
  managerId?: string;
  gender?: string;
  dob?: string;
  status?: string;
  probationPeriodMonths?: number;
  noticePeriodDays?: number;
  shiftId?: string;
  password?: string;
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    primaryPhone: string;
    alternatePhone?: string;
    address?: string;
    isPrimary?: boolean;
  }>;
}

function toOptionalDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Validate reporting hierarchy to prevent self-reporting and circular loops. */
export async function validateReportingHierarchy(employeeId: string, proposedManagerId: string | null): Promise<void> {
  if (!proposedManagerId) return;
  if (employeeId === proposedManagerId) {
    throw AppError.badRequest("An employee cannot report to themselves.");
  }

  const manager = await prisma.employee.findUnique({
    where: { id: proposedManagerId },
    select: { id: true, status: true, reportingManagerId: true, firstName: true, lastName: true },
  });
  if (!manager) {
    throw AppError.notFound("Proposed reporting manager not found.");
  }
  if (manager.status === "Inactive" || manager.status === "Terminated") {
    throw AppError.badRequest("Cannot assign an inactive or terminated employee as reporting manager.");
  }

  let currentManagerId: string | null = manager.reportingManagerId;
  const visited = new Set<string>([proposedManagerId]);

  while (currentManagerId) {
    if (currentManagerId === employeeId) {
      throw AppError.badRequest("Circular reporting detected: An employee cannot report to someone who reports to them directly or indirectly.");
    }
    if (visited.has(currentManagerId)) {
      break;
    }
    visited.add(currentManagerId);
    const nextMgr = await prisma.employee.findUnique({
      where: { id: currentManagerId },
      select: { reportingManagerId: true },
    });
    currentManagerId = nextMgr?.reportingManagerId ?? null;
  }
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PRE_JOINING", "ONBOARDING", "Active", "Inactive"],
  PRE_JOINING: ["ONBOARDING", "Active", "Inactive"],
  ONBOARDING: ["Active", "Inactive"],
  Active: ["ON_NOTICE", "Resigned", "Terminated", "Retired", "Inactive"],
  ON_NOTICE: ["Resigned", "Terminated", "Active", "Inactive"],
  Resigned: ["Inactive", "Active"],
  Terminated: ["Inactive"],
  Retired: ["Inactive"],
  Inactive: ["Active"],
};

export function validateStatusTransition(currentStatus: string, nextStatus: string): void {
  if (currentStatus.toLowerCase() === nextStatus.toLowerCase()) return;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [
    "Active", "Inactive", "ON_NOTICE", "Resigned", "Terminated", "Retired", "ONBOARDING", "PRE_JOINING", "DRAFT"
  ];
  const isMatch = allowed.some((s) => s.toLowerCase() === nextStatus.toLowerCase());
  if (!isMatch) {
    throw AppError.badRequest(`Invalid employee status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

/** Resolve manager by ID (UUID) or by employeeCode (EMP002). */
async function resolveManagerId(managerId?: string | null): Promise<string | null> {
  if (!managerId) return null;
  const trimmed = managerId.trim();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(trimmed)) return trimmed;
  const mgr = await prisma.employee.findFirst({
    where: { employeeCode: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  return mgr?.id ?? null;
}

/** Resolve an org reference (designation/department/location) by name */
async function resolveNameToId(
  findFirst: (name: string) => Promise<{ id: string } | null>,
  name: string,
  label: string,
  autoCreate?: (name: string) => Promise<{ id: string }>
): Promise<string> {
  const row = await findFirst(name);
  if (row) return row.id;

  if (name.includes(",")) {
    const city = name.split(",")[0].trim();
    const cityRow = await findFirst(city);
    if (cityRow) return cityRow.id;
  }

  if (autoCreate) {
    const created = await autoCreate(name);
    return created.id;
  }

  throw AppError.badRequest(`${label} "${name}" not found. Add it in Organization first.`);
}

async function resolveOrgRefs(input: Partial<CreateEmployeeInput>) {
  const [designationId, departmentId, locationId] = await Promise.all([
    input.designationId ? Promise.resolve(input.designationId)
      : input.designation ? resolveNameToId(
          (n) => {
            const where: Prisma.DesignationWhereInput = { title: { equals: n, mode: "insensitive" } };
            return prisma.designation.findFirst({ where });
          },
          input.designation,
          "Designation",
          async (title) => {
            return prisma.designation.create({ data: { title } });
          }
        ) : Promise.resolve(null),
    input.departmentId ? Promise.resolve(input.departmentId)
      : input.department ? resolveNameToId(
          (n) => {
            const where: Prisma.DepartmentWhereInput = { name: { equals: n, mode: "insensitive" } };
            return prisma.department.findFirst({ where });
          },
          input.department,
          "Department"
        ) : Promise.resolve(null),
    input.locationId ? Promise.resolve(input.locationId)
      : input.location ? resolveNameToId(
          (n) => {
            const where: Prisma.LocationWhereInput = { name: { equals: n, mode: "insensitive" } };
            return prisma.location.findFirst({ where });
          },
          input.location,
          "Location"
        ) : Promise.resolve(null),
  ]);
  return { designationId, departmentId, locationId };
}

export async function generateEmployeeCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EMP-${currentYear}-`;
  const latest = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: prefix } },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });

  let nextSeq = 1;
  if (latest) {
    const numPart = latest.employeeCode.replace(prefix, "");
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  } else {
    const count = await prisma.employee.count();
    nextSeq = count + 1;
  }
  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

export async function createEmployee(input: CreateEmployeeInput, actorId?: string) {
  // Duplicate check: email, mobile, PAN
  const email = (input.email ?? "").trim().toLowerCase();
  if (email) {
    const [dupUser, dupEmp] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.employee.findFirst({ where: { personalEmail: { equals: email, mode: "insensitive" } } }),
    ]);
    if (dupUser || dupEmp) {
      throw AppError.conflict(`An account or employee with email "${email}" already exists.`);
    }
  }

  if (input.phone) {
    const dupPhone = await prisma.employee.findFirst({
      where: { personalMobile: input.phone },
    });
    if (dupPhone) {
      throw AppError.conflict(`An employee with phone number "${input.phone}" already exists.`);
    }
  }

  if (input.panNumber) {
    const dupPan = await prisma.employee.findFirst({
      where: { panNumber: input.panNumber },
    });
    if (dupPan) {
      throw AppError.conflict(`An employee with PAN "${input.panNumber}" already exists.`);
    }
  }

  const nextCode = await generateEmployeeCode();
  const { designationId, departmentId, locationId } = await resolveOrgRefs(input);
  const reportingManagerId = await resolveManagerId(input.managerId);

  // Validate reporting manager if provided
  if (reportingManagerId) {
    const mgr = await prisma.employee.findUnique({ where: { id: reportingManagerId } });
    if (!mgr) throw AppError.notFound("Reporting manager not found");
    if (mgr.status === "Inactive" || mgr.status === "Terminated") {
      throw AppError.badRequest("Cannot assign an inactive employee as reporting manager.");
    }
  }

  // Create user account if email provided
  let userId: string | null = null;
  if (email) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password ?? "Welcome@123"),
        role: { connect: { name: "EMPLOYEE" } },
      },
    });
    userId = user.id;
  }

  const joinDate = input.dateOfJoining ? new Date(input.dateOfJoining) : new Date();
  const expectedConfirmation = new Date(joinDate);
  expectedConfirmation.setMonth(expectedConfirmation.getMonth() + (input.probationPeriodMonths ?? 6));

  const emp = await prisma.employee.create({
    data: {
      userId,
      employeeCode: nextCode,
      firstName: input.firstName,
      middleName: input.middleName ?? null,
      lastName: input.lastName,
      personalEmail: email || null,
      personalMobile: input.phone ?? null,
      alternateMobile: input.alternateMobile ?? null,
      currentAddress: input.currentAddress ?? null,
      permanentAddress: input.permanentAddress ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? "India",
      postalCode: input.postalCode ?? null,
      panNumber: input.panNumber ?? null,
      bankAccountNumber: input.bankAccountNumber ?? null,
      bankIfsc: input.bankIfsc ?? null,
      bankName: input.bankName ?? null,
      guardianName: input.guardianName ?? null,
      guardianPhone: input.guardianPhone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      dateOfBirth: toOptionalDate(input.dob),
      gender: input.gender ?? null,
      designationId,
      departmentId,
      locationId,
      reportingManagerId,
      dateOfJoining: joinDate,
      employmentType: input.employmentType ?? "Full-Time",
      status: input.status ?? "Active",
      probationPeriodMonths: input.probationPeriodMonths ?? 6,
      expectedConfirmationDate: expectedConfirmation,
      confirmationStatus: "PROBATION",
      noticePeriodDays: input.noticePeriodDays ?? 60,
      shiftId: input.shiftId ?? null,
      emergencyContacts: input.emergencyContacts && input.emergencyContacts.length > 0 ? {
        create: input.emergencyContacts.map((c) => ({
          name: c.name,
          relationship: c.relationship,
          primaryPhone: c.primaryPhone,
          alternatePhone: c.alternatePhone ?? null,
          address: c.address ?? null,
          isPrimary: c.isPrimary ?? true,
        })),
      } : undefined,
    },
    include: EMPLOYEE_INCLUDE,
  });

  // Record initial movement
  await prisma.employeeMovement.create({
    data: {
      employeeId: emp.id,
      movementType: "STATUS_CHANGE",
      newStatus: emp.status,
      newDepartmentId: emp.departmentId,
      newDesignationId: emp.designationId,
      newManagerId: emp.reportingManagerId,
      effectiveDate: joinDate,
      reason: "Initial onboarding / Employee record created",
      requestedById: actorId ?? null,
      approvedById: actorId ?? null,
    },
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "Employee",
    entityId: emp.id,
    newValue: { employeeCode: emp.employeeCode, firstName: emp.firstName, lastName: emp.lastName },
  });

  return { data: serializeEmployeeList([emp])[0] };
}

export async function updateEmployee(id: string, input: Partial<CreateEmployeeInput>, actorId?: string) {
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { user: true, designation: true, department: true },
  });
  if (!existing) throw AppError.notFound("Employee not found");

  if (input.status) {
    validateStatusTransition(existing.status, input.status);
  }

  const { designationId, departmentId, locationId } = await resolveOrgRefs(input);
  const resolvedManagerId = input.managerId !== undefined ? await resolveManagerId(input.managerId) : undefined;

  if (resolvedManagerId !== undefined && resolvedManagerId !== existing.reportingManagerId) {
    await validateReportingHierarchy(id, resolvedManagerId);
  }

  const data: Prisma.EmployeeUpdateInput = {
    firstName: input.firstName ?? undefined,
    middleName: input.middleName !== undefined ? (input.middleName || null) : undefined,
    lastName: input.lastName ?? undefined,
    personalMobile: input.phone !== undefined ? (input.phone || null) : undefined,
    alternateMobile: input.alternateMobile !== undefined ? (input.alternateMobile || null) : undefined,
    currentAddress: input.currentAddress !== undefined ? (input.currentAddress || null) : undefined,
    permanentAddress: input.permanentAddress !== undefined ? (input.permanentAddress || null) : undefined,
    city: input.city !== undefined ? (input.city || null) : undefined,
    state: input.state !== undefined ? (input.state || null) : undefined,
    country: input.country !== undefined ? (input.country || null) : undefined,
    postalCode: input.postalCode !== undefined ? (input.postalCode || null) : undefined,
    panNumber: input.panNumber !== undefined ? (input.panNumber || null) : undefined,
    bankAccountNumber: input.bankAccountNumber !== undefined ? (input.bankAccountNumber || null) : undefined,
    bankIfsc: input.bankIfsc !== undefined ? (input.bankIfsc || null) : undefined,
    bankName: input.bankName !== undefined ? (input.bankName || null) : undefined,
    guardianName: input.guardianName !== undefined ? (input.guardianName || null) : undefined,
    guardianPhone: input.guardianPhone !== undefined ? (input.guardianPhone || null) : undefined,
    avatarUrl: input.avatarUrl !== undefined ? (input.avatarUrl || null) : undefined,
    dateOfBirth: toOptionalDate(input.dob) ?? undefined,
    gender: input.gender ?? undefined,
    designation: designationId ? { connect: { id: designationId } } : undefined,
    department: departmentId ? { connect: { id: departmentId } } : undefined,
    location: locationId ? { connect: { id: locationId } } : undefined,
    reportingManager: resolvedManagerId !== undefined ? (resolvedManagerId ? { connect: { id: resolvedManagerId } } : { disconnect: true }) : undefined,
    employmentType: input.employmentType ?? undefined,
    dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining) : undefined,
    status: input.status ?? undefined,
    probationPeriodMonths: input.probationPeriodMonths ?? undefined,
    noticePeriodDays: input.noticePeriodDays ?? undefined,
    shift: input.shiftId !== undefined ? (input.shiftId ? { connect: { id: input.shiftId } } : { disconnect: true }) : undefined,
  };

  const updated = await prisma.employee.update({
    where: { id },
    data,
    include: EMPLOYEE_INCLUDE,
  });

  // Track status change movement
  if (input.status && input.status !== existing.status) {
    await prisma.employeeMovement.create({
      data: {
        employeeId: id,
        movementType: "STATUS_CHANGE",
        oldStatus: existing.status,
        newStatus: input.status,
        effectiveDate: new Date(),
        reason: `Employee status changed from ${existing.status} to ${input.status}`,
        requestedById: actorId ?? null,
        approvedById: actorId ?? null,
      },
    });
  }

  // Track manager change movement
  if (resolvedManagerId !== undefined && resolvedManagerId !== existing.reportingManagerId) {
    await prisma.employeeMovement.create({
      data: {
        employeeId: id,
        movementType: "MANAGER_CHANGE",
        oldManagerId: existing.reportingManagerId,
        newManagerId: resolvedManagerId,
        effectiveDate: new Date(),
        reason: "Reporting manager reassigned",
        requestedById: actorId ?? null,
        approvedById: actorId ?? null,
      },
    });
  }

  // Track department transfer movement
  if (departmentId && departmentId !== existing.departmentId) {
    await prisma.employeeMovement.create({
      data: {
        employeeId: id,
        movementType: "TRANSFER",
        oldDepartmentId: existing.departmentId,
        newDepartmentId: departmentId,
        effectiveDate: new Date(),
        reason: "Department transfer",
        requestedById: actorId ?? null,
        approvedById: actorId ?? null,
      },
    });
  }

  if (input.status && existing.userId) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: input.status === "Active" },
    });
  }

  writeAuditLog({
    action: "UPDATE",
    entityType: "Employee",
    entityId: updated.id,
    oldValue: { employeeCode: existing.employeeCode },
    newValue: { employeeCode: updated.employeeCode, firstName: updated.firstName, lastName: updated.lastName },
  });

  return { data: serializeEmployeeList([updated])[0] };
}

export async function deleteEmployee(id: string) {
  const existing = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw AppError.notFound("Employee not found");

  // Soft-delete: set status Inactive, remove auth access.
  await prisma.employee.update({ where: { id }, data: { status: "Inactive" } });
  if (existing.userId) {
    await prisma.user.update({ where: { id: existing.userId }, data: { isActive: false } });
  }

  writeAuditLog({
    action: "DELETE",
    entityType: "Employee",
    entityId: existing.id,
    oldValue: { employeeCode: existing.employeeCode },
    newValue: { status: "Inactive" },
  });

  return { data: { id: existing.employeeCode, deleted: true } };
}

/* -------------------------------------------------------------------------- */
/*                          Salary Structure (HR)                             */
/* -------------------------------------------------------------------------- */

export interface SalaryStructureInput {
  effectiveFrom: string;
  basicSalary: number;
  hra: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  performanceBonus?: number;
  otherAllowances?: number;
  providentFund?: number;
  professionalTax?: number;
  incomeTax?: number;
  healthInsurance?: number;
}

/** Serialize a raw SalaryStructure row for the frontend. */
function serializeSalaryStructure(s: {
  id: string;
  effectiveFrom: Date;
  basicSalary: unknown;
  hra: unknown;
  conveyanceAllowance: unknown;
  medicalAllowance: unknown;
  performanceBonus: unknown;
  otherAllowances: unknown;
  providentFund: unknown;
  professionalTax: unknown;
  incomeTax: unknown;
  healthInsurance: unknown;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: s.id,
    effectiveFrom: s.effectiveFrom.toISOString().slice(0, 10),
    basicSalary: toDecimal(s.basicSalary),
    hra: toDecimal(s.hra),
    conveyanceAllowance: toDecimal(s.conveyanceAllowance),
    medicalAllowance: toDecimal(s.medicalAllowance),
    performanceBonus: toDecimal(s.performanceBonus),
    otherAllowances: toDecimal(s.otherAllowances),
    providentFund: toDecimal(s.providentFund),
    professionalTax: toDecimal(s.professionalTax),
    incomeTax: toDecimal(s.incomeTax),
    healthInsurance: toDecimal(s.healthInsurance),
    isActive: s.isActive,
  };
}

/** Get the active salary structure for an employee (returns null if none). */
export async function getSalaryStructure(employeeIdOrCode: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeIdOrCode);
  const emp = await prisma.employee.findFirst({
    where: isUuid ? { id: employeeIdOrCode } : { employeeCode: employeeIdOrCode },
    select: { id: true },
  });
  if (!emp) throw AppError.notFound("Employee not found");

  const structure = await prisma.salaryStructure.findFirst({
    where: { employeeId: emp.id, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });

  return { data: structure ? serializeSalaryStructure(structure) : null };
}

export async function getSalaryStructureHistory(employeeIdOrCode: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeIdOrCode);
  const emp = await prisma.employee.findFirst({
    where: isUuid ? { id: employeeIdOrCode } : { employeeCode: employeeIdOrCode },
    select: { id: true },
  });
  if (!emp) throw AppError.notFound("Employee not found");

  const structures = await prisma.salaryStructure.findMany({
    where: { employeeId: emp.id },
    orderBy: { effectiveFrom: "desc" },
  });
  return { data: structures.map(serializeSalaryStructure) };
}

/**
 * Create or update the active salary structure for an employee.
 * Previous active structure is deactivated before the new one is saved,
 * preserving a complete history for audit / payroll runs.
 */
export async function upsertSalaryStructure(
  employeeIdOrCode: string,
  input: SalaryStructureInput,
  actorUserId?: string
) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeIdOrCode);
  const emp = await prisma.employee.findFirst({
    where: isUuid ? { id: employeeIdOrCode } : { employeeCode: employeeIdOrCode },
    select: { id: true, employeeCode: true },
  });
  if (!emp) throw AppError.notFound("Employee not found");

  const prevActive = await prisma.salaryStructure.findFirst({
    where: { employeeId: emp.id, isActive: true },
  });

  const data = {
    effectiveFrom: new Date(input.effectiveFrom),
    basicSalary: toDecimal(input.basicSalary),
    hra: toDecimal(input.hra),
    conveyanceAllowance: toDecimal(input.conveyanceAllowance ?? 0),
    medicalAllowance: toDecimal(input.medicalAllowance ?? 0),
    performanceBonus: toDecimal(input.performanceBonus ?? 0),
    otherAllowances: toDecimal(input.otherAllowances ?? 0),
    providentFund: toDecimal(input.providentFund ?? 0),
    professionalTax: toDecimal(input.professionalTax ?? 0),
    incomeTax: toDecimal(input.incomeTax ?? 0),
    healthInsurance: toDecimal(input.healthInsurance ?? 0),
    isActive: true,
  };

  const structure = await prisma.$transaction(async (tx: any) => {
    // Deactivate all existing active structures for this employee.
    await tx.salaryStructure.updateMany({
      where: { employeeId: emp.id, isActive: true },
      data: { isActive: false },
    });

    const created = await tx.salaryStructure.create({
      data: { ...data, employeeId: emp.id },
    });

    if (prevActive && Number(prevActive.basicSalary) !== Number(data.basicSalary)) {
      await tx.employeeMovement.create({
        data: {
          employeeId: emp.id,
          movementType: "SalaryRevision",
          effectiveDate: new Date(input.effectiveFrom),
          remarks: `Salary revised from ₹${prevActive.basicSalary} to ₹${data.basicSalary}`,
        },
      });
    }

    return created;
  });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "SalaryStructure",
    entityId: structure.id,
    newValue: { employeeCode: emp.employeeCode, basicSalary: data.basicSalary },
  });

  return { data: serializeSalaryStructure(structure) };
}

export async function uploadEmployeeAvatar(id: string, file: Express.Multer.File) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) throw AppError.notFound("Employee not found");

  if (emp.avatarUrl) {
    await deleteStoredFile(emp.avatarUrl);
  }

  const saved = await saveUploadedFile("avatars", file);
  const updated = await prisma.employee.update({
    where: { id },
    data: { avatarUrl: saved.fileUrl },
    include: EMPLOYEE_INCLUDE,
  });

  return { data: serializeEmployeeList([updated])[0] };
}

export async function removeEmployeeAvatar(id: string) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) throw AppError.notFound("Employee not found");

  if (emp.avatarUrl) {
    await deleteStoredFile(emp.avatarUrl);
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: { avatarUrl: null },
    include: EMPLOYEE_INCLUDE,
  });

  return { data: serializeEmployeeList([updated])[0] };
}

export async function listEmployeeDocuments(id: string) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) throw AppError.notFound("Employee not found");

  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId: id },
    orderBy: { createdAt: "desc" },
  });

  return { data: docs };
}

export async function uploadEmployeeDocument(
  id: string,
  file: Express.Multer.File,
  meta: {
    documentType: string;
    category?: string;
    documentNumber?: string;
    uploadedBy?: string;
    issueDate?: string;
    expiryDate?: string;
  }
) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) throw AppError.notFound("Employee not found");

  const saved = await saveUploadedFile("documents", file);

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: id,
      documentType: meta.documentType || meta.category || "Other",
      category: meta.category || meta.documentType || "Other",
      documentNumber: meta.documentNumber || null,
      fileName: saved.fileName,
      fileUrl: saved.fileUrl,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
      uploadedBy: meta.uploadedBy || "HR/Employee",
      verificationStatus: "Verified",
      status: "VERIFIED",
      issueDate: meta.issueDate ? new Date(meta.issueDate) : null,
      expiryDate: meta.expiryDate ? new Date(meta.expiryDate) : null,
      version: 1,
    },
  });

  return { data: doc };
}

export async function verifyEmployeeDocument(
  employeeId: string,
  documentId: string,
  input: { status: "VERIFIED" | "REJECTED"; rejectionReason?: string },
  actorUserId?: string
) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, employeeId },
  });
  if (!doc) throw AppError.notFound("Document not found");

  const isVerified = input.status === "VERIFIED";
  const updated = await prisma.employeeDocument.update({
    where: { id: documentId },
    data: {
      status: input.status,
      verificationStatus: isVerified ? "Verified" : "Rejected",
      rejectionReason: !isVerified ? (input.rejectionReason || "Document details could not be verified") : null,
      verifiedById: isVerified ? actorUserId : null,
      verifiedAt: isVerified ? new Date() : null,
      rejectedById: !isVerified ? actorUserId : null,
      rejectedAt: !isVerified ? new Date() : null,
    },
  });

  writeAuditLog({
    action: isVerified ? "VERIFY_DOCUMENT" : "REJECT_DOCUMENT",
    entityType: "EmployeeDocument",
    entityId: doc.id,
    newValue: { status: updated.status, reason: updated.rejectionReason },
  });

  return { data: updated };
}

export async function deleteEmployeeDocument(employeeId: string, documentId: string) {
  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, employeeId },
  });
  if (!doc) throw AppError.notFound("Document not found");

  await deleteStoredFile(doc.fileUrl);
  await prisma.employeeDocument.delete({ where: { id: documentId } });

  return { data: { success: true, message: "Document deleted" } };
}

/* -------------------------------------------------------------------------- */
/*                         Emergency Contacts                                 */
/* -------------------------------------------------------------------------- */

export async function listEmergencyContacts(employeeId: string) {
  const contacts = await prisma.employeeEmergencyContact.findMany({
    where: { employeeId },
    orderBy: { isPrimary: "desc" },
  });
  return { data: contacts };
}

export async function addEmergencyContact(
  employeeId: string,
  input: {
    name: string;
    relationship: string;
    primaryPhone: string;
    alternatePhone?: string;
    address?: string;
    isPrimary?: boolean;
  }
) {
  if (input.isPrimary) {
    await prisma.employeeEmergencyContact.updateMany({
      where: { employeeId },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.employeeEmergencyContact.create({
    data: {
      employeeId,
      name: input.name,
      relationship: input.relationship,
      primaryPhone: input.primaryPhone,
      alternatePhone: input.alternatePhone || null,
      address: input.address || null,
      isPrimary: input.isPrimary ?? false,
    },
  });

  // Keep legacy guardian fields on employee synced if primary
  if (contact.isPrimary) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { guardianName: contact.name, guardianPhone: contact.primaryPhone },
    });
  }

  return { data: contact };
}

export async function updateEmergencyContact(
  employeeId: string,
  contactId: string,
  input: {
    name?: string;
    relationship?: string;
    primaryPhone?: string;
    alternatePhone?: string;
    address?: string;
    isPrimary?: boolean;
  }
) {
  const existing = await prisma.employeeEmergencyContact.findFirst({
    where: { id: contactId, employeeId },
  });
  if (!existing) throw AppError.notFound("Emergency contact not found");

  if (input.isPrimary) {
    await prisma.employeeEmergencyContact.updateMany({
      where: { employeeId, id: { not: contactId } },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.employeeEmergencyContact.update({
    where: { id: contactId },
    data: {
      name: input.name ?? undefined,
      relationship: input.relationship ?? undefined,
      primaryPhone: input.primaryPhone ?? undefined,
      alternatePhone: input.alternatePhone !== undefined ? (input.alternatePhone || null) : undefined,
      address: input.address !== undefined ? (input.address || null) : undefined,
      isPrimary: input.isPrimary ?? undefined,
    },
  });

  if (updated.isPrimary) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { guardianName: updated.name, guardianPhone: updated.primaryPhone },
    });
  }

  return { data: updated };
}

export async function deleteEmergencyContact(employeeId: string, contactId: string) {
  const existing = await prisma.employeeEmergencyContact.findFirst({
    where: { id: contactId, employeeId },
  });
  if (!existing) throw AppError.notFound("Emergency contact not found");

  await prisma.employeeEmergencyContact.delete({ where: { id: contactId } });
  return { data: { success: true, message: "Emergency contact deleted" } };
}

/* -------------------------------------------------------------------------- */
/*                       Movements / Timeline History                         */
/* -------------------------------------------------------------------------- */

export async function listEmployeeMovements(employeeId: string) {
  const movements = await prisma.employeeMovement.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });
  return { data: movements };
}

export async function recordTransfer(
  employeeId: string,
  input: {
    newDepartmentId: string;
    newDesignationId?: string;
    effectiveDate: string;
    reason: string;
  },
  actorId?: string
) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, designation: true },
  });
  if (!emp) throw AppError.notFound("Employee not found");

  const movement = await prisma.employeeMovement.create({
    data: {
      employeeId,
      movementType: "TRANSFER",
      oldDepartmentId: emp.departmentId,
      newDepartmentId: input.newDepartmentId,
      oldDesignationId: emp.designationId,
      newDesignationId: input.newDesignationId || emp.designationId,
      effectiveDate: new Date(input.effectiveDate),
      reason: input.reason,
      requestedById: actorId || null,
      approvedById: actorId || null,
    },
  });

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      departmentId: input.newDepartmentId,
      designationId: input.newDesignationId || undefined,
    },
    include: EMPLOYEE_INCLUDE,
  });

  return { data: { movement, employee: serializeEmployeeList([updated])[0] } };
}

export async function recordPromotion(
  employeeId: string,
  input: {
    newDesignationId: string;
    newLevel?: string;
    newSalary?: number;
    effectiveDate: string;
    reason: string;
  },
  actorId?: string
) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { designation: true, salaryStructures: { where: { isActive: true } } },
  });
  if (!emp) throw AppError.notFound("Employee not found");

  const oldSalary = emp.salaryStructures[0]?.basicSalary;

  const movement = await prisma.employeeMovement.create({
    data: {
      employeeId,
      movementType: "PROMOTION",
      oldDesignationId: emp.designationId,
      newDesignationId: input.newDesignationId,
      oldLevel: emp.designation?.level || "L3",
      newLevel: input.newLevel || "L4",
      oldSalary: oldSalary || null,
      newSalary: input.newSalary ? toDecimal(input.newSalary) : null,
      effectiveDate: new Date(input.effectiveDate),
      reason: input.reason,
      requestedById: actorId || null,
      approvedById: actorId || null,
    },
  });

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      designationId: input.newDesignationId,
    },
    include: EMPLOYEE_INCLUDE,
  });

  if (input.newSalary) {
    const basic = toDecimal(input.newSalary * 0.5);
    const hra = toDecimal(input.newSalary * 0.3);
    const special = toDecimal(input.newSalary * 0.2);
    await upsertSalaryStructure(employeeId, {
      effectiveFrom: input.effectiveDate,
      basicSalary: basic,
      hra,
      otherAllowances: special,
    }, actorId);
  }

  return { data: { movement, employee: serializeEmployeeList([updated])[0] } };
}

export async function bulkCreateEmployees(items: CreateEmployeeInput[]) {
  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (!item.firstName || !item.lastName) {
        throw new Error("First name and last name are required");
      }
      const created = await createEmployee(item);
      results.push(created.data);
    } catch (err: any) {
      errors.push({
        row: i + 1,
        name: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
        email: item.email,
        error: err.message || "Failed to create employee",
      });
    }
  }

  return {
    data: {
      created: results,
      totalCreated: results.length,
      errors,
      totalRows: items.length,
    },
  };
}

