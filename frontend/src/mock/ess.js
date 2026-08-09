/**
 * Mock data — Employee Self Service 
 *
 * ESS owns no real data of its own — everything here stands in for calls
 * into the owning modules (Leave, Attendance, Payroll, LMS, Assets), always
 * scoped to a single hardcoded employee to mirror the "identity always comes
 * from the session, never a parameter" rule (16.6).
 */

export const proofStatusMeta = {
  Pending: { color: "#d97706", bg: "#fffbeb" },
  Uploaded: { color: "#0284c7", bg: "#f0f9ff" },
  Verified: { color: "#16a34a", bg: "#f0fdf4" },
};

export const EXPORT_THROTTLE_DAYS = 30;
export const EXPORT_EXPIRY_HOURS = 48;

const ME_ID = "EMP001";

let overview = {
  leaveBalance: { available: 13, pending: 1 },
  attendanceThisMonth: { present: 18, late: 2, wfh: 3 },
  latestPayslip: { period: "June 2026", netPay: 7130 },
  learning: { inProgress: 1, complianceOverdue: 0 },
  assignedAssets: 2,
  openTickets: 1,
};

let taxDeclarations = [
  { id: "td1", financialYear: "2026-27", section: "80C", investmentType: "PPF", amount: 100000, proofStatus: "Verified", submittedAt: "2026-04-15" },
  { id: "td2", financialYear: "2026-27", section: "80D", investmentType: "Health Insurance Premium", amount: 18000, proofStatus: "Uploaded", submittedAt: "2026-06-01" },
  { id: "td3", financialYear: "2026-27", section: "HRA", investmentType: "Rent Receipts", amount: 240000, proofStatus: "Pending", submittedAt: "2026-07-10" },
];

// null until the employee's first export request.
let lastExportRequest = null;

export function _getOverview(simulatePayrollDown) {
  if (simulatePayrollDown) {
    // one module being unavailable must not take the rest of the payload down —
    // callers filter this out per-widget, not by failing the whole response.
    const { latestPayslip, ...rest } = overview;
    return { ...rest, latestPayslip: null, payrollError: "Payroll service temporarily unavailable." };
  }
  return { ...overview, payrollError: null };
}

export function _getTaxDeclarations(employeeId) {
  return employeeId === ME_ID ? taxDeclarations : [];
}

export function _submitTaxDeclaration(entry) {
  taxDeclarations = [entry, ...taxDeclarations];
  return entry;
}

export function _getLastExportRequest(employeeId) {
  return employeeId === ME_ID ? lastExportRequest : null;
}

export function _requestDataExport(employeeId) {
  const now = new Date();
  if (lastExportRequest) {
    const elapsedDays = (now - new Date(lastExportRequest.requestedAt)) / (1000 * 60 * 60 * 24);
    if (elapsedDays < EXPORT_THROTTLE_DAYS) {
      const nextAllowed = new Date(new Date(lastExportRequest.requestedAt).getTime() + EXPORT_THROTTLE_DAYS * 86400000);
      return { error: `You can request another export on ${nextAllowed.toISOString().slice(0, 10)}.` };
    }
  }
  const expiresAt = new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 3600000);
  lastExportRequest = {
    requestedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    downloadUrl: "#",
    employeeId,
  };
  return { request: lastExportRequest };
}