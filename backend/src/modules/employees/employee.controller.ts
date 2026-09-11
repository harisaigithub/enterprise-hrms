import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as employeeService from "./employee.service";
import { prisma } from "../../lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve an `id` param that may be a UUID or an employee code to the DB PK. */
async function resolveEmployeeId(idOrCode: string): Promise<string> {
  if (UUID_RE.test(idOrCode)) return idOrCode;
  const emp = await prisma.employee.findUnique({ where: { employeeCode: idOrCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
  return emp.id;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await employeeService.listEmployees({
    search: q.search,
    department: q.department,
    status: q.status,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  }, { role: req.auth?.role, currentUserId: req.auth?.sub });
  res.json({ data: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const pk = await resolveEmployeeId(id);
  const isSelf = req.auth?.employeeId === pk;
  const result = UUID_RE.test(id)
    ? await employeeService.getEmployeeById(id, { role: req.auth?.role, isSelf })
    : await employeeService.getEmployeeByCode(id, { role: req.auth?.role, isSelf });
  sendSuccess(res, result.data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeeService.createEmployee(req.body, req.auth?.sub);
  sendSuccess(res, result.data, undefined, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.updateEmployee(pk, req.body, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.deleteEmployee(pk);
  sendSuccess(res, result.data);
});

export const getSalary = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.getSalaryStructure(pk);
  sendSuccess(res, result.data);
});

export const getSalaryHistory = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.getSalaryStructureHistory(pk);
  sendSuccess(res, result.data);
});

export const upsertSalary = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.upsertSalaryStructure(pk, req.body, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const bulkCreate = asyncHandler(async (req: Request, res: Response) => {
  const items = Array.isArray(req.body) ? req.body : req.body.employees;
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest("Payload must be a non-empty array of employee records");
  }
  const result = await employeeService.bulkCreateEmployees(items);
  sendSuccess(res, result.data, undefined, 201);
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  if (!req.file) {
    throw AppError.badRequest("No image file provided");
  }
  const result = await employeeService.uploadEmployeeAvatar(pk, req.file);
  sendSuccess(res, result.data);
});

export const removeAvatar = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.removeEmployeeAvatar(pk);
  sendSuccess(res, result.data);
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.listEmployeeDocuments(pk);
  sendSuccess(res, result.data);
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  if (!req.file) {
    throw AppError.badRequest("No file provided");
  }
  const { documentType, category, documentNumber, issueDate, expiryDate } = req.body;
  const result = await employeeService.uploadEmployeeDocument(pk, req.file, {
    documentType: documentType || category || "Other",
    category: category || documentType || "Other",
    documentNumber: documentNumber || null,
    uploadedBy: req.auth?.role || "Employee",
    issueDate,
    expiryDate,
  });
  sendSuccess(res, result.data, undefined, 201);
});

export const verifyDocument = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const { status, rejectionReason } = req.body;
  const normalizedStatus = String(status || "").toUpperCase();
  if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
    throw AppError.badRequest("Valid status ('VERIFIED' or 'REJECTED') is required");
  }
  const result = await employeeService.verifyEmployeeDocument(
    pk,
    req.params.docId,
    { status: normalizedStatus as "VERIFIED" | "REJECTED", rejectionReason },
    req.auth?.sub
  );
  sendSuccess(res, result.data);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.deleteEmployeeDocument(pk, req.params.docId);
  sendSuccess(res, result.data);
});

export const listEmergencyContacts = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.listEmergencyContacts(pk);
  sendSuccess(res, result.data);
});

export const addEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const primaryPhone = req.body.primaryPhone || req.body.phone;
  const { name, relationship, alternatePhone, address, isPrimary } = req.body;
  if (!name || !relationship || !primaryPhone) {
    throw AppError.badRequest("Name, relationship, and primary phone are required");
  }
  const result = await employeeService.addEmergencyContact(pk, {
    name,
    relationship,
    primaryPhone,
    alternatePhone,
    address,
    isPrimary,
  });
  sendSuccess(res, result.data, undefined, 201);
});

export const updateEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.updateEmergencyContact(pk, req.params.contactId, req.body);
  sendSuccess(res, result.data);
});

export const deleteEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.deleteEmergencyContact(pk, req.params.contactId);
  sendSuccess(res, result.data);
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const result = await employeeService.listEmployeeMovements(pk);
  sendSuccess(res, result.data);
});

export const transfer = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const { newDepartmentId, newDesignationId, effectiveDate, reason } = req.body;
  if (!newDepartmentId || !effectiveDate) {
    throw AppError.badRequest("New department and effective date are required");
  }
  const result = await employeeService.recordTransfer(
    pk,
    { newDepartmentId, newDesignationId, effectiveDate, reason: reason || "Department transfer" },
    req.auth?.sub
  );
  sendSuccess(res, result.data);
});

export const promote = asyncHandler(async (req: Request, res: Response) => {
  const pk = await resolveEmployeeId(req.params.id);
  const { newDesignationId, newLevel, newSalary, effectiveDate, reason } = req.body;
  if (!newDesignationId || !effectiveDate) {
    throw AppError.badRequest("New designation and effective date are required");
  }
  const result = await employeeService.recordPromotion(
    pk,
    { newDesignationId, newLevel, newSalary, effectiveDate, reason: reason || "Promotion" },
    req.auth?.sub
  );
  sendSuccess(res, result.data);
});



