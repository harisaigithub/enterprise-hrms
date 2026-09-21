import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as attendanceService from "./attendance.service";
import { AppError } from "../../lib/errors";

function regularizationActor(req: Request) {
  if (!req.auth?.employeeId || !req.auth.employeeCode) {
    throw AppError.forbidden("A linked employee profile is required for attendance regularization");
  }
  return {
    userId: req.auth.sub,
    employeeId: req.auth.employeeId,
    employeeCode: req.auth.employeeCode,
    role: req.auth.role,
    name: req.auth.name || `${req.auth.firstName ?? ""} ${req.auth.lastName ?? ""}`.trim() || req.auth.employeeCode,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await attendanceService.listAttendance(
    {
      employeeId: q.employeeId,
      month: q.month ? Number(q.month) : undefined,
      year: q.year ? Number(q.year) : undefined,
    },
    req.auth?.employeeId
  );
  sendSuccess(res, result.data);
});

export const summary = asyncHandler(async (_req: Request, res: Response) => {
  const result = await attendanceService.getTeamSummary();
  sendSuccess(res, result.data);
});

export const doCheckIn = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  const employeeId = req.body.employeeId ?? req.auth.employeeCode;
  if (!employeeId) throw AppError.badRequest("employeeId is required");
  const result = await attendanceService.checkIn(employeeId, req.auth.employeeId, req.body.method);
  sendSuccess(res, result.data, undefined, 201);
});

export const doCheckOut = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  const employeeId = req.body.employeeId ?? req.auth.employeeCode;
  if (!employeeId) throw AppError.badRequest("employeeId is required");
  const result = await attendanceService.checkOut(employeeId, req.auth.employeeId);
  sendSuccess(res, result.data);
});

export const doStartBreak = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.employeeId) throw AppError.forbidden("An employee profile is required to start a break");
  const result = await attendanceService.startBreak(req.auth.employeeId, req.auth.sub, req.body.breakType);
  sendSuccess(res, result.data, undefined, 201);
});

export const doEndBreak = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth?.employeeId) throw AppError.forbidden("An employee profile is required to end a break");
  const result = await attendanceService.endBreak(req.auth.employeeId, req.auth.sub);
  sendSuccess(res, result.data);
});

export const requestRegularization = asyncHandler(async (req: Request, res: Response) => {
  const actor = regularizationActor(req);
  const result = await attendanceService.requestRegularization(
    actor.employeeCode,
    req.body,
    actor
  );
  sendSuccess(res, result.data, undefined, 201);
});

export const listRegularizations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  const q = req.query as Record<string, string | undefined>;
  const result = await attendanceService.listRegularizations(
    { employeeId: q.employeeId, status: q.status },
    req.auth.role,
    req.auth.employeeId
  );
  sendSuccess(res, result.data);
});

export const decideRegularization = asyncHandler(async (req: Request, res: Response) => {
  const result = await attendanceService.actOnRegularization(req.params.id, req.body, regularizationActor(req));
  sendSuccess(res, result.data);
});

export const resubmitRegularization = asyncHandler(async (req: Request, res: Response) => {
  const result = await attendanceService.resubmitRegularization(req.params.id, req.body, regularizationActor(req));
  sendSuccess(res, result.data);
});

export const listShifts = asyncHandler(async (_req: Request, res: Response) => {
  const result = await attendanceService.listShifts();
  sendSuccess(res, result.data);
});

export const createShift = asyncHandler(async (req: Request, res: Response) => {
  const result = await attendanceService.createShift(req.body);
  sendSuccess(res, result.data, undefined, 201);
});
