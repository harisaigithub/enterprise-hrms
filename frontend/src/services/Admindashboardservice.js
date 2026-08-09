/**
 * Admin (Management) Dashboard service — 
 * Single nightly-materialized snapshot rather than live per-widget queries.
 */
import { analyticsSnapshot } from "../mock/AdminDashboard";

function delay(value, ms = 500) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), ms));
}

export const getAnalyticsSnapshot = () => delay(analyticsSnapshot);
