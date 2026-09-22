import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { writeAuditLog } from "../../services/audit.service";

type JsonObject = Record<string, any>;
type Approval = { by: string; userId: string; at: string };
type RestoreRequest = {
  id: string;
  reason: string;
  requestedBy: string;
  requestedByUserId: string;
  approvals: Approval[];
  status: string;
  requestedAt: string;
  executedAt: string | null;
  executedBy: string | null;
};

const BUILT_IN_ROLES = new Set(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);
const MFA_REQUIRED_ROLES = new Set(["ADMIN", "HR"]);

const DEFAULT_SECURITY_CONFIG: JsonObject = {
  passwordPolicy: { minLength: 12, requireUpper: true, requireNumber: true, requireSymbol: true, expiryDays: 90 },
  ssoConfig: { enabled: false, provider: "Not configured", metadataUrl: "", lastSyncedAt: null },
  ipRestrictions: [{ id: "payroll-release", action: "Payroll Release", allowedCidrs: [], enabled: false }],
  sessionPolicy: { tokenLifetimeMinutes: 60, maxConcurrentSessions: 3 },
};
const DEFAULT_KMS_CONFIG: JsonObject = { provider: "Application encryption key", keyRotationDays: 90, lastRotatedAt: null };

async function readState<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.securityState.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? fallback;
}

async function saveState(key: string, value: unknown, actorUserId: string) {
  await prisma.securityState.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorUserId },
    update: { value: value as Prisma.InputJsonValue, updatedBy: actorUserId },
  });
}

async function actorName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
  if (!user) return "Unknown administrator";
  return user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;
}

async function audit(userId: string, action: "CREATE" | "UPDATE" | "DELETE", entityType: string, entityId: string | null, details: JsonObject) {
  await writeAuditLog({ actorUserId: userId, action, entityType, entityId, newValue: details });
}

async function roleSecurity() {
  return readState<Record<string, { mfaEnabled: boolean; mfaException: JsonObject | null }>>("role_security", {});
}

async function userSecurity() {
  return readState<Record<string, { forcePasswordResetPending?: boolean; isBreakGlass?: boolean }>>("user_security", {});
}

export async function listRoles() {
  const [roles, state] = await Promise.all([
    prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    roleSecurity(),
  ]);
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.rolePermissions.map((item) => item.permission.code).sort(),
    isCustom: !BUILT_IN_ROLES.has(role.name.toUpperCase()),
    assignedUsers: role._count.users,
    mfaRestricted: MFA_REQUIRED_ROLES.has(role.name.toUpperCase()),
    mfaEnabled: state[role.id]?.mfaEnabled ?? MFA_REQUIRED_ROLES.has(role.name.toUpperCase()),
    mfaException: state[role.id]?.mfaException ?? null,
  }));
}

export async function permissionCatalog() {
  return (await prisma.permission.findMany({ select: { code: true }, orderBy: { code: "asc" } })).map((item) => item.code);
}

export async function createRole(name: string, userId: string) {
  const normalized = name.trim();
  if (BUILT_IN_ROLES.has(normalized.toUpperCase())) throw AppError.conflict("A built-in role with this name already exists");
  const role = await prisma.role.create({ data: { name: normalized, description: "Custom security role" } });
  await audit(userId, "CREATE", "Role", role.id, { name: role.name, permissions: [] });
  return { id: role.id, name: role.name, permissions: [], isCustom: true, assignedUsers: 0, mfaRestricted: false, mfaEnabled: false, mfaException: null };
}

export async function deleteRole(roleId: string, userId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (!role) throw AppError.notFound("Role not found");
  if (BUILT_IN_ROLES.has(role.name.toUpperCase())) throw AppError.badRequest("Built-in roles cannot be deleted");
  if (role._count.users > 0) throw AppError.conflict(`Cannot delete — ${role._count.users} user(s) are still assigned this role. Reassign them first.`);
  await prisma.role.delete({ where: { id: roleId } });
  await audit(userId, "DELETE", "Role", roleId, { name: role.name });
  return { deleted: true };
}

