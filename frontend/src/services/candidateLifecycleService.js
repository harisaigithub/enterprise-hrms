import api from "./api";
import axios from "axios";

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 15000 });

const publicCall = async (request) => { try { return (await request()).data; } catch (error) { throw { message: error.response?.data?.message || error.message || "Request failed" }; } };
export const getPublicJobs = async () => publicCall(() => publicApi.get("/candidate-lifecycle/jobs"));
export const submitCandidateApplication = async (payload) => publicCall(() => publicApi.post("/candidate-lifecycle/applications", payload));
export const getCandidatePortal = async (token) => publicCall(() => publicApi.get(`/candidate-lifecycle/portal/${token}`));
export const decideCandidateOffer = async (token, decision) => publicCall(() => publicApi.post(`/candidate-lifecycle/portal/${token}/decision`, { decision }));
export const uploadCandidateDocument = async (token, payload) => publicCall(() => publicApi.post(`/candidate-lifecycle/portal/${token}/documents`, payload));
export const getLifecycleApplications = async () => (await api.get("/candidate-lifecycle/applications")).data;
export const firstApproveApplication = async (id, notes = "") => (await api.post(`/candidate-lifecycle/applications/${id}/first-approval`, { notes })).data;
export const secondApproveApplication = async (id, payload) => (await api.post(`/candidate-lifecycle/applications/${id}/second-approval`, payload)).data;
export const rejectLifecycleApplication = async (id, reason) => (await api.post(`/candidate-lifecycle/applications/${id}/reject`, { reason })).data;
export const verifyCandidateDocument = async (id, status, reason = "") => (await api.patch(`/candidate-lifecycle/documents/${id}`, { status, reason })).data;
export const convertCandidateToEmployee = async (id) => (await api.post(`/candidate-lifecycle/applications/${id}/create-employee`)).data;
