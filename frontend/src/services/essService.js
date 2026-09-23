import api from "./api";

export async function getOverview() {
  const response = await api.get("/ess/overview");
  return response.data;
}

export async function getTaxDeclarations() {
  const response = await api.get("/ess/tax-declarations");
  return response.data;
}

export async function submitTaxDeclaration(entry) {
  const response = await api.post("/ess/tax-declarations", {
    financialYear: entry.financialYear,
    section: entry.section,
    investmentType: entry.investmentType,
    amount: entry.amount,
  });
  return response.data;
}

export async function getLastExportRequest() {
  const response = await api.get("/ess/data-export/latest");
  return response.data;
}

export async function requestDataExport() {
  const response = await api.post("/ess/data-export");
  return response.data;
}
