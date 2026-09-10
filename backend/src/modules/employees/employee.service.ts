import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { writeAuditLog } from "../../services/audit.service";
import { serializeEmployeeList } from "../../serializers/employee.serializer";
import { parsePagination } from "../../lib/utils";

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
  reportingManager: { select: { employeeCode: true, firstName: true, lastName: true } },
  salaryStructures: { where: { isActive: true } },
} satisfies Prisma.EmployeeInclude;

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listEmployees(filters: EmployeeFilters) {
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
    data: serializeEmployeeList(rows),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmployeeById(id: string) {
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: EMPLOYEE_INCLUDE,
  });
  if (!emp) throw AppError.notFound("Employee not found");
  return { data: serializeEmployeeList([emp])[0] };
}

export async function getEmployeeByCode(code: string) {
  const emp = await prisma.employee.findUnique({
    where: { employeeCode: code },
    include: EMPLOYEE_INCLUDE,
  });
  if (!emp) throw AppError.notFound("Employee not found");
  return { data: serializeEmployeeList([emp])[0] };
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
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
  password?: string;
}

function toOptionalDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Resolve an org reference (designation/department/location) by name for
 *  frontend payloads that send human-readable names instead of UUIDs. */
async function resolveNameToId(
  findFirst: (name: string) => Promise<{ id: string } | null>,
  name: string,
  label: string
): Promise<string> {
  const row = await findFirst(name);
  if (!row) throw AppError.badRequest(`${label} "${name}" not found. Add it in Organization first.`);
  return row.id;
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
          "Designation"
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

export async function createEmployee(input: CreateEmployeeInput) {
  const nextCode = await generateEmployeeCode();
  const { designationId, departmentId, locationId } = await resolveOrgRefs(input);

  // Employee creation requires an auth user (email is required for login).
  const email = (input.email ?? "").toLowerCase();
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

  const emp = await prisma.employee.create({
    data: {
      userId,
      employeeCode: nextCode,
      firstName: input.firstName,
      lastName: input.lastName,
      personalEmail: email || null,
      personalMobile: input.phone ?? null,
      dateOfBirth: toOptionalDate(input.dob),
      gender: input.gender ?? null,
      designationId: designationId,
      departmentId: departmentId,
      locationId: locationId,
      reportingManagerId: input.managerId ?? null,
      dateOfJoining: new Date(input.dateOfJoining ?? new Date()),
      employmentType: input.employmentType ?? "Full-Time",
    },
    include: EMPLOYEE_INCLUDE,
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "Employee",
    entityId: emp.id,
    newValue: { employeeCode: emp.employeeCode, firstName: emp.firstName, lastName: emp.lastName },
  });

  return { data: serializeEmployeeList([emp])[0] };
}

async function generateEmployeeCode(): Promise<string> {
  const last = await prisma.employee.findFirst({ orderBy: { employeeCode: "desc" }, select: { employeeCode: true } });
  const nextNumber = last ? (Number(last.employeeCode.replace(/\D/g, "")) || 0) + 1 : 1;
  return `EMP${String(nextNumber).padStart(3, "0")}`;
}

export async function updateEmployee(id: string, input: Partial<CreateEmployeeInput>) {
  const existing = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw AppError.notFound("Employee not found");

  const { designationId, departmentId, locationId } = await resolveOrgRefs(input);

  const data: Prisma.EmployeeUpdateInput = {
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    personalMobile: input.phone ?? undefined,
    dateOfBirth: toOptionalDate(input.dob) ?? undefined,
    gender: input.gender ?? undefined,
    designation: designationId ? { connect: { id: designationId } } : undefined,
    department: departmentId ? { connect: { id: departmentId } } : undefined,
    location: locationId ? { connect: { id: locationId } } : undefined,
    reportingManager: input.managerId ? { connect: { id: input.managerId } } : undefined,
    employmentType: input.employmentType ?? undefined,
    dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining) : undefined,
    status: input.status ?? undefined,
  };

  const updated = await prisma.employee.update({
    where: { id },
    data,
    include: EMPLOYEE_INCLUDE,
  });

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

    return tx.salaryStructure.create({
      data: { ...data, employeeId: emp.id },
    });
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
