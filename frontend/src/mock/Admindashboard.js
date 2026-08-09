/**
 * Admin (Management) Dashboard — 
 * aggregated by the Analytics Engine into materialized summary
 * tables rather than computed live — the "asOf" timestamp models that.
 */

export const analyticsSnapshot = {
  asOf: "2026-07-30T02:00:00",
  orgKpis: {
    headcount: 486,
    attritionRateYtd: 8.2,
    openPositions: 14,
  },
  departmentPerformance: [
    { department: "Engineering", avgRating: 4.1 },
    { department: "Sales", avgRating: 3.8 },
    { department: "Design", avgRating: 4.3 },
    { department: "Finance", avgRating: 3.9 },
  ],
  hiringFunnel: { applied: 340, screening: 92, interview: 38, offer: 9, hired: 5 },
  payrollCostTrend: [
    { month: "Mar", cost: 4.1 },
    { month: "Apr", cost: 4.2 },
    { month: "May", cost: 4.3 },
    { month: "Jun", cost: 4.35 },
    { month: "Jul", cost: 4.4 },
  ], // in ₹ crore
  satisfactionScore: { score: 4.2, scale: 5, surveyName: "Q2 Pulse Survey" },
  productivity: { tasksCompletedRate: 87, avgCycleTimeDays: 3.4 },
};