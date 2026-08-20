/**
 * Mock data — Security & Administration 
 *
 * This is a frontend-only mock: there is no real authentication backend,
 * no real password hashing, and no real KMS/SSO integration here. Fields
 * like `passwordHashPlaceholder` exist only so the UI never has a literal
 * password to display — they are not a cryptographic implementation.
 */

export const PERMISSION_CATALOG = [
  "users.manage",
  "roles.manage",
  "security.config",
  "payroll.release",
  "payroll.view",
  "employee.pii.view",
  "employee.pii.edit",
  "recruitment.manage",
  "lms.manage",
  "assets.manage",
  "tasks.manage",
  "travel.approve",
  "reports.view",
  "audit.view",
];

// 25.6: MFA cannot be disabled for these roles without a documented,
// logged exception — this list is the hard organizational guardrail.
export const MFA_RESTRICTED_ROLE_IDS = ["role-admin", "role-hr-admin", "role-finance"];

export const userStatusMeta = {
  Active: { color: "#16a34a", bg: "#f0fdf4" },
  Deactivated: { color: "#64748b", bg: "#f1f5f9" },
  "Disabled — Emergency Use Only": { color: "#dc2626", bg: "#fef2f2" },
};

export const severityMeta = {
  info: { color: "#0284c7", bg: "#f0f9ff" },
  warning: { color: "#d97706", bg: "#fffbeb" },
  critical: { color: "#dc2626", bg: "#fef2f2" },
};

let roles = [
  { id: "role-admin", name: "Admin", permissions: [...PERMISSION_CATALOG], isCustom: false, mfaEnabled: true, mfaException: null },
  { id: "role-hr-admin", name: "HR-Admin", permissions: ["employee.pii.view", "employee.pii.edit", "recruitment.manage", "lms.manage", "assets.manage", "reports.view"], isCustom: false, mfaEnabled: true, mfaException: null },
  { id: "role-finance", name: "Finance", permissions: ["payroll.release", "payroll.view", "travel.approve", "reports.view"], isCustom: false, mfaEnabled: true, mfaException: null },
  { id: "role-employee", name: "Employee", permissions: ["tasks.manage", "reports.view"], isCustom: false, mfaEnabled: false, mfaException: null },
  // 25.5.2: every new custom role starts with zero permissions — this one
  // has had exactly one explicit, logged grant since creation (see seeded
  // audit log below), demonstrating the pattern rather than pre-populating it.
  { id: "role-regional-hr-ro", name: "Regional HR — Read Only", permissions: ["reports.view"], isCustom: true, mfaEnabled: false, mfaException: null },
  { id: "role-auditor", name: "Auditor", permissions: ["audit.view", "reports.view"], isCustom: false, mfaEnabled: true, mfaException: null },
];

let users = [
  { id: "EMP001", name: "Matsya Singh", email: "matsya.singh@company.com", roleIds: ["role-admin"], status: "Active", mfaEnabled: true, isBreakGlass: false, lastLogin: "2026-08-01T08:15:00", forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted)" },
  { id: "EMP002", name: "Alice Quinn", email: "alice.quinn@company.com", roleIds: ["role-hr-admin"], status: "Active", mfaEnabled: true, isBreakGlass: false, lastLogin: "2026-07-31T17:40:00", forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted)" },
  { id: "EMP004", name: "Gary Chen", email: "gary.chen@company.com", roleIds: ["role-employee"], status: "Active", mfaEnabled: false, isBreakGlass: false, lastLogin: "2026-07-30T09:05:00", forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted)" },
  { id: "SYS-AUD01", name: "Priya Rao (External Auditor)", email: "priya.rao@auditfirm.example", roleIds: ["role-auditor"], status: "Active", mfaEnabled: true, isBreakGlass: false, lastLogin: "2026-07-28T11:00:00", forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted)" },
  // 25.8: break-glass emergency account — disabled by default, only ever
  // used if SSO/IdP is unreachable, and its use is itself always logged
  // and alerted on so it never becomes a silent standing backdoor.
  { id: "SYS-BREAKGLASS", name: "break-glass-admin", email: "breakglass@company.com", roleIds: ["role-admin"], status: "Disabled — Emergency Use Only", mfaEnabled: false, isBreakGlass: true, lastLogin: null, forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted, rotated after each use)" },
];

