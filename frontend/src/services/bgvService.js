import api from "./api";

// ─────────────────────────────────────────────────────────────
// BGV CASES
// ─────────────────────────────────────────────────────────────

export const getBgvCases = (params = {}) =>
  api.get("/bgv/cases", { params });

export const getBgvCase = (id) =>
  api.get(`/bgv/cases/${id}`);

export const createBgvCase = (data) =>
  api.post("/bgv/cases", data);

export const updateBgvCase = (id, data) =>
  api.patch(`/bgv/cases/${id}`, data);

// BGV cases are intentionally not hard-deleted. Use the CANCELLED status
// so the audit/history trail remains intact.

export const initiateBgvCase = (id) =>
  api.post(`/bgv/cases/${id}/initiate`);

export const assignBgvCaseVerifier = (id, data) =>
  api.post(`/bgv/cases/${id}/assign`, data);

export const unassignBgvCaseVerifier = (id) =>
  api.post(`/bgv/cases/${id}/unassign`);

export const changeBgvCaseStatus = (id, data) =>
  api.post(`/bgv/cases/${id}/status`, data);

export const setFinalBgvDecision = (id, data) =>
  api.post(`/bgv/cases/${id}/final-decision`, data);

// ─────────────────────────────────────────────────────────────
// BGV VERIFICATIONS
// ─────────────────────────────────────────────────────────────

export const getBgvVerifications = (params = {}) =>
  api.get("/bgv/verifications", { params });

export const getBgvVerification = (id) =>
  api.get(`/bgv/verifications/${id}`);

export const createBgvVerification = (data) =>
  api.post("/bgv/verifications", data);

export const updateBgvVerification = (id, data) =>
  api.patch(`/bgv/verifications/${id}`, data);

export const assignBgvVerification = (id, data) =>
  api.post(`/bgv/verifications/${id}/assign`, data);

export const unassignBgvVerification = (id) =>
  api.post(`/bgv/verifications/${id}/unassign`);

export const changeBgvVerificationStatus = (id, data) =>
  api.post(`/bgv/verifications/${id}/status`, data);

export const startBgvVerification = (id) =>
  api.post(`/bgv/verifications/${id}/start`);

export const submitBgvVerification = (id, data = {}) =>
  api.post(`/bgv/verifications/${id}/submit`, data);

export const completeBgvVerification = (id, data) =>
  api.post(`/bgv/verifications/${id}/complete`, data);

export const markBgvVerificationDiscrepancy = (id, data) =>
  api.post(`/bgv/verifications/${id}/discrepancy`, data);

export const requestBgvCandidateAction = (id, data) =>
  api.post(`/bgv/verifications/${id}/candidate-action`, data);

export const holdBgvVerification = (id, data = {}) =>
  api.post(`/bgv/verifications/${id}/hold`, data);

export const cancelBgvVerification = (id, data = {}) =>
  api.post(`/bgv/verifications/${id}/cancel`, data);

// ─────────────────────────────────────────────────────────────
// BGV DISCREPANCIES
// ─────────────────────────────────────────────────────────────

export const getBgvDiscrepancies = (params = {}) =>
  api.get("/bgv/discrepancies", { params });

export const getBgvDiscrepancy = (id) =>
  api.get(`/bgv/discrepancies/${id}`);

export const createBgvDiscrepancy = (data) =>
  api.post("/bgv/discrepancies", data);

export const reviewBgvDiscrepancy = (id, data = {}) =>
  api.post(`/bgv/discrepancies/${id}/review`, data);

export const resolveBgvDiscrepancy = (id, data) =>
  api.post(`/bgv/discrepancies/${id}/resolve`, data);

export const reopenBgvDiscrepancy = (id, data = {}) =>
  api.post(`/bgv/discrepancies/${id}/reopen`, data);

export const deleteBgvDiscrepancy = (id) =>
  api.delete(`/bgv/discrepancies/${id}`);

// ─────────────────────────────────────────────────────────────
// BGV DOCUMENTS
// ─────────────────────────────────────────────────────────────

export const getBgvDocuments = (params = {}) =>
  api.get("/bgv/documents", { params });

export const getBgvDocument = (id) =>
  api.get(`/bgv/documents/${id}`);

export const createBgvDocument = (data) =>
  api.post("/bgv/documents", data);

export const verifyBgvDocument = (id, data) =>
  api.post(`/bgv/documents/${id}/verify`, data);

export const rejectBgvDocument = (id, data) =>
  api.post(`/bgv/documents/${id}/reject`, data);

export const expireBgvDocument = (id) =>
  api.post(`/bgv/documents/${id}/expire`);

export const deleteBgvDocument = (id) =>
  api.delete(`/bgv/documents/${id}`);

// ─────────────────────────────────────────────────────────────
// BGV REVIEWS
// ─────────────────────────────────────────────────────────────

export const getBgvReviews = (params = {}) =>
  api.get("/bgv/reviews", { params });

export const getBgvReview = (id) =>
  api.get(`/bgv/reviews/${id}`);

export const createBgvReview = (data) =>
  api.post("/bgv/reviews", data);

export const getLatestBgvReview = (caseId) =>
  api.get(`/bgv/reviews/case/${caseId}/latest`);

export const getBgvReviewHistory = (caseId) =>
  api.get(`/bgv/reviews/case/${caseId}/history`);

export const hasBgvReviewDecision = (caseId) =>
  api.get(`/bgv/reviews/case/${caseId}/has-decision`);

export const deleteBgvReview = (id) =>
  api.delete(`/bgv/reviews/${id}`);

// ─────────────────────────────────────────────────────────────
// BGV AUDITS
// ─────────────────────────────────────────────────────────────

