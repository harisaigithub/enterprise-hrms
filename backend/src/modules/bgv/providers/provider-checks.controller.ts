import type { NextFunction, Request, Response } from "express";
import { Prisma, BGVVerificationResult, BGVVerificationStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { createBgvAudit } from "../bgv.audit.service";
import { verifyPanWithSandbox } from "./sandbox-pan.provider";
import { getUnconfiguredProviderMessage, type BgvExternalCheckType } from "./provider-adapter.contract";

type AuthRequest = Request & { auth?: { employeeId?: string; role?: string } };

function actorId(req: AuthRequest): string {
  if (!req.auth?.employeeId) throw Object.assign(new Error("Authenticated employee is required"), { statusCode: 400 });
  return req.auth.employeeId;
}

function jsonSafe(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "string" && val.length > 1000) return val.slice(0, 1000);
    return val;
  }).slice(0, 6000);
}

/**
 * POST /bgv/provider-checks/:verificationId/pan
 * Persists the normalized provider result and writes an immutable BGV audit event.
 * Never stores the submitted PAN or the raw provider payload.
 */
export async function runAndSavePanCheckController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const actor = actorId(req);
    const { pan, nameAsPerPan, dateOfBirth, consent, reason } = req.body ?? {};
    if (typeof pan !== "string" || typeof nameAsPerPan !== "string" ||
        typeof dateOfBirth !== "string" || typeof reason !== "string" || consent !== "Y") {
      return res.status(400).json({ message: "pan, nameAsPerPan, dateOfBirth, reason and explicit consent='Y' are required" });
    }

    const verification = await prisma.bGVVerification.findUnique({
      where: { id: req.params.verificationId },
      select: { id: true, caseId: true, type: true, status: true, result: true, remarks: true },
    });
    if (!verification) return res.status(404).json({ message: "BGV verification not found" });
    if (verification.type !== "IDENTITY") return res.status(400).json({ message: "PAN checks require an IDENTITY verification" });

    const result = await verifyPanWithSandbox({ pan, nameAsPerPan, dateOfBirth, consent: "Y", reason });
    const normalizedResult: BGVVerificationResult =
      result.verified === true ? "CLEAR" :
      result.verified === false ? "DISCREPANCY" : "UNABLE_TO_VERIFY";
    const normalizedStatus: BGVVerificationStatus =
      result.verified === true ? "COMPLETED" :
      result.verified === false ? "DISCREPANCY" : "UNABLE_TO_VERIFY";

    const safeSummary = {
      provider: result.provider,
      environment: result.environment,
      verified: result.verified,
      panStatus: result.panStatus,
      nameMatch: result.nameMatch,
      dateOfBirthMatch: result.dateOfBirthMatch,
      aadhaarSeedingStatus: result.aadhaarSeedingStatus,
      remarks: result.remarks,
      transactionId: result.transactionId,
      rawCode: result.rawCode,
      checkedAt: new Date().toISOString(),
      // Deliberately omit PAN, DOB, candidate name and raw provider response.
    };

    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.bGVVerification.update({
        where: { id: verification.id },
        data: {
          result: normalizedResult,
          status: normalizedStatus,
          completedAt: new Date(),
          source: "SANDBOX_PAN_API",
          remarks: jsonSafe({ providerCheck: safeSummary }),
        },
        select: { id: true, caseId: true, type: true, status: true, result: true, source: true, completedAt: true, remarks: true },
      });
      return updated;
    });

    await createBgvAudit({
      caseId: verification.caseId,
      actorId: actor,
      action: "BGV_PROVIDER_PAN_CHECK",
      oldValue: { status: verification.status, result: verification.result },
      newValue: { verificationId: verification.id, status: normalizedStatus, result: normalizedResult, provider: "SANDBOX", transactionId: result.transactionId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || undefined,
    });

    return res.status(200).json({ data: saved });
  } catch (error) {
    return next(error);
  }
}


/**
 * Free/manual fallback for checks without a legitimately free universal API.
 * POST /bgv/provider-checks/:verificationId/manual-result
 * This records a human verifier's finding; it does NOT claim a government/provider lookup occurred.
 */