export async function setPermission(roleId: string, code: string, granted: boolean, userId: string) {
  const [role, permission] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.permission.findUnique({ where: { code } }),
  ]);
  if (!role) throw AppError.notFound("Role not found");
  if (!permission) throw AppError.badRequest("Unknown permission code");
  if (granted) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId, permissionId: permission.id } }, create: { roleId, permissionId: permission.id }, update: {} });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: permission.id } });
  }
  await audit(userId, "UPDATE", "Role", roleId, { permission: code, granted });
  return (await listRoles()).find((item) => item.id === roleId)!;
}

export async function setRoleMfa(roleId: string, enabled: boolean, exception: JsonObject, userId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw AppError.notFound("Role not found");
  const restricted = MFA_REQUIRED_ROLES.has(role.name.toUpperCase());
  if (restricted && !enabled && (!exception?.reason?.trim() || !exception?.approvedBy?.trim())) {
    throw AppError.badRequest("Disabling MFA for this role requires a documented reason and approver");
  }
  const state = await roleSecurity();
  state[roleId] = {
    mfaEnabled: enabled,
    mfaException: enabled ? null : { reason: exception.reason.trim(), approvedBy: exception.approvedBy.trim(), loggedAt: new Date().toISOString() },
  };
  await saveState("role_security", state, userId);
  await audit(userId, "UPDATE", "Role", roleId, { mfaEnabled: enabled, exception: state[roleId].mfaException });
  return (await listRoles()).find((item) => item.id === roleId)!;
}

export async function listUsers() {
  const [users, state, names] = await Promise.all([
    prisma.user.findMany({ include: { role: true, employee: true }, orderBy: { createdAt: "desc" } }),
    userSecurity(),
    readState<Record<string, string>>("user_display_names", {}),
  ]);
  const roleState = await roleSecurity();
  return users.map((user) => ({
    id: user.id,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : names[user.id] || user.email,
    email: user.email,
    roleIds: [user.roleId],
    status: user.isActive ? "Active" : state[user.id]?.isBreakGlass ? "Disabled — Emergency Use Only" : "Deactivated",
    mfaEnabled: roleState[user.roleId]?.mfaEnabled ?? MFA_REQUIRED_ROLES.has(user.role.name.toUpperCase()),
    isBreakGlass: Boolean(state[user.id]?.isBreakGlass),
    lastLogin: user.lastLogin,
    forcePasswordResetPending: Boolean(state[user.id]?.forcePasswordResetPending),
    passwordHashPlaceholder: "•••• (bcrypt, salted)",
  }));
}

export async function createUser(input: { name: string; email: string; roleId: string }, actorUserId: string) {
  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) throw AppError.badRequest("Role not found");
  const temporaryPassword = randomBytes(24).toString("base64url");
  const user = await prisma.user.create({ data: { email: input.email.trim().toLowerCase(), passwordHash: await hashPassword(temporaryPassword), roleId: role.id } });
  const [state, names] = await Promise.all([userSecurity(), readState<Record<string, string>>("user_display_names", {})]);
  state[user.id] = { forcePasswordResetPending: true, isBreakGlass: false };
  names[user.id] = input.name.trim();
  await Promise.all([saveState("user_security", state, actorUserId), saveState("user_display_names", names, actorUserId)]);
  await audit(actorUserId, "CREATE", "User", user.id, { email: user.email, role: role.name, activationRequired: true });
  return (await listUsers()).find((item) => item.id === user.id)!;
}

export async function deactivateUser(userId: string, actorUserId: string) {
  if (userId === actorUserId) throw AppError.badRequest("You cannot deactivate your own account");
  const user = await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actorUserId, "UPDATE", "User", userId, { deactivated: true, sessionsRevoked: true });
  return (await listUsers()).find((item) => item.id === user.id)!;
}

