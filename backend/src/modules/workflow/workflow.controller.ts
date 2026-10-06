import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as workflowService from "./workflow.service";
import type { WorkflowReadScope } from "./workflow.access";

function workflowReadScope(req: Request): WorkflowReadScope | undefined {
  const auth = req.auth;
  if (!auth) throw AppError.unauthorized();
  if (auth.permissions.includes("workflows:write")) return undefined;
  if (!auth.employeeCode) throw AppError.forbidden("Account is not linked to an employee record");
  return {
    employeeCode: auth.employeeCode,
    includeAssigned: auth.permissions.includes("workflows:approve"),
  };
}

function authenticatedActorName(req: Request): string {
  const auth = req.auth;
  if (!auth) throw AppError.unauthorized();
  return `${auth.firstName ?? ""} ${auth.lastName ?? ""}`.trim() || auth.name || auth.employeeCode || auth.role;
}

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

export const reviseDefinition = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.reviseDefinition(req.params.id, req.body);
  sendSuccess(res, result.data, undefined, 201);
});

export const listBlueprints = asyncHandler(async (_req: Request, res: Response) => {
  const result = await workflowService.listBlueprints();
  sendSuccess(res, result.data);
});

export const installBlueprint = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.installBlueprint(req.params.key);
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

export const listInstances = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.listInstances(workflowReadScope(req));
  sendSuccess(res, result.data);
});

export const getEventLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.getEventLog(workflowReadScope(req));
  sendSuccess(res, result.data);
});

export const submitRequest = asyncHandler(async (req: Request, res: Response) => {
  const requesterCode = req.auth?.employeeCode;
  if (!requesterCode) throw AppError.forbidden("Submitter must be linked to an employee record");
  const result = await workflowService.submitRequest(
    req.body.definitionId,
    requesterCode,
    req.body.attributes
  );
  sendSuccess(res, result.data, undefined, 201);
});

export const previewRequest = asyncHandler(async (req: Request, res: Response) => {
  const requesterCode = req.auth?.employeeCode;
  if (!requesterCode) throw AppError.forbidden("Requester must be linked to an employee record");
  const result = await workflowService.previewRequest(
    req.body.definitionId,
    requesterCode,
    req.body.attributes
  );
  sendSuccess(res, result.data);
});

export const actOnStep = asyncHandler(async (req: Request, res: Response) => {
  const actorCode = req.auth?.employeeCode;
  if (!actorCode) throw AppError.forbidden("Approver must be linked to an employee record");
  const actorRole = req.auth?.role ?? "";
  const bypassRoleApprover = actorRole === "ADMIN" && (req.auth?.permissions.includes("workflows:write") ?? false);
  const actorName = authenticatedActorName(req);
  const result = await workflowService.actOnStep(
    req.params.id,
    actorCode,
    actorName,
    req.body.action,
    req.body.reason,
    { bypassRoleApprover, actorRole },
    req.body.stepId
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
    req.body.stepId,
    req.body.approverId,
    authenticatedActorName(req)
  );
  sendSuccess(res, result.data);
});
