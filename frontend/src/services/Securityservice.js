/**
 * Security service — Module 25
 * Mirrors travelService/taskService: async functions resolving to { data }.
 */

import {
  _getRoles,
  _grantPermission,
  _revokePermission,
  _deleteRole,
  _createCustomRole,
  _setRoleMfa,
  _getUsers,
  _createUser,
  _deactivateUser,
  _forcePasswordReset,
  _revokeAllSessions,
  _useBreakGlass,
  _getSessions,
  _getSecurityConfig,
  _updatePasswordPolicy,
  _updateSsoConfig,
  _updateSessionPolicy,
  _updateIpRestriction,
  _getKmsConfig,
  _rotateKmsKey,
  _getBackupJobs,
  _getRestoreRequests,
  _requestRestore,
  _approveRestore,
  _executeRestore,
  _recordFailedLogin,
  _getAuditLog,
  _verifyAuditChain,
} from "../mock/security";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

/* Roles & permissions */
export function getRoles() {
  return resolve(_getRoles());
}
export function grantPermission(roleId, permission, by) {
  return resolve(_grantPermission(roleId, permission, by));
}
export function revokePermission(roleId, permission, by) {
  return resolve(_revokePermission(roleId, permission, by));
}
// 25.6: returns { error, assignedUsers } if the role is still in use.
export function deleteRole(roleId, by) {
  return resolve(_deleteRole(roleId, by));
}
export function createCustomRole(name, by) {
  return resolve(_createCustomRole(name, by));
}
// 25.6: returns { error } if disabling MFA on a restricted role without a
// documented reason + approver.
export function setRoleMfa(roleId, enabled, exception, by) {
  return resolve(_setRoleMfa(roleId, enabled, exception, by));
}

/* Users */
export function getUsers() {
  return resolve(_getUsers());
}
export function createUser(user, by) {
  return resolve(_createUser(user, by));
}
export function deactivateUser(userId, by) {
  return resolve(_deactivateUser(userId, by));
}
export function forcePasswordReset(userId, by) {
  return resolve(_forcePasswordReset(userId, by));
}
export function revokeAllSessions(userId, by) {
  return resolve(_revokeAllSessions(userId, by));
}
// 25.8: always logged + returns alertTriggered: true so the UI can surface
// a visible alert, never a silent success.
export function useBreakGlass(justification, by) {
  return resolve(_useBreakGlass(justification, by));
}

/* Sessions */
export function getSessions() {
  return resolve(_getSessions());
}

/* Security configuration */
export function getSecurityConfig() {
  return resolve(_getSecurityConfig());
}
export function updatePasswordPolicy(policy, by) {
  return resolve(_updatePasswordPolicy(policy, by));
}
export function updateSsoConfig(config, by) {
  return resolve(_updateSsoConfig(config, by));
}
export function updateSessionPolicy(policy, by) {
  return resolve(_updateSessionPolicy(policy, by));
}
export function updateIpRestriction(id, allowedCidrs, enabled, by) {
  return resolve(_updateIpRestriction(id, allowedCidrs, enabled, by));
}

/* Encryption & KMS */
export function getKmsConfig() {
  return resolve(_getKmsConfig());
}
export function rotateKmsKey(by) {
  return resolve(_rotateKmsKey(by));
}

/* Backup & Disaster Recovery */
export function getBackupJobs() {
  return resolve(_getBackupJobs());
}
export function getRestoreRequests() {
  return resolve(_getRestoreRequests());
}
export function requestRestore(reason, by) {
  return resolve(_requestRestore(reason, by));
}
// 25.5.7: two-person approval — returns { error } on invalid/duplicate/self approval.
export function approveRestore(requestId, approverName, by) {
  return resolve(_approveRestore(requestId, approverName, by));
}
export function executeRestore(requestId, by) {
  return resolve(_executeRestore(requestId, by));
}

/* Suspicious activity (demo trigger) */
export function recordFailedLogin(email) {
  return resolve(_recordFailedLogin(email));
}

/* Audit log */
export function getAuditLog() {
  return resolve(_getAuditLog());
}
export function verifyAuditChain() {
  return resolve(_verifyAuditChain());
}