export async function submitManualProviderCheckController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const actorId = requireActor(req);
    const type = String(req.body?.type ?? "").toUpperCase();
    if (!(MANUAL_TYPES as readonly string[]).includes(type)) return res.status(400).json({ message: `type must be one of ${MANUAL_TYPES.join(", ")}` });
    const decision = String(req.body?.decision ?? "").toUpperCase();
    if (!["MATCH", "MISMATCH", "INCONCLUSIVE"].includes(decision)) return res.status(400).json({ message: "decision must be MATCH, MISMATCH, or INCONCLUSIVE" });
    const remarks = safeText(req.body?.remarks, "remarks", 3000);
    const evidenceRefs = req.body?.evidenceRefs;
    if (!Array.isArray(evidenceRefs) || evidenceRefs.length < 1 || evidenceRefs.length > 10 || evidenceRefs.some((v: unknown) => typeof v !== "string" || !v.trim() || v.length > 500)) {
      return res.status(400).json({ message: "evidenceRefs must contain 1–10 non-empty document IDs/secure storage references" });
    }
    if (req.body?.candidateConsent !== true) return res.status(400).json({ message: "candidateConsent=true is required before processing identity evidence" });

    const verification = await prisma.bGVVerification.findUnique({
      where: { id: req.params.verificationId },
      select: { id: true, caseId: true, type: true, status: true, result: true, assignedToId: true },
    });
    if (!verification) return res.status(404).json({ message: "BGV verification not found" });
    if (verification.type !== type) return res.status(400).json({ message: `Verification type is ${verification.type}; request type ${type} does not match` });
    if (verification.assignedToId && verification.assignedToId !== actorId && !["HR_ADMIN", "SUPER_ADMIN", "ADMIN"].includes(req.auth?.role ?? "")) {
      return res.status(403).json({ message: "Only the assigned verifier or an authorized administrator can submit this result" });
    }

    const result: BGVVerificationResult = decision === "MATCH" ? "CLEAR" : decision === "MISMATCH" ? "DISCREPANCY" : "UNABLE_TO_VERIFY";
    const status: BGVVerificationStatus = decision === "MATCH" ? "COMPLETED" : decision === "MISMATCH" ? "DISCREPANCY" : "UNABLE_TO_VERIFY";
    const summary = { method: "MANUAL_EVIDENCE_REVIEW", checkType: type, decision, evidenceRefs, remarks, reviewedAt: new Date().toISOString(), reviewedByEmployeeId: actorId };
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.bGVVerification.update({
        where: { id: verification.id },
        data: { status, result, completedAt: new Date(), source: "MANUAL_EVIDENCE_REVIEW", remarks: JSON.stringify({ providerCheck: summary }) },
        select: { id: true, caseId: true, type: true, status: true, result: true, source: true, completedAt: true, remarks: true },
      });
      await tx.bGVAudit.create({
        data: {
          caseId: verification.caseId, actorId, action: `BGV_MANUAL_${type}_CHECK`,
          oldValue: safeJson({ status: verification.status, result: verification.result }),
          newValue: safeJson({ verificationId: verification.id, type, decision, evidenceCount: evidenceRefs.length, result, status }),
          ipAddress: req.ip, userAgent: req.get("user-agent")?.slice(0, 1000),
        },
      });
      return updated;
    });
    return res.status(200).json({ data: saved, note: "Recorded as a human evidence review, not an automated external-provider verification." });
  } catch (error) { return next(error); }
}

/**
 * Diagnostic endpoint for future provider wiring. Fail-closed by design.
 * It never contacts an unspecified URL or reports a successful check.
 */
export async function getProviderReadinessController(req: Request, res: Response) {
  const type = String(req.params.type ?? "").toUpperCase() as BgvExternalCheckType;
  if (!(MANUAL_TYPES as readonly string[]).includes(type)) return res.status(400).json({ message: "Unsupported provider check type" });
  const envKey = ({ AADHAAR: "BGV_AADHAAR_PROVIDER", EDUCATION: "BGV_EDUCATION_PROVIDER", EMPLOYMENT: "BGV_EMPLOYMENT_PROVIDER", ADDRESS: "BGV_ADDRESS_PROVIDER" } as const)[type];
  const configured = Boolean(process.env[envKey]?.trim());
  return res.status(configured ? 200 : 501).json({
    type, automatedProviderConfigured: configured,
    message: configured ? "Provider name is configured, but an official-contract adapter and credentials must still be validated before production use." : getUnconfiguredProviderMessage(type),
  });
}