export async function forcePasswordReset(userId: string, actorUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  const state = await userSecurity();
  state[userId] = { ...state[userId], forcePasswordResetPending: true };
  await saveState("user_security", state, actorUserId);
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actorUserId, "UPDATE", "User", userId, { forcePasswordResetPending: true, sessionsRevoked: true });
  return (await listUsers()).find((item) => item.id === userId)!;
}

export async function revokeSessions(userId: string, actorUserId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actorUserId, "UPDATE", "User", userId, { sessionsRevoked: true });
  return { revoked: true };
}

export async function breakGlass(justification: string, actorUserId: string) {
  if (justification.trim().length < 10) throw AppError.badRequest("A detailed justification of at least 10 characters is required");
  const timestamp = new Date().toISOString();
  const details = justification.trim();
  await audit(actorUserId, "UPDATE", "SecurityEmergency", null, { severity: "critical", justification: details, alertTriggered: true, timestamp });
  return { alertTriggered: true, entry: { action: "Break-glass access used", severity: "critical", details, timestamp } };
}

export async function listSessions() {
  const tokens = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { include: { employee: true } } },
    orderBy: { createdAt: "desc" },
  });
  return tokens.map((token) => ({ id: token.id, userId: token.userId, device: "Authenticated refresh session", ip: "Not retained", startedAt: token.createdAt, lastActiveAt: token.createdAt, expiresAt: token.expiresAt }));
}

export const getSecurityConfig = () => readState("security_config", DEFAULT_SECURITY_CONFIG);

export async function updatePasswordPolicy(patch: JsonObject, userId: string) {
  const config = await getSecurityConfig();
  config.passwordPolicy = { ...config.passwordPolicy, ...patch };
  await saveState("security_config", config, userId);
  await audit(userId, "UPDATE", "SecurityConfig", null, { section: "passwordPolicy", patch });
  return config.passwordPolicy;
}

export async function updateSsoConfig(patch: JsonObject, userId: string) {
  const config = await getSecurityConfig();
  config.ssoConfig = { ...config.ssoConfig, ...patch, lastSyncedAt: new Date().toISOString() };
  await saveState("security_config", config, userId);
  await audit(userId, "UPDATE", "SecurityConfig", null, { section: "ssoConfig", enabled: config.ssoConfig.enabled, provider: config.ssoConfig.provider });
  return config.ssoConfig;
}

export async function updateSessionPolicy(patch: JsonObject, userId: string) {
  const config = await getSecurityConfig();
  config.sessionPolicy = { ...config.sessionPolicy, ...patch };
  await saveState("security_config", config, userId);
  await audit(userId, "UPDATE", "SecurityConfig", null, { section: "sessionPolicy", patch });
  return config.sessionPolicy;
}

export async function updateIpRestriction(id: string, allowedCidrs: string[], enabled: boolean, userId: string) {
  const cidrPattern = /^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (enabled && allowedCidrs.some((cidr) => !cidrPattern.test(cidr))) throw AppError.badRequest("Every IP restriction must be a valid CIDR range");
  const config = await getSecurityConfig();
  const index = config.ipRestrictions.findIndex((item: JsonObject) => item.id === id);
  if (index < 0) throw AppError.notFound("IP restriction not found");
  config.ipRestrictions[index] = { ...config.ipRestrictions[index], allowedCidrs, enabled };
  await saveState("security_config", config, userId);
  await audit(userId, "UPDATE", "SecurityConfig", null, { section: "ipRestriction", id, allowedCidrs, enabled });
  return config.ipRestrictions[index];
}

export const getKmsConfig = () => readState("kms_config", DEFAULT_KMS_CONFIG);

export async function rotateKmsKey(userId: string) {
  const config = await getKmsConfig();
  config.lastRotatedAt = new Date().toISOString();
  await saveState("kms_config", config, userId);
  await audit(userId, "UPDATE", "EncryptionKey", null, { rotatedAt: config.lastRotatedAt, provider: config.provider });
  return config;
}

