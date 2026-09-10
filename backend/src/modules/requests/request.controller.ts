import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as requestService from "./request.service";
import { AppError } from "../../lib/errors";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await requestService.listRequests(
    {
      employeeId: q.employeeId,
      status: q.status,
      requestType: q.requestType,
    },
    req.auth?.role,
    req.auth?.employeeId
  );
  sendSuccess(res, result.data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestService.createRequest(
    req.body,
    req.auth?.employeeId,
    req.auth?.role
  );
  sendSuccess(res, result.data, undefined, 201);
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  const { status, rejectionReason } = req.body;
  if (!status || !["Approved", "Rejected"].includes(status)) {
    throw AppError.badRequest("Status must be Approved or Rejected");
  }
  const result = await requestService.decideRequest(
    req.params.id,
    { status, rejectionReason },
    req.auth?.employeeId
  );
  sendSuccess(res, result.data);
});
