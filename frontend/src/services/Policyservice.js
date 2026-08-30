import api from "./api";

export const getPolicies = async () => (await api.get("/policies")).data;
export const createPolicy = async (policy) => (await api.post("/policies", policy)).data;
export const addVersion = async (policyId, version) => (await api.post(`/policies/${policyId}/versions`, version)).data;
export const publishPolicy = async (id) => (await api.post(`/policies/${id}/publish`)).data;
export const getAcknowledgements = async () => (await api.get("/policies/acknowledgements/me")).data;
export const getAllAcknowledgements = async () => (await api.get("/policies/compliance")).data;
export const acknowledgePolicy = async (policyId, versionId) => (await api.post(`/policies/${policyId}/acknowledge`, { versionId })).data;
