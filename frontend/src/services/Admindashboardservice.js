/**
 * Admin (Management) Dashboard service — spec 3.5.3
 * Single nightly-materialized snapshot rather than live per-widget queries.
 */
import { analyticsSnapshot } from "../data/adminDashboard";

function delay(value, ms = 500) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), ms));
}

export const getAnalyticsSnapshot = () => delay(analyticsSnapshot);
