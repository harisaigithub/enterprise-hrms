import { ASSET_ALLOCATION_APPROVAL_THRESHOLD } from "../workflow/workflow.service";

const CATEGORIES_REQUIRING_APPROVAL = new Set([
  "Laptop",
  "Desktop",
  "Mobile Phone",
  "Tablet",
  "Software License",
]);

export function requiresAssetApproval(category: string, estimatedCost: number | null): boolean {
  const normalizedCategory = category.trim().toLowerCase();
  const alwaysRequiresManager = normalizedCategory === "laptop" || normalizedCategory === "desktop";
  const requiresCostReview = CATEGORIES_REQUIRING_APPROVAL.has(category)
    && (estimatedCost === null || estimatedCost > ASSET_ALLOCATION_APPROVAL_THRESHOLD);

  return alwaysRequiresManager || requiresCostReview;
}