let sessions = [
  { id: "s1", userId: "EMP001", device: "Chrome · macOS", ip: "10.20.4.12", startedAt: "2026-08-01T08:15:00", lastActiveAt: "2026-08-01T09:50:00" },
  { id: "s2", userId: "EMP002", device: "Safari · iOS", ip: "10.20.9.44", startedAt: "2026-07-31T17:40:00", lastActiveAt: "2026-08-01T07:10:00" },
];

let securityConfig = {
  passwordPolicy: { minLength: 12, requireUpper: true, requireNumber: true, requireSymbol: true, expiryDays: 90 },
  ssoConfig: { enabled: true, provider: "Okta (SAML)", metadataUrl: "https://idp.example.com/metadata", lastSyncedAt: "2026-07-20" },
  ipRestrictions: [
    { id: "ipr1", action: "Payroll Release", allowedCidrs: ["10.20.0.0/16"], enabled: true },
  ],
  sessionPolicy: { tokenLifetimeMinutes: 60, maxConcurrentSessions: 3 },
};

let kmsConfig = { provider: "AWS KMS", keyRotationDays: 90, lastRotatedAt: "2026-05-15" };

let backupJobs = [
  { id: "bk1", startedAt: "2026-07-31T02:00:00", completedAt: "2026-07-31T02:41:00", status: "Completed", sizeMB: 4820, encrypted: true },
  { id: "bk2", startedAt: "2026-07-30T02:00:00", completedAt: "2026-07-30T02:38:00", status: "Completed", sizeMB: 4790, encrypted: true },
  { id: "bk3", startedAt: "2026-07-29T02:00:00", completedAt: null, status: "Failed — retried automatically", sizeMB: null, encrypted: true },
];

// 25.5.7: restore is a two-person, logged action given its potential to
// overwrite live data — status progresses only once two *distinct*
// approvers have signed off.
let restoreRequests = [
  {
    id: "rr1", reason: "Quarterly DR drill restore to sandbox.", requestedBy: "Matsya Singh",
    approvals: [{ by: "Alice Quinn", at: "2026-06-01T10:00:00" }, { by: "Priya Rao (External Auditor)", at: "2026-06-01T11:30:00" }],
    status: "Restored", requestedAt: "2026-05-30T09:00:00", executedAt: "2026-06-01T12:00:00", executedBy: "Matsya Singh",
  },
];

const _failedLoginCounters = {}; // email -> { count, alerted }

/* ---------------- Audit log (hash-chained, append-only) ---------------- */

// NOTE: this is a lightweight, illustrative stand-in for a real cryptographic
// hash (e.g. SHA-256) chain. It demonstrates the tamper-evidence *pattern* —
// each entry commits to the previous entry's hash — but is not itself a
// security-grade hash function.
function _simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

let auditLog = [];

// 25.5.8: every action taken within this module is, without exception,
// itself audit-logged. This is the single append function every mutating
// function below routes through.
function _appendAuditLog(actor, action, category, details, severity = "info") {
  const prevHash = auditLog.length > 0 ? auditLog[auditLog.length - 1].hash : "00000000";
  const timestamp = new Date().toISOString();
  const core = `${prevHash}|${timestamp}|${actor}|${action}|${category}|${details}`;
  const entry = { id: `al-${Date.now()}-${auditLog.length}`, timestamp, actor, action, category, details, severity, prevHash, hash: _simpleHash(core) };
  auditLog.push(entry);
  return entry;
}

// Seed history, appended in order so the hash chain is genuinely valid from
// the start (useful for demonstrating _verifyAuditChain below).
_appendAuditLog("Matsya Singh", "Role permission granted", "RBAC", "Granted 'reports.view' to Regional HR — Read Only (new custom role, zero-permission start).");
_appendAuditLog("Matsya Singh", "SSO configured", "Authentication", "Configured Okta (SAML) as identity provider.");
_appendAuditLog("Matsya Singh", "Password policy updated", "Authentication", "Set minimum length to 12, enabled symbol requirement.");
_appendAuditLog("Alice Quinn", "Restore approved", "Backup/DR", "Approved restore request rr1 (1 of 2).");
_appendAuditLog("Priya Rao (External Auditor)", "Restore approved", "Backup/DR", "Approved restore request rr1 (2 of 2) — threshold met.");
_appendAuditLog("Matsya Singh", "Restore executed", "Backup/DR", "Executed restore request rr1 to sandbox environment.");

