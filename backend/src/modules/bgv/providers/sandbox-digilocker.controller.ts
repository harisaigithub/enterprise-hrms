import type { Request, Response, NextFunction } from "express";
import { Prisma, BGVVerificationStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

type AuthRequest = Request & { auth?: { employeeId?: string; role?: string } };
type ApiObject = Record<string, any>;

const ALLOWED_HOSTS = new Set(["test-api.sandbox.co.in", "api.sandbox.co.in"]);
const TIMEOUT_MS = 15000;

function fail(message: string, statusCode = 400): Error {
  return Object.assign(new Error(message), { statusCode });
}
function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw fail(`${name} is not configured`, 503);
  return value;
}
function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function getHost(): string {
  const base = process.env.SANDBOX_API_BASE_URL?.trim() || "https://test-api.sandbox.co.in";
  const parsed = new URL(base);
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw fail("SANDBOX_API_BASE_URL must be an approved Sandbox HTTPS host", 500);
  }
  return parsed.origin;
}
async function postJson<T extends ApiObject>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: abort.signal,
      headers: { accept: "application/json", "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw fail(`DigiLocker provider request failed (${response.status})`, 502);
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}
async function accessToken(host: string): Promise<string> {
  const data = await postJson<ApiObject>(`${host}/authenticate`, {}, {
    "x-api-key": env("SANDBOX_API_KEY"),
    "x-api-secret": env("SANDBOX_API_SECRET"),
    "x-api-version": process.env.SANDBOX_API_VERSION || "1.0.0",
  });
  const token = data.access_token || data.data?.access_token;
  if (typeof token !== "string" || !token) throw fail("Sandbox authentication response did not contain an access token", 502);
  return token;
}

/**
 * Starts a candidate-consented DigiLocker session. This only initiates the handoff;
 * it intentionally does not mark the verification CLEAR. The callback/document
 * retrieval step must be completed and validated before a final result is written.
 */
export async function initiateDigiLockerSessionController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const actorId = req.auth?.employeeId;
    if (!actorId) throw fail("Authenticated employee context is required", 403);
    if (req.body?.candidateConsent !== true) throw fail("Explicit candidateConsent=true is required", 400);

    const verificationId = req.params.verificationId;
    const verification = await prisma.bGVVerification.findUnique({
      where: { id: verificationId },
      select: { id: true, caseId: true, type: true, status: true, assignedToId: true, source: true, remarks: true },
    });
    if (!verification) return res.status(404).json({ message: "BGV verification not found" });
    if (!["IDENTITY", "ADDRESS"].includes(verification.type)) {
      return res.status(400).json({
        message: "This DigiLocker adapter currently supports IDENTITY (Aadhaar/PAN document handoff) and ADDRESS (Aadhaar address-proof handoff). Education and employment require their own issuer/provider contracts.",
      });
    }
    if (verification.assignedToId && verification.assignedToId !== actorId &&
        !["HR_ADMIN", "SUPER_ADMIN", "ADMIN"].includes(req.auth?.role ?? "")) {
      throw fail("Only the assigned verifier or an authorized administrator can initiate this check", 403);
    }

    const redirectUrl = env("BGV_DIGILOCKER_REDIRECT_URL");
    const redirect = new URL(redirectUrl);
    const allowedRedirectHosts = (process.env.BGV_DIGILOCKER_REDIRECT_HOSTS || "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (redirect.protocol !== "https:" || !allowedRedirectHosts.includes(redirect.hostname.toLowerCase())) {
      throw fail("BGV_DIGILOCKER_REDIRECT_URL must be HTTPS and its hostname must be listed in BGV_DIGILOCKER_REDIRECT_HOSTS", 500);
    }

    const host = getHost();
    const token = await accessToken(host);
    const requestedDocTypes = verification.type === "ADDRESS" ? ["aadhaar"] : ["aadhaar", "pan"];
    const providerResponse = await postJson<ApiObject>(`${host}/kyc/digilocker/sessions/init`, {
      "@entity": "in.co.sandbox.kyc.digilocker.session.request",
      flow: "signin",
      redirect_url: redirectUrl,
      doc_types: requestedDocTypes,
      options: { verification_method: ["aadhaar"], pinless: true, usernameless: true },
    }, {
      authorization: token,
      "x-api-key": env("SANDBOX_API_KEY"),
      "x-api-version": process.env.SANDBOX_API_VERSION || "1.0.0",
    });

    const data = providerResponse.data ?? {};
    if (typeof data.authorization_url !== "string" || typeof data.session_id !== "string") {
      throw fail("DigiLocker provider response is missing authorization_url/session_id", 502);
    }
    const transactionId = typeof providerResponse.transaction_id === "string" ? providerResponse.transaction_id : null;
    const now = new Date();
    const previousRemarks = (() => {
      try { return verification.remarks ? JSON.parse(verification.remarks) : {}; } catch { return {}; }
    })();
    const summary = {
      ...previousRemarks,
      providerCheck: {
        provider: "SANDBOX_DIGILOCKER",
        state: "SESSION_INITIATED",
        sessionId: data.session_id,
        transactionId,
        requestedDocTypes,
        consent: true,
        initiatedAt: now.toISOString(),
        initiatedByEmployeeId: actorId,
      },
    };

    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.bGVVerification.update({
        where: { id: verification.id },
        data: {
          status: (verification.status === "PENDING" || verification.status === "ASSIGNED" ? "IN_PROGRESS" : verification.status) as BGVVerificationStatus,
          startedAt: verification.status === "PENDING" || verification.status === "ASSIGNED" ? now : undefined,
          source: "SANDBOX_DIGILOCKER",
          remarks: JSON.stringify(summary),
        },
        select: { id: true, caseId: true, type: true, status: true, source: true, startedAt: true },
      });
      await tx.bGVAudit.create({
        data: {
          caseId: verification.caseId,
          actorId,
          action: "BGV_DIGILOCKER_SESSION_INITIATED",
          oldValue: safeJson({ status: verification.status, source: verification.source }),
          newValue: safeJson({ verificationId: verification.id, type: verification.type, provider: "SANDBOX_DIGILOCKER", transactionId, requestedDocTypes }),
          ipAddress: req.ip,
          userAgent: req.get("user-agent")?.slice(0, 1000),
        },
      });
      return updated;
    });

    return res.status(201).json({
      data: saved,
      provider: "SANDBOX_DIGILOCKER",
      state: "SESSION_INITIATED",
      authorizationUrl: data.authorization_url,
      transactionId,
      nextStep: "Redirect the candidate to authorizationUrl. Do not mark this verification CLEAR until the provider callback and document retrieval are implemented and validated.",
    });
  } catch (error) {
    return next(error);
  }
}