export const getBgvAudits = (params = {}) =>
  api.get("/bgv/audits", { params });

export const getBgvAudit = (id) =>
  api.get(`/bgv/audits/${id}`);

export const createBgvAudit = (data) =>
  api.post("/bgv/audits", data);

export const getBgvCaseAuditTrail = (caseId, params = {}) =>
  api.get(`/bgv/audits/case/${caseId}`, { params });

export const getLatestBgvAudit = (caseId) =>
  api.get(`/bgv/audits/case/${caseId}/latest`);

export const countBgvAudits = (params = {}) =>
  api.get("/bgv/audits/count", { params });

// ─────────────────────────────────────────────────────────────
// BGV PACKAGES
// ─────────────────────────────────────────────────────────────

export const getBgvPackages = (params = {}) =>
  api.get("/bgv/packages", { params });

export const getBgvPackage = (id) =>
  api.get(`/bgv/packages/${id}`);

export const createBgvPackage = (data) =>
  api.post("/bgv/packages", data);

export const updateBgvPackage = (id, data) =>
  api.patch(`/bgv/packages/${id}`, data);

export const activateBgvPackage = (id) =>
  api.post(`/bgv/packages/${id}/activate`);

export const deactivateBgvPackage = (id) =>
  api.post(`/bgv/packages/${id}/deactivate`);

export const deleteBgvPackage = (id) =>
  api.delete(`/bgv/packages/${id}`);

export const getBgvPackageChecks = (packageId) =>
  api.get(`/bgv/packages/${packageId}/checks`);

export const getBgvPackageCheck = (id) =>
  api.get(`/bgv/package-checks/${id}`);

export const createBgvPackageCheck = (packageId, data) =>
  api.post(`/bgv/packages/${packageId}/checks`, data);

export const updateBgvPackageCheck = (id, data) =>
  api.patch(`/bgv/package-checks/${id}`, data);

export const deleteBgvPackageCheck = (id) =>
  api.delete(`/bgv/package-checks/${id}`);

export const replaceBgvPackageChecks = (packageId, checks) =>
  api.put(`/bgv/packages/${packageId}/checks`, { checks });

// ─────────────────────────────────────────────────────────────
// BGV VENDORS
// ─────────────────────────────────────────────────────────────

export const getBgvVendors = (params = {}) =>
  api.get("/bgv/vendors", { params });

export const getBgvVendor = (id) =>
  api.get(`/bgv/vendors/${id}`);

export const createBgvVendor = (data) =>
  api.post("/bgv/vendors", data);

export const updateBgvVendor = (id, data) =>
  api.patch(`/bgv/vendors/${id}`, data);

export const activateBgvVendor = (id) =>
  api.post(`/bgv/vendors/${id}/activate`);

export const deactivateBgvVendor = (id) =>
  api.post(`/bgv/vendors/${id}/deactivate`);

export const enableBgvVendorApi = (id, data = {}) =>
  api.post(`/bgv/vendors/${id}/api/enable`, data);

export const disableBgvVendorApi = (id) =>
  api.post(`/bgv/vendors/${id}/api/disable`);

export const deleteBgvVendor = (id) =>
  api.delete(`/bgv/vendors/${id}`);

export const countBgvVendors = (params = {}) =>
  api.get("/bgv/vendors/count", { params });

// ─────────────────────────────────────────────────────────────
// BGV STATUS HISTORY
// ─────────────────────────────────────────────────────────────

export const getBgvStatusHistory = (id) =>
  api.get(`/bgv/status-history/${id}`);

export const getBgvStatusHistories = (params = {}) =>
  api.get("/bgv/status-history", { params });

export const getBgvCaseStatusHistory = (caseId, params = {}) =>
  api.get(`/bgv/status-history/case/${caseId}`, { params });

export const getLatestBgvStatusHistory = (caseId) =>
  api.get(`/bgv/status-history/case/${caseId}/latest`);

export const createBgvStatusHistory = (data) =>
  api.post("/bgv/status-history", data);

export const countBgvStatusHistory = (params = {}) =>
  api.get("/bgv/status-history/count", { params });

// ─────────────────────────────────────────────────────────────
// BGV ASSIGNMENT HISTORY
// ─────────────────────────────────────────────────────────────

export const getBgvAssignmentHistory = (id) =>
  api.get(`/bgv/assignment-history/${id}`);

export const getBgvAssignmentHistories = (params = {}) =>
  api.get("/bgv/assignment-history", { params });

export const getBgvCaseAssignmentHistory = (caseId, params = {}) =>
  api.get(`/bgv/assignment-history/case/${caseId}`, { params });

export const getActiveBgvAssignment = (caseId) =>
  api.get(`/bgv/assignment-history/case/${caseId}/active`);

export const createBgvAssignmentHistory = (data) =>
  api.post("/bgv/assignment-history", data);

export const closeBgvAssignmentHistory = (id, data = {}) =>
  api.post(`/bgv/assignment-history/${id}/close`, data);

export const updateBgvAssignmentHistory = (id, data) =>
  api.patch(`/bgv/assignment-history/${id}`, data);

export const countBgvAssignments = (params = {}) =>
  api.get("/bgv/assignment-history/count", { params });


export const getBgvVerificationFields = (id) =>
  api.get(`/bgv/verifications/${id}/fields`);

export const saveBgvVerificationFields = (id, data) =>
  api.put(`/bgv/verifications/${id}/fields`, data);

export const compareBgvVerificationFields = (id) =>
  api.post(`/bgv/verifications/${id}/compare`);

export const updateBgvCandidateProfile = (candidateId, data) =>
  api.put(`/bgv/candidates/${candidateId}/profile`, data);