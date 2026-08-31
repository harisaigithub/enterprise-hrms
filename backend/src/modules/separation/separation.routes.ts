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

const router = Router();

router.use(authenticate);

/* =========================================================
   ALUMNI
========================================================= */

router.get(
  "/alumni",
  getAlumni
);

/* =========================================================
   SEPARATIONS
========================================================= */

router.get(
  "/",
  getSeparations
);

router.post(
  "/",
  initiateSeparation
);

/* =========================================================
   CLEARANCE
========================================================= */

router.get(
  "/:id/clearance",
  getClearanceItems
);

router.patch(
  "/clearance/:id",
  updateClearanceItem
);

/* =========================================================
   EXIT INTERVIEW
========================================================= */

router.get(
  "/:id/exit-interview",
  getExitInterview
);

router.post(
  "/:id/exit-interview",
  recordExitInterview
);

/* =========================================================
   SETTLEMENT
========================================================= */

router.post(
  "/:id/settlement",
  computeSettlement
);

/* =========================================================
   ACCESS REVOCATION
========================================================= */

router.post(
  "/:id/revoke-access",
  revokeAccess
);

/* =========================================================
   CONVERT TO ALUMNI
========================================================= */

router.post(
  "/:id/alumni",
  convertToAlumni
);

export default router;