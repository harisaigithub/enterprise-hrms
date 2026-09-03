/**
 * HR Dashboard service — mirrors adminDashboardService.js exactly
 * (single delay-wrapped snapshot; swap for a real endpoint later without
 * touching the widgets that call it).
 */
import { hrDashboardSnapshot } from "../mock/hrDashboard";

function delay(value, ms = 500) {
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), ms));
}

export const getHRDashboardSnapshot = () => delay(hrDashboardSnapshot);