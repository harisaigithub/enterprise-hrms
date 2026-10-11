import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { requireEmployeeScope, requirePermission, requireRole } from "../../middlewares/rbac";

import {
  getBgvCaseController,
  listBgvCasesController,
  createBgvCaseController,
  updateBgvCaseController,
  initiateBgvCaseController,
  assignBgvVerifierController,
  unassignBgvVerifierController,
  changeBgvCaseStatusController,
  setFinalBgvDecisionController,
} from "./bgv.case.controller";

import {
  getBgvVerificationController,
  listBgvVerificationsController,
  createBgvVerificationController,
  updateBgvVerificationController,
  assignBgvVerificationController,
  unassignBgvVerificationController,
  changeBgvVerificationStatusController,
  startBgvVerificationController,
  submitBgvVerificationController,
  completeBgvVerificationController,
  markBgvVerificationDiscrepancyController,
  requestBgvCandidateActionController,
  holdBgvVerificationController,
  cancelBgvVerificationController,
} from "./bgv.verification.controller";

import {
  getBgvDiscrepancyController,
  listBgvDiscrepanciesController,
  createBgvDiscrepancyController,
  reviewBgvDiscrepancyController,
  resolveBgvDiscrepancyController,
  reopenBgvDiscrepancyController,
  deleteBgvDiscrepancyController,
} from "./bgv.discrepancy.controller";

import {
  getBgvDocumentController,
  listBgvDocumentsController,
  createBgvDocumentController,
  verifyBgvDocumentController,
  rejectBgvDocumentController,
  expireBgvDocumentController,
  deleteBgvDocumentController,
} from "./bgv.document.controller";

import {
  getBgvReviewController,
  listBgvReviewsController,
  createBgvReviewController,
  getLatestBgvReviewController,
  getBgvReviewHistoryController,
  hasBgvReviewDecisionController,
  deleteBgvReviewController,
} from "./bgv.review.controller";

import {
  getBgvAuditController,
  listBgvAuditsController,
  createBgvAuditController,
  getBgvCaseAuditTrailController,
  getLatestBgvAuditController,
  countBgvAuditsController,
} from "./bgv.audit.controller";

import {
  getBgvPackageController,
  listBgvPackagesController,
  createBgvPackageController,
  updateBgvPackageController,
  activateBgvPackageController,
  deactivateBgvPackageController,
  deleteBgvPackageController,
  listBgvPackageChecksController,
  getBgvPackageCheckController,
  createBgvPackageCheckController,
  updateBgvPackageCheckController,
  deleteBgvPackageCheckController,
  replaceBgvPackageChecksController,
} from "./bgv.package.controller";

import {
  getBgvVendorController,
  listBgvVendorsController,
  createBgvVendorController,
  updateBgvVendorController,
  activateBgvVendorController,
  deactivateBgvVendorController,
  enableBgvVendorApiController,
  disableBgvVendorApiController,
  deleteBgvVendorController,
  countBgvVendorsController,
} from "./bgv.vendor.controller";

import {
  getBgvStatusHistoryController,
  listBgvStatusHistoryController,
  getBgvCaseStatusHistoryController,
  getLatestBgvStatusHistoryController,
  createBgvStatusHistoryController,
  countBgvStatusHistoryController,
} from "./bgv.status-history.controller";

import {
  getBgvAssignmentHistoryController,
  listBgvAssignmentHistoryController,
  getBgvCaseAssignmentHistoryController,
  getActiveBgvAssignmentController,
  createBgvAssignmentHistoryController,
  closeBgvAssignmentHistoryController,
  updateBgvAssignmentHistoryController,
  countBgvAssignmentsController,
} from "./bgv.assignment-history.controller";

import {
  getBgvVerificationFieldsController,
  saveBgvVerificationFieldsController,
  compareBgvVerificationFieldsController,
} from "./bgv.evidence.controller";

import {
  updateBgvCandidateProfileController,
} from "./bgv.candidate-profile.controller";

const router = Router();

router.use(authenticate);

/* -------------------------------------------------------------------------- */
/* BGV Cases                                                                  */
/* -------------------------------------------------------------------------- */

router.get("/cases", listBgvCasesController);
router.post("/cases", createBgvCaseController);
router.get("/cases/:id", getBgvCaseController);
router.patch("/cases/:id", updateBgvCaseController);

router.post("/cases/:id/initiate", initiateBgvCaseController);
router.post("/cases/:id/assign", assignBgvVerifierController);
router.post("/cases/:id/unassign", unassignBgvVerifierController);
router.post("/cases/:id/status", changeBgvCaseStatusController);
router.post("/cases/:id/final-decision", setFinalBgvDecisionController);

/* -------------------------------------------------------------------------- */
/* Verifications                                                              */
/* -------------------------------------------------------------------------- */

router.get("/verifications", listBgvVerificationsController);
router.post("/verifications", createBgvVerificationController);
router.get("/verifications/:id", getBgvVerificationController);
router.patch("/verifications/:id", updateBgvVerificationController);

router.post("/verifications/:id/assign", assignBgvVerificationController);
router.post("/verifications/:id/unassign", unassignBgvVerificationController);
router.post("/verifications/:id/status", changeBgvVerificationStatusController);
router.post("/verifications/:id/start", startBgvVerificationController);
router.post("/verifications/:id/submit", submitBgvVerificationController);
router.post("/verifications/:id/complete", completeBgvVerificationController);
router.post(
  "/verifications/:id/discrepancy",
  markBgvVerificationDiscrepancyController
);
router.post(
  "/verifications/:id/candidate-action",
  requestBgvCandidateActionController
);
router.post("/verifications/:id/hold", holdBgvVerificationController);
router.post("/verifications/:id/cancel", cancelBgvVerificationController);