export function _getAuditLog() {
  return [...auditLog].reverse();
}

// 25.10: verified by a dedicated test suite in the real system — here, a
// function any caller (including an Auditor-facing "Verify Integrity"
// button) can run on demand.
export function _verifyAuditChain() {
  let prevHash = "00000000";
  for (const entry of auditLog) {
    const core = `${prevHash}|${entry.timestamp}|${entry.actor}|${entry.action}|${entry.category}|${entry.details}`;
    if (_simpleHash(core) !== entry.hash) {
      return { valid: false, brokenAtId: entry.id };
    }
    prevHash = entry.hash;
  }
  return { valid: true, brokenAtId: null };
}

/* ---------------- Roles & Permissions ---------------- */

export function _getRoles() {
  return roles;
}

export function _grantPermission(roleId, permission, by) {
  const role = roles.find((r) => r.id === roleId);
  if (!role) return { error: "Role not found." };
  if (role.permissions.includes(permission)) return { error: "Role already has this permission." };
  roles = roles.map((r) => (r.id === roleId ? { ...r, permissions: [...r.permissions, permission] } : r));
  _appendAuditLog(by, "Permission granted", "RBAC", `Granted '${permission}' to ${role.name}.`);
  return { role: roles.find((r) => r.id === roleId) };
}

export function _revokePermission(roleId, permission, by) {
  const role = roles.find((r) => r.id === roleId);
  if (!role) return { error: "Role not found." };
  roles = roles.map((r) => (r.id === roleId ? { ...r, permissions: r.permissions.filter((p) => p !== permission) } : r));
  _appendAuditLog(by, "Permission revoked", "RBAC", `Revoked '${permission}' from ${role.name}.`);
  return { role: roles.find((r) => r.id === roleId) };
}

// 25.6: a role cannot be deleted while users are actively assigned to it.
export function _deleteRole(roleId, by) {
  const role = roles.find((r) => r.id === roleId);
  if (!role) return { error: "Role not found." };
  const assignedUsers = users.filter((u) => u.roleIds.includes(roleId));
  if (assignedUsers.length > 0) {
    return { error: `Cannot delete — ${assignedUsers.length} user(s) are still assigned this role. Reassign them first.`, assignedUsers };
  }
  roles = roles.filter((r) => r.id !== roleId);
  _appendAuditLog(by, "Role deleted", "RBAC", `Deleted role ${role.name}.`);
  return { deleted: true };
}

export function _createCustomRole(name, by) {
  // Every new custom role starts with zero permissions, full stop.
  const role = { id: `role-custom-${Date.now()}`, name, permissions: [], isCustom: true, mfaEnabled: false, mfaException: null };
  roles = [...roles, role];
  _appendAuditLog(by, "Custom role created", "RBAC", `Created custom role '${name}' with zero starting permissions.`);
  return role;
}

// 25.6: MFA cannot be disabled for restricted roles without a documented,
// logged exception process.
export function _setRoleMfa(roleId, enabled, { reason = "", approvedBy = "" } = {}, by) {
  const role = roles.find((r) => r.id === roleId);
  if (!role) return { error: "Role not found." };

  const isRestricted = MFA_RESTRICTED_ROLE_IDS.includes(roleId);
  if (isRestricted && !enabled) {
    if (!reason.trim() || !approvedBy.trim()) {
      return { error: "Disabling MFA for this role requires a documented reason and an approver — this cannot be a simple toggle." };
    }
    roles = roles.map((r) => (r.id === roleId ? { ...r, mfaEnabled: false, mfaException: { reason: reason.trim(), approvedBy: approvedBy.trim(), loggedAt: new Date().toISOString() } } : r));
    _appendAuditLog(by, "MFA exception granted", "Authentication", `MFA disabled for restricted role ${role.name} — reason: "${reason.trim()}", approved by ${approvedBy.trim()}.`, "warning");
    return { role: roles.find((r) => r.id === roleId) };
  }

  roles = roles.map((r) => (r.id === roleId ? { ...r, mfaEnabled: enabled, mfaException: enabled ? null : r.mfaException } : r));
  _appendAuditLog(by, enabled ? "MFA enabled" : "MFA disabled", "Authentication", `MFA ${enabled ? "enabled" : "disabled"} for role ${role.name}.`);
  return { role: roles.find((r) => r.id === roleId) };
}