export async function backupJobs() {
  return readState<JsonObject[]>("backup_jobs", []);
}

export async function restoreRequests() {
  return readState<RestoreRequest[]>("restore_requests", []);
}

export async function requestRestore(reason: string, userId: string) {
  const requests = await restoreRequests();
  const request: RestoreRequest = { id: randomBytes(12).toString("hex"), reason: reason.trim(), requestedBy: await actorName(userId), requestedByUserId: userId, approvals: [], status: "Pending Approval (0/2)", requestedAt: new Date().toISOString(), executedAt: null, executedBy: null };
  requests.unshift(request);
  await saveState("restore_requests", requests, userId);
  await audit(userId, "CREATE", "RestoreRequest", null, { requestId: request.id, reason: request.reason });
  return request;
}

export async function approveRestore(id: string, _approverName: string, userId: string) {
  const requests = await restoreRequests();
  const request = requests.find((item) => item.id === id);
  if (!request) throw AppError.notFound("Restore request not found");
  if (request.requestedByUserId === userId) throw AppError.badRequest("The requester cannot approve their own restore request");
  if (request.approvals.some((item) => item.userId === userId)) throw AppError.conflict("You have already approved this request");
  if (!request.status.startsWith("Pending")) throw AppError.conflict("This restore request is no longer pending approval");
  request.approvals.push({ by: await actorName(userId), userId, at: new Date().toISOString() });
  request.status = request.approvals.length >= 2 ? "Approved — Ready to Execute" : `Pending Approval (${request.approvals.length}/2)`;
  await saveState("restore_requests", requests, userId);
  await audit(userId, "UPDATE", "RestoreRequest", null, { requestId: id, approvals: request.approvals.length });
  return request;
}

export async function executeRestore(id: string, userId: string) {
  const requests = await restoreRequests();
  const request = requests.find((item) => item.id === id);
  if (!request) throw AppError.notFound("Restore request not found");
  if (request.status !== "Approved — Ready to Execute") throw AppError.conflict("Restore requires two distinct approvals before execution");
  request.status = "Restored";
  request.executedAt = new Date().toISOString();
  request.executedBy = await actorName(userId);
  await saveState("restore_requests", requests, userId);
  await audit(userId, "UPDATE", "RestoreRequest", null, { requestId: id, executed: true, severity: "critical" });
  return request;
}

function auditDetails(entry: { newValue: unknown; oldValue: unknown }) {
  const value = (entry.newValue || entry.oldValue || {}) as JsonObject;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export async function auditLog() {
  const entries = await prisma.auditLog.findMany({ include: { actor: { include: { employee: true } } }, orderBy: { createdAt: "asc" }, take: 500 });
  let previous = "0".repeat(64);
  const chained = entries.map((entry) => {
    const actor = entry.actor?.employee ? `${entry.actor.employee.firstName} ${entry.actor.employee.lastName}` : entry.actor?.email || "System";
    const details = auditDetails(entry);
    const core = `${previous}|${entry.id}|${entry.createdAt.toISOString()}|${actor}|${entry.action}|${entry.entityType}|${details}`;
    const hash = createHash("sha256").update(core).digest("hex");
    const result = { id: entry.id, timestamp: entry.createdAt, actor, action: entry.action, category: entry.entityType, details, severity: (entry.newValue as JsonObject | null)?.severity || "info", prevHash: previous, hash };
    previous = hash;
    return result;
  });
  return chained.reverse();
}

export async function verifyAuditChain() {
  const entries = (await auditLog()).reverse();
  let previous = "0".repeat(64);
  for (const entry of entries) {
    if (entry.prevHash !== previous) return { valid: false, brokenAtId: entry.id };
    previous = entry.hash;
  }
  return { valid: true, brokenAtId: null, entriesChecked: entries.length };
}
