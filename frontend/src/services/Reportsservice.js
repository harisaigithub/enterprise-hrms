import api from "./api";
const data = (response) => ({ data: response.data.data });

export const getReportTemplates = async () => data(await api.get("/reports/templates"));
export const getOrgScope = async () => data(await api.get("/reports/scope"));
export const getFieldCatalog = async () => data(await api.get("/reports/catalog"));
export const runStandardReport = async (templateId, filters) => data(await api.post("/reports/standard", { templateId, filters }));
export const runCustomReport = async (payload) => data(await api.post("/reports/custom", payload));
export const exportReportCsv = async (templateId, filters) => data(await api.post("/reports/export/csv", { templateId, filters }));
