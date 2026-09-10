import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";

export interface CreateRequestInput {
  employeeId?: string; // If caller is HR/Admin; otherwise derived from auth
  requestType: string;
  payload: any;
  reason?: string;
}

const REQUEST_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      personalEmail: true,
      department: { select: { name: true } },
      designation: { select: { title: true } },
    },
  },
};

export async function createRequest(input: CreateRequestInput, actorEmployeeId?: string, actorRole?: string) {
  let targetEmployeeId = actorEmployeeId;
  if (input.employeeId && (actorRole === "ADMIN" || actorRole === "HR")) {
    targetEmployeeId = input.employeeId;
  }

  if (!targetEmployeeId) {
    throw AppError.badRequest("Employee ID is required to submit a request");
  }

  const emp = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { id: true, employeeCode: true, status: true },
  });
  if (!emp) throw AppError.notFound("Employee not found");
  if (emp.status === "Inactive" || emp.status === "Terminated") {
    throw AppError.badRequest("Inactive or terminated employees cannot create requests");
  }

  const request = await prisma.employeeRequest.create({
    data: {
      employeeId: emp.id,
      requestType: input.requestType,
      payload: input.payload || {},
      reason: input.reason || null,
      status: "Pending",
    },
    include: REQUEST_INCLUDE,
  });

  await writeAuditLog({
    action: "CREATE",
    entityType: "EmployeeRequest",
    entityId: request.id,
    actorUserId: actorEmployeeId,
    newValue: { requestType: input.requestType, employeeCode: emp.employeeCode },
  });

  return { data: request };
}

export async function listRequests(
  filters: { employeeId?: string; status?: string; requestType?: string },
  actorRole?: string,
  actorEmployeeId?: string
) {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.requestType) where.requestType = filters.requestType;

  if (actorRole === "EMPLOYEE") {
    if (!actorEmployeeId) throw AppError.forbidden("Employee context required");
    where.employeeId = actorEmployeeId;
  } else if (actorRole === "MANAGER") {
    if (!actorEmployeeId) throw AppError.forbidden("Manager context required");
    // Manager can view their direct reports + their own requests
    const reports = await prisma.employee.findMany({
      where: { managerId: actorEmployeeId },
      select: { id: true },
    });
    const allowedIds = [actorEmployeeId, ...reports.map((r) => r.id)];
    where.employeeId = { in: allowedIds };
  } else if (filters.employeeId) {
    where.employeeId = filters.employeeId;
  }

  const requests = await prisma.employeeRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return { data: requests };
}

export async function decideRequest(
  requestId: string,
  decision: { status: "Approved" | "Rejected"; rejectionReason?: string },
  actorEmployeeId?: string
) {
  const req = await prisma.employeeRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });
  if (!req) throw AppError.notFound("Request not found");
  if (req.status !== "Pending") {
    throw AppError.conflict(`Request has already been decided (${req.status})`);
  }

  const result = await prisma.$transaction(async (tx: any) => {
    if (decision.status === "Approved") {
      const p = req.payload as Record<string, any>;
      if (req.requestType === "ProfileUpdate") {
        const updateData: Record<string, any> = {};
        if (p.personalEmail !== undefined) updateData.personalEmail = p.personalEmail;
        if (p.mobileNumber !== undefined) updateData.personalMobile = p.mobileNumber;
        if (p.personalMobile !== undefined) updateData.personalMobile = p.personalMobile;
        if (p.alternateMobile !== undefined) updateData.alternateMobile = p.alternateMobile;
        if (p.currentAddress !== undefined) updateData.currentAddress = p.currentAddress;
        if (p.permanentAddress !== undefined) updateData.permanentAddress = p.permanentAddress;
        if (p.city !== undefined) updateData.city = p.city;
        if (p.state !== undefined) updateData.state = p.state;
        if (p.country !== undefined) updateData.country = p.country;
        if (p.postalCode !== undefined) updateData.postalCode = p.postalCode;

        if (Object.keys(updateData).length > 0) {
          await tx.employee.update({
            where: { id: req.employeeId },
            data: updateData,
          });
        }
      } else if (req.requestType === "BankUpdate") {
        const updateData: Record<string, any> = {};
        if (p.bankAccountNumber !== undefined) updateData.bankAccountNumber = p.bankAccountNumber;
        if (p.bankIfsc !== undefined) updateData.bankIfsc = p.bankIfsc;
        if (p.bankName !== undefined) updateData.bankName = p.bankName;
        if (p.panNumber !== undefined) updateData.panNumber = p.panNumber;

        if (Object.keys(updateData).length > 0) {
          await tx.employee.update({
            where: { id: req.employeeId },
            data: updateData,
          });
        }
      } else if (req.requestType === "EmergencyContact" && p.name && p.phone) {
        await tx.employeeEmergencyContact.create({
          data: {
            employeeId: req.employeeId,
            name: p.name,
            relationship: p.relationship || "Guardian",
            phone: p.phone,
            alternatePhone: p.alternatePhone || null,
            email: p.email || null,
            address: p.address || null,
            isPrimary: Boolean(p.isPrimary),
          },
        });
      }
    }

    return tx.employeeRequest.update({
      where: { id: req.id },
      data: {
        status: decision.status,
        decisionNotes: decision.status === "Rejected" ? decision.rejectionReason || "Request rejected by reviewer" : null,
        approverId: actorEmployeeId || null,
        decidedAt: new Date(),
      },
      include: REQUEST_INCLUDE,
    });
  });

  await writeAuditLog({
    action: "UPDATE",
    entityType: "EmployeeRequest",
    entityId: req.id,
    actorUserId: actorEmployeeId,
    oldValue: { status: "Pending" },
    newValue: { status: decision.status },
  });

  return { data: result };
}
