import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as leaveService from "./leave.service";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

export const listTypes = asyncHandler(async (_req: Request, res: Response) => {
  const result = await leaveService.listLeaveTypes();
  sendSuccess(res, result.data);
});

export const balance = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await leaveService.getLeaveBalance({
    employeeId: q.employeeId,
    year: q.year ? Number(q.year) : undefined,
  }, req.auth);
  sendSuccess(res, result.data);
});

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await leaveService.listLeaveRequests({
    employeeId: q.employeeId,
    status: q.status,
  }, req.auth);
  sendSuccess(res, result.data, result.total);
});

export const apply = asyncHandler(async (req: Request, res: Response) => {
  const result = await leaveService.applyLeave(req.body, req.auth);
  sendSuccess(res, result.data, undefined, 201);
});

async function resolveApprover(req: Request) {
  if (!req.auth?.employeeId) throw AppError.forbidden("Approver must be linked to an employee record");
  return req.auth.employeeId;
}

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const approverId = await resolveApprover(req);
  const result = await leaveService.approveLeave(req.params.id, approverId, req.body.comments);
  sendSuccess(res, result.data);
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const approverId = await resolveApprover(req);
  const result = await leaveService.rejectLeave(req.params.id, approverId, req.body.comments);
  sendSuccess(res, result.data);
});

export const getLeaveTypePublic = asyncHandler(async (req: Request, res: Response) => {
  const type = await prisma.leaveType.findUnique({ where: { code: req.params.code } });
  if (!type) throw AppError.notFound("Leave type not found");
  sendSuccess(res, { id: type.code, name: type.name, maxDays: type.defaultAnnualDays, carryForward: type.carryForward });
});
