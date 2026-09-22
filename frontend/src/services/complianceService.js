import api from "./api";

const data = (response) => ({ data: response.data.data });

export const getDashboardSummary = async () => data(await api.get("/compliance/dashboard"));
export const getObligations = async () => data(await api.get("/compliance/obligations"));
export const addObligation = async (payload) => data(await api.post("/compliance/obligations", payload));
export const markObligationFiled = async (id) => data(await api.patch(`/compliance/obligations/${id}/filed`));
export const getCaseSummaries = async () => data(await api.get("/compliance/cases"));
export const getCaseDetail = async (id) => data(await api.get(`/compliance/cases/${id}`));
export const applyCaseLegalHold = async (id, reason) => data(await api.patch(`/compliance/cases/${id}/legal-hold`, { reason }));
export const clearCaseLegalHold = async (id) => data(await api.delete(`/compliance/cases/${id}/legal-hold`));
export const getRetentionRecords = async () => data(await api.get("/compliance/retention"));
export const applyRecordLegalHold = async (id, reason) => data(await api.patch(`/compliance/retention/${id}/legal-hold`, { reason }));
export const clearRecordLegalHold = async (id) => data(await api.delete(`/compliance/retention/${id}/legal-hold`));
export const runRetentionJob = async () => data(await api.post("/compliance/retention/run"));
export const queryAuditFeed = async (filters) => data(await api.get("/compliance/audit", { params: filters }));
export const getComplianceAuditLog = async () => data(await api.get("/compliance/activities"));
