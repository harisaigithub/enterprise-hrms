/**
 * Weekly hiring funnel data consumed by HiringChart.jsx (recharts BarChart).
 * Each bar series key (Applied / Interviewing / Offer / Onboarded) must match
 * the dataKey props used in <Bar dataKey="..." /> exactly.
 */

export const hiringChartData = [
  { day: "Mon", Applied: 16, Interviewing: 4, Offer: 1, Onboarded: 0 },
  { day: "Tue", Applied: 9,  Interviewing: 8, Offer: 3, Onboarded: 1 },
  { day: "Wed", Applied: 10, Interviewing: 3, Offer: 5, Onboarded: 1 },
  { day: "Thu", Applied: 8,  Interviewing: 4, Offer: 2, Onboarded: 0 },
  { day: "Fri", Applied: 13, Interviewing: 9, Offer: 4, Onboarded: 2 },
  { day: "Sat", Applied: 6,  Interviewing: 3, Offer: 2, Onboarded: 1 },
  { day: "Sun", Applied: 4,  Interviewing: 2, Offer: 1, Onboarded: 0 },
];