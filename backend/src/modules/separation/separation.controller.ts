import type { Request, Response } from "express";
import * as separationService from "./separation.service";

/* =========================================================
   GET ALL SEPARATIONS
========================================================= */

export async function getSeparations(
  _req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.getSeparations();

    res.json(data);
  } catch (error) {
    console.error("Get separations error:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch separations",
    });
  }
}

/* =========================================================
   INITIATE SEPARATION
========================================================= */

export async function initiateSeparation(
  req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.initiateSeparation(
        req.body
      );

    res.status(201).json(data);
  } catch (error) {
    console.error(
      "Initiate separation error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to initiate separation",
    });
  }
}

/* =========================================================
   CLEARANCE
========================================================= */

export async function getClearanceItems(
  req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.getClearanceItems(
        req.params.id
      );

    res.json(data);
  } catch (error) {
    console.error(
      "Get clearance items error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch clearance items",
    });
  }
}

export async function updateClearanceItem(
  req: Request,
  res: Response
) {
  try {
    const {
      status,
      notes,
    } = req.body;

    const data =
      await separationService.updateClearanceItem(
        req.params.id,
        status,
        notes
      );

    res.json(data);
  } catch (error) {
    console.error(
      "Update clearance item error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update clearance item",
    });
  }
}

/* =========================================================
   EXIT INTERVIEW
========================================================= */

export async function getExitInterview(
  req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.getExitInterview(
        req.params.id
      );

    res.json(data);
  } catch (error) {
    console.error(
      "Get exit interview error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch exit interview",
    });
  }
}

export async function recordExitInterview(
  req: Request,
  res: Response
) {
  try {
    if (!req.auth) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const data =
      await separationService.recordExitInterview(
        req.params.id,
        req.body.responses,
        req.auth.sub
      );

    res.status(201).json(data);
  } catch (error) {
    console.error(
      "Record exit interview error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to record exit interview",
    });
  }
}

/* =========================================================
   SETTLEMENT
========================================================= */

export async function computeSettlement(
  req: Request,
  res: Response
) {
  try {
    const {
      breakdown,
      override,
      overrideReason,
    } = req.body;

    const data =
      await separationService.computeSettlement(
        req.params.id,
        breakdown,
        Boolean(override),
        overrideReason
      );

    if ("error" in data) {
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error(
      "Compute settlement error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to compute settlement",
    });
  }
}

/* =========================================================
   REVOKE ACCESS
========================================================= */

export async function revokeAccess(
  req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.revokeAccess(
        req.params.id
      );

    res.json(data);
  } catch (error) {
    console.error(
      "Revoke access error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to revoke access",
    });
  }
}

/* =========================================================
   ALUMNI
========================================================= */

export async function convertToAlumni(
  req: Request,
  res: Response
) {
  try {
    const {
      tenure,
      role,
      eligibleForRehire,
    } = req.body;

    const data =
      await separationService.convertToAlumni(
        req.params.id,
        tenure,
        role,
        Boolean(eligibleForRehire)
      );

    res.status(201).json(data);
  } catch (error) {
    console.error(
      "Convert to alumni error:",
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to convert to alumni",
    });
  }
}

export async function getAlumni(
  _req: Request,
  res: Response
) {
  try {
    const data =
      await separationService.getAlumni();

    res.json(data);
  } catch (error) {
    console.error("Get alumni error:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch alumni",
    });
  }
}