/**
 * Organization Management service — Module 20
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import {
  _getCompany,
  _updateCompany,
  _getBusinessUnits,
  _addBusinessUnit,
  _getDepartments,
  _addDepartment,
  _getLocations,
  _addLocation,
  _deactivateLocation,
  _getCostCenters,
  _addCostCenter,
  _getDesignations,
  _addDesignation,
  _getGrades,
  _addGrade,
  _getRoster,
  _updateReportingManager,
  _bulkReassignDepartment,
  _getAuditLog,
} from "../mock/orgManagement";

const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

export function getCompany() { return resolve(_getCompany()); }
export function updateCompany(patch) { return resolve(_updateCompany(patch)); }

export function getBusinessUnits() { return resolve(_getBusinessUnits()); }
// Hierarchy integrity (20.6): a Department must belong to exactly one
// Business Unit, which must belong to exactly one Company — enforced by the
// shape of the data itself (single companyId/businessUnitId field), not a
// UI convention.
export function addBusinessUnit(bu) { return resolve(_addBusinessUnit(bu)); }

export function getDepartments() { return resolve(_getDepartments()); }
export function addDepartment(dept) { return resolve(_addDepartment(dept)); }

export function getLocations() { return resolve(_getLocations()); }
export function addLocation(loc) { return resolve(_addLocation(loc)); }
// Blocked (not just warned) while employeeCount > 0 — returns { error }.
export function deactivateLocation(id) { return resolve(_deactivateLocation(id)); }

export function getCostCenters() { return resolve(_getCostCenters()); }
export function addCostCenter(cc) { return resolve(_addCostCenter(cc)); }

export function getDesignations() { return resolve(_getDesignations()); }
export function addDesignation(d) { return resolve(_addDesignation(d)); }

export function getGrades() { return resolve(_getGrades()); }
export function addGrade(g) { return resolve(_addGrade(g)); }

export function getRoster() { return resolve(_getRoster()); }
// Circular-reporting detection runs on every change; returns { error } with
// a specific message identifying the cycle instead of silently applying it.
export function updateReportingManager(employeeId, newManagerId, actor) {
  return resolve(_updateReportingManager(employeeId, newManagerId, actor));
}
// Per-record audit trail, not a single summary line — see _getAuditLog.
export function bulkReassignDepartment(employeeIds, newDepartmentId, actor) {
  return resolve(_bulkReassignDepartment(employeeIds, newDepartmentId, actor));
}
export function getAuditLog() { return resolve(_getAuditLog()); }