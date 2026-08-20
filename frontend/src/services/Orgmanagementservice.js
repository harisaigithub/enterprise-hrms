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