/* -------------------------------------------------------------------------- */
/* Discrepancies                                                              */
/* -------------------------------------------------------------------------- */

router.get("/discrepancies", listBgvDiscrepanciesController);
router.post("/discrepancies", createBgvDiscrepancyController);
router.get("/discrepancies/:id", getBgvDiscrepancyController);
router.post("/discrepancies/:id/review", reviewBgvDiscrepancyController);
router.post("/discrepancies/:id/resolve", resolveBgvDiscrepancyController);
router.post("/discrepancies/:id/reopen", reopenBgvDiscrepancyController);
router.delete("/discrepancies/:id", deleteBgvDiscrepancyController);

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

router.get("/documents", listBgvDocumentsController);
router.post("/documents", createBgvDocumentController);
router.get("/documents/:id", getBgvDocumentController);
router.post("/documents/:id/verify", verifyBgvDocumentController);
router.post("/documents/:id/reject", rejectBgvDocumentController);
router.post("/documents/:id/expire", expireBgvDocumentController);
router.delete("/documents/:id", deleteBgvDocumentController);

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

router.get("/reviews", listBgvReviewsController);
router.post("/reviews", createBgvReviewController);
router.get("/reviews/case/:caseId/latest", getLatestBgvReviewController);
router.get("/reviews/case/:caseId/history", getBgvReviewHistoryController);
router.get(
  "/reviews/case/:caseId/has-decision",
  hasBgvReviewDecisionController
);
router.get("/reviews/:id", getBgvReviewController);
router.delete("/reviews/:id", deleteBgvReviewController);

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

router.get("/audits", listBgvAuditsController);
router.post("/audits", createBgvAuditController);
router.get("/audits/case/:caseId", getBgvCaseAuditTrailController);
router.get("/audits/case/:caseId/latest", getLatestBgvAuditController);
router.get("/audits/count", countBgvAuditsController);
router.get("/audits/:id", getBgvAuditController);

/* -------------------------------------------------------------------------- */
/* Packages                                                                   */
/* -------------------------------------------------------------------------- */

router.get("/packages", listBgvPackagesController);
router.post("/packages", createBgvPackageController);
router.get("/packages/:id", getBgvPackageController);
router.patch("/packages/:id", updateBgvPackageController);
router.post("/packages/:id/activate", activateBgvPackageController);
router.post("/packages/:id/deactivate", deactivateBgvPackageController);
router.delete("/packages/:id", deleteBgvPackageController);

router.get("/packages/:packageId/checks", listBgvPackageChecksController);
router.post("/packages/:packageId/checks", createBgvPackageCheckController);
router.put("/packages/:packageId/checks", replaceBgvPackageChecksController);
router.get("/package-checks/:id", getBgvPackageCheckController);
router.patch("/package-checks/:id", updateBgvPackageCheckController);
router.delete("/package-checks/:id", deleteBgvPackageCheckController);

/* -------------------------------------------------------------------------- */
/* Vendors                                                                    */
/* -------------------------------------------------------------------------- */

router.get("/vendors", listBgvVendorsController);
router.post("/vendors", createBgvVendorController);
router.get("/vendors/count", countBgvVendorsController);
router.get("/vendors/:id", getBgvVendorController);
router.patch("/vendors/:id", updateBgvVendorController);
router.post("/vendors/:id/activate", activateBgvVendorController);
router.post("/vendors/:id/deactivate", deactivateBgvVendorController);
router.post("/vendors/:id/api/enable", enableBgvVendorApiController);
router.post("/vendors/:id/api/disable", disableBgvVendorApiController);
router.delete("/vendors/:id", deleteBgvVendorController);

/* -------------------------------------------------------------------------- */
/* Status History                                                             */
/* -------------------------------------------------------------------------- */

router.get("/status-history", listBgvStatusHistoryController);
router.post("/status-history", createBgvStatusHistoryController);
router.get(
  "/status-history/case/:caseId",
  getBgvCaseStatusHistoryController
);
router.get(
  "/status-history/case/:caseId/latest",
  getLatestBgvStatusHistoryController
);
router.get("/status-history/count", countBgvStatusHistoryController);
router.get("/status-history/:id", getBgvStatusHistoryController);

/* -------------------------------------------------------------------------- */
/* Assignment History                                                         */
/* -------------------------------------------------------------------------- */

router.get("/assignment-history", listBgvAssignmentHistoryController);
router.post("/assignment-history", createBgvAssignmentHistoryController);
router.get(
  "/assignment-history/case/:caseId",
  getBgvCaseAssignmentHistoryController
);
router.get(
  "/assignment-history/case/:caseId/active",
  getActiveBgvAssignmentController
);
router.get("/assignment-history/count", countBgvAssignmentsController);
router.get("/assignment-history/:id", getBgvAssignmentHistoryController);
router.patch(
  "/assignment-history/:id",
  updateBgvAssignmentHistoryController
);
router.post(
  "/assignment-history/:id/close",
  closeBgvAssignmentHistoryController
);


router.get(
  "/verifications/:id/fields",
  getBgvVerificationFieldsController
);

router.put(
  "/verifications/:id/fields",
  saveBgvVerificationFieldsController
);

router.post(
  "/verifications/:id/compare",
  compareBgvVerificationFieldsController
);

router.put(
  "/candidates/:id/profile",
  updateBgvCandidateProfileController
);

export default router;
