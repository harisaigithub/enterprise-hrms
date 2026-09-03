/**
 * Admin (Management) Dashboard service — 
 * Fetches live analytics metrics from /api/dashboard/admin with offline fallback.
 */
import api from "./api";
import { analyticsSnapshot } from "../mock/adminDashboard";

export const getAnalyticsSnapshot = async () => {
  try {
    const res = await api.get("/dashboard/admin");
    return res.data;
  } catch (_err) {
    return { data: analyticsSnapshot };
  }
};
