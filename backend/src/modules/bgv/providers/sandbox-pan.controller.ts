import type { NextFunction, Request, Response } from "express";
import { verifyPanWithSandbox } from "./sandbox-pan.provider";

/**
 * POST /bgv/provider-checks/pan
 * This controller is mounted inside bgv.routes.ts, which applies authenticate.
 * Do not expose this route publicly or call it from the browser directly.
 */
export async function verifyPanWithSandboxController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { pan, nameAsPerPan, dateOfBirth, consent, reason } = req.body ?? {};
    if (
      typeof pan !== "string" ||
      typeof nameAsPerPan !== "string" ||
      typeof dateOfBirth !== "string" ||
      typeof reason !== "string" ||
      consent !== "Y"
    ) {
      return res.status(400).json({
        message: "pan, nameAsPerPan, dateOfBirth, reason and explicit consent='Y' are required",
      });
    }

    const data = await verifyPanWithSandbox({
      pan, nameAsPerPan, dateOfBirth, consent: "Y", reason,
    });
    // Never return the submitted PAN or raw provider payload.
    return res.status(200).json({ data });
  } catch (error) {
    return next(error);
  }
}
