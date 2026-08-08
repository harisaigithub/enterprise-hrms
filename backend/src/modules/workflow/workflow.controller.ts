import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as workflowService from "./workflow.service";

export const getRoster = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.getRoster();
  sendSuccess(res, result.data);
});

export const listDefinitions = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.listDefinitions();
  sendSuccess(res, result.data);
});

export const createDefinition = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.createDefinition(req.body);
  sendSuccess(res, result.data, undefined, 201);
});

export const deactivateDefinition = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.deactivateDefinition(req.params.id);
  sendSuccess(res, result.data);
});

export const deleteDefinition = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.deleteDefinition(req.params.id);
  sendSuccess(res, result.data);
});

export const listInstances = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.listInstances();
  sendSuccess(res, result.data);
});

export const getEventLog = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.getEventLog();
  sendSuccess(res, result.data);
});

export const submitRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.submitRequest(
    req.body.definitionId,
    req.body.requesterId,
    req.body.attributes
  );
  sendSuccess(res, result.data, undefined, 201);
});

export const actOnStep = asyncHandler(async (req: Request, res: Response) => {
  const actorCode = req.auth?.employeeCode;
  if (!actorCode) throw AppError.forbidden("Approver must be linked to an employee record");
  const bypassRoleApprover = req.auth?.permissions.includes("workflows:write") ?? false;
  const actorName = req.body.actingApproverName || actorCode;
  const result = await workflowService.actOnStep(
    req.params.id,
    actorCode,
    actorName,
    req.body.action,
    req.body.reason,
    { bypassRoleApprover }
  );
  sendSuccess(res, result.data);
});

export const runSlaCheck = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.runSlaCheck();
  sendSuccess(res, result.data);
});

export const manuallyAssignApprover = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.manuallyAssignApprover(
    req.params.id,
    req.body.approverId,
    req.body.approverName
  );
  sendSuccess(res, result.data);
});
