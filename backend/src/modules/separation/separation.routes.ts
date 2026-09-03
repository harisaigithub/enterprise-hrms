import { Router } from "express";

import {
  getSeparations,
  initiateSeparation,
  getClearanceItems,
  updateClearanceItem,
  getExitInterview,
  recordExitInterview,
  computeSettlement,
  revokeAccess,
  convertToAlumni,
  getAlumni,
} from "./separation.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";

const router = Router();

router.use(authenticate);

/* =========================================================
   ALUMNI
========================================================= */

router.get(
  "/alumni",
  requirePermission("alumni:read"),
  getAlumni
);

/* =========================================================
   SEPARATIONS
========================================================= */

router.get(
  "/",
  requirePermission("separation:read"),
  getSeparations
);

router.post(
  "/",
  requirePermission("separation:write"),
  initiateSeparation
);

/* =========================================================
   CLEARANCE
========================================================= */

router.get(
  "/:id/clearance",
  requirePermission("clearance:read"),
  getClearanceItems
);

router.patch(
  "/clearance/:id",
  requirePermission("clearance:write"),
  updateClearanceItem
);

/* =========================================================
   EXIT INTERVIEW
========================================================= */

router.get(
  "/:id/exit-interview",
  requirePermission("exitinterview:read"),
  getExitInterview
);

router.post(
  "/:id/exit-interview",
  requirePermission("exitinterview:write"),
  recordExitInterview
);

/* =========================================================
   SETTLEMENT
========================================================= */

router.post(
  "/:id/settlement",
  requirePermission("settlement:write"),
  computeSettlement
);

/* =========================================================
   ACCESS REVOCATION
========================================================= */

router.post(
  "/:id/revoke-access",
  requirePermission("access:revoke"),
  revokeAccess
);

/* =========================================================
   CONVERT TO ALUMNI
========================================================= */

router.post(
  "/:id/alumni",
  requirePermission("alumni:write"),
  convertToAlumni
);

export default router;