/* ---------------- Users ---------------- */

export function _getUsers() {
  return users;
}

export function _createUser({ name, email, roleIds }, by) {
  const user = { id: `USR-${Date.now()}`, name, email, roleIds, status: "Active", mfaEnabled: false, isBreakGlass: false, lastLogin: null, forcePasswordResetPending: false, passwordHashPlaceholder: "•••• (bcrypt, salted)" };
  users = [user, ...users];
  _appendAuditLog(by, "User account created", "User Management", `Created account for ${name} (${email}).`);
  return user;
}

export function _deactivateUser(userId, by) {
  const user = users.find((u) => u.id === userId);
  if (!user) return { error: "User not found." };
  users = users.map((u) => (u.id === userId ? { ...u, status: "Deactivated" } : u));
  sessions = sessions.filter((s) => s.userId !== userId);
  _appendAuditLog(by, "User account deactivated", "User Management", `Deactivated ${user.name} — all active sessions revoked.`);
  return { user: users.find((u) => u.id === userId) };
}

export function _forcePasswordReset(userId, by) {
  const user = users.find((u) => u.id === userId);
  if (!user) return { error: "User not found." };
  users = users.map((u) => (u.id === userId ? { ...u, forcePasswordResetPending: true } : u));
  _appendAuditLog(by, "Password reset forced", "User Management", `Forced password reset for ${user.name}.`, "warning");
  return { user: users.find((u) => u.id === userId) };
}

export function _revokeAllSessions(userId, by) {
  const user = users.find((u) => u.id === userId);
  if (!user) return { error: "User not found." };
  sessions = sessions.filter((s) => s.userId !== userId);
  _appendAuditLog(by, "Sessions revoked", "User Management", `Revoked all active sessions for ${user.name}.`, "warning");
  return { sessions: [...sessions] };
}

// 25.8: break-glass access — always logged and alerted on when used, so it
// is never a silent standing backdoor.
export function _useBreakGlass(justification, by) {
  const user = users.find((u) => u.isBreakGlass);
  if (!user) return { error: "No break-glass account configured." };
  if (!justification.trim()) return { error: "A documented justification is required to use break-glass access." };
  users = users.map((u) => (u.isBreakGlass ? { ...u, lastLogin: new Date().toISOString() } : u));
  const entry = _appendAuditLog(by, "Break-glass access used", "Emergency Access", `Break-glass login used — justification: "${justification.trim()}".`, "critical");
  return { entry, alertTriggered: true };
}

/* ---------------- Sessions ---------------- */

export function _getSessions() {
  return sessions;
}

/* ---------------- Security configuration ---------------- */

export function _getSecurityConfig() {
  return securityConfig;
}

export function _updatePasswordPolicy(policy, by) {
  securityConfig = { ...securityConfig, passwordPolicy: { ...securityConfig.passwordPolicy, ...policy } };
  _appendAuditLog(by, "Password policy updated", "Authentication", `Updated password policy: ${JSON.stringify(policy)}.`);
  return securityConfig.passwordPolicy;
}

export function _updateSsoConfig(config, by) {
  securityConfig = { ...securityConfig, ssoConfig: { ...securityConfig.ssoConfig, ...config } };
  _appendAuditLog(by, "SSO configuration updated", "Authentication", `Updated SSO config: ${JSON.stringify(config)}.`);
  return securityConfig.ssoConfig;
}

export function _updateSessionPolicy(policy, by) {
  securityConfig = { ...securityConfig, sessionPolicy: { ...securityConfig.sessionPolicy, ...policy } };
  _appendAuditLog(by, "Session policy updated", "Authentication", `Updated session policy: ${JSON.stringify(policy)}.`);
  return securityConfig.sessionPolicy;
}

