import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as attendanceService from "./attendance.service";
import { AppError } from "../../lib/errors";

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

export const requestRegularization = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw AppError.unauthorized();
  const employeeCode = req.body.employeeId ?? req.auth.employeeCode;
  const result = await attendanceService.requestRegularization(
    employeeCode,
    req.body,
    req.auth.employeeId
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
  if (!req.auth) throw AppError.unauthorized();
  const result = await attendanceService.decideRegularization(
    req.params.id,
    req.body,
    req.auth.sub
  );
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
