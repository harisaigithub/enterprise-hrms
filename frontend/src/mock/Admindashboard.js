/**
 * Admin (Management) Dashboard — 
 * aggregated by the Analytics Engine into materialized summary
 * tables rather than computed live — the "asOf" timestamp models that.
 */

export const analyticsSnapshot = {
  asOf: "2026-09-03T02:00:00",
  orgKpis: {
    headcount: 18,
    attritionRateYtd: 4.2,
    openPositions: 9,
  },
  departmentPerformance: [
    { department: "Engineering", avgRating: 4.2 },
    { department: "Product", avgRating: 4.4 },
    { department: "Design", avgRating: 4.3 },
    { department: "Analytics", avgRating: 4.1 },
    { department: "Human Resources", avgRating: 4.5 },
    { department: "Finance", avgRating: 4.0 },
  ],
  hiringFunnel: { applied: 5, screening: 4, interview: 3, offer: 2, hired: 3 },
  payrollCostTrend: [
    { month: "May", cost: 4.1 },
    { month: "Jun", cost: 4.2 },
    { month: "Jul", cost: 4.3 },
    { month: "Aug", cost: 4.35 },
    { month: "Sep", cost: 4.4 },
  ], // in ₹ crore
  satisfactionScore: { score: 4.3, scale: 5, surveyName: "Q2 Pulse Survey" },
  productivity: { tasksCompletedRate: 88, avgCycleTimeDays: 3.2 },
};