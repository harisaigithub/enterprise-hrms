import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";
import * as security from "./security.service";

function actor(req: Request) {
  if (!req.auth?.sub) throw AppError.unauthorized();
  return req.auth.sub;
}

export const roles = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.listRoles()));
export const permissions = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.permissionCatalog()));
export const createRole = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.createRole(req.body.name, actor(req)), undefined, 201));
export const deleteRole = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.deleteRole(req.params.id, actor(req))));
export const setPermission = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.setPermission(req.params.id, req.body.permission, req.body.granted, actor(req))));
export const setRoleMfa = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.setRoleMfa(req.params.id, req.body.enabled, req.body.exception ?? {}, actor(req))));
export const users = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.listUsers()));
export const createUser = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.createUser(req.body, actor(req)), undefined, 201));
export const deactivateUser = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.deactivateUser(req.params.id, actor(req))));
export const forcePasswordReset = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.forcePasswordReset(req.params.id, actor(req))));
export const revokeSessions = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.revokeSessions(req.params.id, actor(req))));
export const breakGlass = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.breakGlass(req.body.justification, actor(req))));
export const sessions = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.listSessions()));
export const config = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.getSecurityConfig()));
export const passwordPolicy = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.updatePasswordPolicy(req.body, actor(req))));
export const sso = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.updateSsoConfig(req.body, actor(req))));
export const sessionPolicy = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.updateSessionPolicy(req.body, actor(req))));
export const ipRestriction = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.updateIpRestriction(req.params.id, req.body.allowedCidrs, req.body.enabled, actor(req))));
export const kms = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.getKmsConfig()));
export const rotateKms = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.rotateKmsKey(actor(req))));
export const backups = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.backupJobs()));
export const restores = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.restoreRequests()));
export const requestRestore = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.requestRestore(req.body.reason, actor(req)), undefined, 201));
export const approveRestore = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.approveRestore(req.params.id, req.body.approverName ?? "", actor(req))));
export const executeRestore = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await security.executeRestore(req.params.id, actor(req))));
export const audit = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.auditLog()));
export const verifyAudit = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await security.verifyAuditChain()));
