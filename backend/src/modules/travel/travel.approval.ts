export type TravelApprovalStage = "manager" | "finance";

const MANAGER_REVIEW_STATUSES = new Set(["Pending Manager Approval", "Resubmitted"]);

export function getTravelApprovalStage(status: string, role: string): TravelApprovalStage | null {
  const normalizedRole = role.toUpperCase();
  if (MANAGER_REVIEW_STATUSES.has(status) && ["MANAGER", "ADMIN"].includes(normalizedRole)) {
    return "manager";
  }
  if (status === "Pending Finance Approval" && ["FINANCE", "ADMIN"].includes(normalizedRole)) {
    return "finance";
  }
  return null;
}
