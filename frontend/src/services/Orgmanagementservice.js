// /**
//  * Organization Management service — Module 20
//  * Mirrors leaveService/attendanceService: async functions resolving to { data }.
//  */

// import {
//   _getCompany,
//   _updateCompany,
//   _getBusinessUnits,
//   _addBusinessUnit,
//   _getDepartments,
//   _addDepartment,
//   _getLocations,
//   _addLocation,
//   _deactivateLocation,
//   _getCostCenters,
//   _addCostCenter,
//   _getDesignations,
//   _addDesignation,
//   _getGrades,
//   _addGrade,
//   _getRoster,
//   _updateReportingManager,
//   _bulkReassignDepartment,
//   _getAuditLog,
// } from "../mock/orgManagement";

// const resolve = (data, ms = 350) => new Promise((res) => setTimeout(() => res({ data }), ms));

// export function getCompany() { return resolve(_getCompany()); }
// export function updateCompany(patch) { return resolve(_updateCompany(patch)); }

// export function getBusinessUnits() { return resolve(_getBusinessUnits()); }
// // Hierarchy integrity (20.6): a Department must belong to exactly one
// // Business Unit, which must belong to exactly one Company — enforced by the
// // shape of the data itself (single companyId/businessUnitId field), not a
// // UI convention.
// export function addBusinessUnit(bu) { return resolve(_addBusinessUnit(bu)); }

// export function getDepartments() { return resolve(_getDepartments()); }
// export function addDepartment(dept) { return resolve(_addDepartment(dept)); }

// export function getLocations() { return resolve(_getLocations()); }
// export function addLocation(loc) { return resolve(_addLocation(loc)); }
// // Blocked (not just warned) while employeeCount > 0 — returns { error }.
// export function deactivateLocation(id) { return resolve(_deactivateLocation(id)); }

// export function getCostCenters() { return resolve(_getCostCenters()); }
// export function addCostCenter(cc) { return resolve(_addCostCenter(cc)); }

// export function getDesignations() { return resolve(_getDesignations()); }
// export function addDesignation(d) { return resolve(_addDesignation(d)); }

// export function getGrades() { return resolve(_getGrades()); }
// export function addGrade(g) { return resolve(_addGrade(g)); }

// export function getRoster() { return resolve(_getRoster()); }
// // Circular-reporting detection runs on every change; returns { error } with
// // a specific message identifying the cycle instead of silently applying it.
// export function updateReportingManager(employeeId, newManagerId, actor) {
//   return resolve(_updateReportingManager(employeeId, newManagerId, actor));
// }
// // Per-record audit trail, not a single summary line — see _getAuditLog.
// export function bulkReassignDepartment(employeeIds, newDepartmentId, actor) {
//   return resolve(_bulkReassignDepartment(employeeIds, newDepartmentId, actor));
// }
// export function getAuditLog() { return resolve(_getAuditLog()); }


/**
 * Organization Management service — Module 20
 * Talks to the real backend.
 *
 * Backend base URL:
 *   VITE_API_URL -> /api
 *
 * Backend routes:
 *   /organization/company
 *   /organization/business-units
 *   /organization/departments
 *   /organization/locations
 *   /organization/cost-centers
 *   /organization/designations
 *   /organization/grades
 *   /organization/roster
 *   /organization/employees/:employeeId/reporting-manager
 *   /organization/employees/bulk-reassign-department
 *   /organization/audit-log
 */

import api from "./api";

/* ========================================================================= */
/* COMPANY                                                                   */
/* ========================================================================= */

/**
 * GET /api/v1/organization/company
 */
export const getCompany = async () => {
  const res = await api.get("/organization/company");

  return {
    data: res.data,
  };
};

/**
 * PUT /api/v1/organization/company
 */
export const updateCompany = async (patch) => {
  const res = await api.put("/organization/company", patch);

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* BUSINESS UNITS                                                            */
/* ========================================================================= */

/**
 * GET /api/v1/organization/business-units
 */
export const getBusinessUnits = async () => {
  const res = await api.get("/organization/business-units");

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/business-units
 */
export const addBusinessUnit = async (payload) => {
  const res = await api.post(
    "/organization/business-units",
    payload
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* DEPARTMENTS                                                               */
/* ========================================================================= */

/**
 * GET /api/v1/organization/departments
 */
export const getDepartments = async () => {
  const res = await api.get("/organization/departments");

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/departments
 */
export const addDepartment = async (payload) => {
  const res = await api.post(
    "/organization/departments",
    payload
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* LOCATIONS                                                                 */
/* ========================================================================= */

/**
 * GET /api/v1/organization/locations
 */
export const getLocations = async () => {
  const res = await api.get("/organization/locations");

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/locations
 */
export const addLocation = async (payload) => {
  const res = await api.post(
    "/organization/locations",
    payload
  );

  return {
    data: res.data,
  };
};

/**
 * PUT /api/v1/organization/locations/:id/deactivate
 */
export const deactivateLocation = async (id) => {
  const res = await api.put(
    `/organization/locations/${id}/deactivate`
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* COST CENTERS                                                              */
/* ========================================================================= */

/**
 * GET /api/v1/organization/cost-centers
 */
export const getCostCenters = async () => {
  const res = await api.get(
    "/organization/cost-centers"
  );

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/cost-centers
 */
export const addCostCenter = async (payload) => {
  const res = await api.post(
    "/organization/cost-centers",
    payload
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* DESIGNATIONS                                                              */
/* ========================================================================= */

/**
 * GET /api/v1/organization/designations
 */
export const getDesignations = async () => {
  const res = await api.get(
    "/organization/designations"
  );

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/designations
 */
export const addDesignation = async (payload) => {
  const res = await api.post(
    "/organization/designations",
    payload
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* GRADES                                                                    */
/* ========================================================================= */

/**
 * GET /api/v1/organization/grades
 */
export const getGrades = async () => {
  const res = await api.get(
    "/organization/grades"
  );

  return {
    data: res.data,
  };
};

/**
 * POST /api/v1/organization/grades
 */
export const addGrade = async (payload) => {
  const res = await api.post(
    "/organization/grades",
    payload
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* REPORTING STRUCTURE                                                       */
/* ========================================================================= */

/**
 * GET /api/v1/organization/roster
 */
export const getRoster = async () => {
  const res = await api.get(
    "/organization/roster"
  );

  return {
    data: res.data,
  };
};

/**
 * PUT /api/v1/organization/employees/:employeeId/reporting-manager
 */
export const updateReportingManager = async (
  employeeId,
  newManagerId,
) => {
  const res = await api.put(
    `/organization/employees/${employeeId}/reporting-manager`,
    {
      managerId: newManagerId || null,
    }
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* BULK DEPARTMENT REASSIGNMENT                                             */
/* ========================================================================= */

/**
 * POST /api/v1/organization/employees/bulk-reassign-department
 */
export const bulkReassignDepartment = async (
  employeeIds,
  newDepartmentId,
) => {
  const res = await api.post(
    "/organization/employees/bulk-reassign-department",
    {
      employeeIds,
      newDepartmentId,
    }
  );

  return {
    data: res.data,
  };
};


/* ========================================================================= */
/* AUDIT LOG                                                                 */
/* ========================================================================= */

/**
 * GET /api/v1/organization/audit-log
 */
export const getAuditLog = async () => {
  const res = await api.get(
    "/organization/audit-log"
  );

  return {
    data: res.data,
  };
};