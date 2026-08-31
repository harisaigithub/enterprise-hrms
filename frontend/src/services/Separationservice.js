/**
 * Separation Management service — Module 19
 * Connected to real Separation Management backend APIs.
 */

import api from "./api";

/* =========================================================
   SEPARATIONS
========================================================= */

export function getSeparations() {
  return api.get("/separations");
}

export function initiateSeparation(separation) {
  return api.post("/separations", separation);
}

/* =========================================================
   CLEARANCE
========================================================= */

export function getClearanceItems(separationId) {
  return api.get(
    `/separations/${separationId}/clearance`
  );
}

export function updateClearanceItem(
  id,
  status,
  notes
) {
  return api.patch(
    `/separations/clearance/${id}`,
    {
      status,
      notes,
    }
  );
}

/* =========================================================
   EXIT INTERVIEW
========================================================= */

export function getExitInterview(separationId) {
  return api.get(
    `/separations/${separationId}/exit-interview`
  );
}

/**
 * conductedBy is intentionally NOT sent from frontend.
 *
 * Backend should identify the authenticated HR user
 * from req.auth.sub.
 */
export function recordExitInterview(
  separationId,
  responses
) {
  return api.post(
    `/separations/${separationId}/exit-interview`,
    {
      responses,
    }
  );
}

/* =========================================================
   SETTLEMENT
========================================================= */

export function computeSettlement(
  separationId,
  breakdown,
  override,
  overrideReason
) {
  return api.post(
    `/separations/${separationId}/settlement`,
    {
      breakdown,
      override,
      overrideReason,
    }
  );
}

/* =========================================================
   ACCESS REVOCATION
========================================================= */

export function revokeAccess(separationId) {
  return api.post(
    `/separations/${separationId}/revoke-access`
  );
}

/* =========================================================
   ALUMNI
========================================================= */

export function convertToAlumni(
  separationId,
  tenure,
  role,
  eligibleForRehire
) {
  return api.post(
    `/separations/${separationId}/alumni`,
    {
      tenure,
      role,
      eligibleForRehire,
    }
  );
}

export function getAlumni() {
  return api.get("/separations/alumni");
}