export function _updateIpRestriction(id, allowedCidrs, enabled, by) {
  securityConfig = {
    ...securityConfig,
    ipRestrictions: securityConfig.ipRestrictions.map((r) => (r.id === id ? { ...r, allowedCidrs, enabled } : r)),
  };
  const restriction = securityConfig.ipRestrictions.find((r) => r.id === id);
  _appendAuditLog(by, "IP restriction updated", "Authentication", `Updated IP restriction for "${restriction.action}": ${enabled ? allowedCidrs.join(", ") : "disabled"}.`);
  return restriction;
}

/* ---------------- Encryption & Key Management ---------------- */

export function _getKmsConfig() {
  return kmsConfig;
}

export function _rotateKmsKey(by) {
  kmsConfig = { ...kmsConfig, lastRotatedAt: new Date().toISOString().slice(0, 10) };
  _appendAuditLog(by, "KMS key rotated", "Encryption", `Rotated encryption key via ${kmsConfig.provider}.`);
  return kmsConfig;
}

/* ---------------- Backup & Disaster Recovery ---------------- */

export function _getBackupJobs() {
  return backupJobs;
}

export function _getRestoreRequests() {
  return restoreRequests;
}

export function _requestRestore(reason, by) {
  const request = { id: `rr-${Date.now()}`, reason, requestedBy: by, approvals: [], status: "Pending Approval (0/2)", requestedAt: new Date().toISOString(), executedAt: null, executedBy: null };
  restoreRequests = [request, ...restoreRequests];
  _appendAuditLog(by, "Restore requested", "Backup/DR", `Requested restore — reason: "${reason}".`, "warning");
  return request;
}

// 25.5.7: two-person, logged action — requires two *distinct* approvers,
// neither of whom can be the original requester.
export function _approveRestore(requestId, approverName, by) {
  const request = restoreRequests.find((r) => r.id === requestId);
  if (!request) return { error: "Restore request not found." };
  if (request.status.startsWith("Approved") || request.status === "Restored") return { error: "This request has already cleared approval." };
  if (approverName === request.requestedBy) return { error: "The original requester cannot also approve their own restore request." };
  if (request.approvals.some((a) => a.by === approverName)) return { error: "This approver has already signed off." };

  const approvals = [...request.approvals, { by: approverName, at: new Date().toISOString() }];
  const status = approvals.length >= 2 ? "Approved — Ready to Execute" : `Pending Approval (${approvals.length}/2)`;
  restoreRequests = restoreRequests.map((r) => (r.id === requestId ? { ...r, approvals, status } : r));
  _appendAuditLog(by, "Restore approved", "Backup/DR", `${approverName} approved restore request ${requestId} (${approvals.length} of 2).`);
  return { request: restoreRequests.find((r) => r.id === requestId) };
}

export function _executeRestore(requestId, by) {
  const request = restoreRequests.find((r) => r.id === requestId);
  if (!request) return { error: "Restore request not found." };
  if (request.status !== "Approved — Ready to Execute") return { error: "Restore requires two-person approval before it can be executed." };

  const today = new Date().toISOString();
  restoreRequests = restoreRequests.map((r) => (r.id === requestId ? { ...r, status: "Restored", executedAt: today, executedBy: by } : r));
  _appendAuditLog(by, "Restore executed", "Backup/DR", `Executed restore request ${requestId}.`, "critical");
  return { request: restoreRequests.find((r) => r.id === requestId) };
}

/* ---------------- Suspicious activity detection ---------------- */

// 25.9: repeated failed logins should trigger a Security/Admin alert. Real
// login flow doesn't exist in this mock, so this is exposed as a function
// a demo "Simulate failed login" control can call directly.
export function _recordFailedLogin(email) {
  if (!_failedLoginCounters[email]) _failedLoginCounters[email] = { count: 0, alerted: false };
  _failedLoginCounters[email].count += 1;

  if (_failedLoginCounters[email].count >= 5 && !_failedLoginCounters[email].alerted) {
    _failedLoginCounters[email].alerted = true;
    const entry = _appendAuditLog("System", "Suspicious activity detected", "Security Alert", `5+ consecutive failed logins for ${email}.`, "critical");
    return { count: _failedLoginCounters[email].count, alertTriggered: true, entry };
  }
  return { count: _failedLoginCounters[email].count, alertTriggered: false };
}