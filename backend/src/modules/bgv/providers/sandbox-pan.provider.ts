/**
 * Sandbox PAN verification adapter.
 * Server-side only. Test host is the default.
 */
type TokenResponse = { access_token?: string; data?: { access_token?: string } };

export type SandboxPanInput = {
  pan: string;
  nameAsPerPan: string;
  dateOfBirth: string; // DD/MM/YYYY
  consent: "Y";
  reason: string;
};

export type SandboxPanResult = {
  provider: "SANDBOX";
  environment: "test" | "production";
  verified: boolean | null;
  panStatus: string | null;
  nameMatch: boolean | null;
  dateOfBirthMatch: boolean | null;
  aadhaarSeedingStatus: string | null;
  remarks: string | null;
  transactionId: string | null;
  rawCode: number | null;
};

const PAN_RE = /^[A-Z]{3}[PCFTGHLABJ][A-Z][0-9]{4}[A-Z]$/;
const TIMEOUT_MS = 15_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getBaseUrl(): string {
  const value = process.env.SANDBOX_API_BASE_URL?.trim()
    || "https://test-api.sandbox.co.in";
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    !["test-api.sandbox.co.in", "api.sandbox.co.in"].includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error("SANDBOX_API_BASE_URL must be an approved Sandbox HTTPS host");
  }
  return parsed.origin;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`Sandbox API request failed (${response.status})`);
      Object.assign(error, { statusCode: response.status });
      throw error;
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(host: string): Promise<string> {
  const apiKey = requiredEnv("SANDBOX_API_KEY");
  const apiSecret = requiredEnv("SANDBOX_API_SECRET");
  const response = await requestJson<TokenResponse>(`${host}/authenticate`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      "x-api-version": process.env.SANDBOX_API_VERSION || "1.0.0",
    },
    body: JSON.stringify({}),
  });
  const token = response.access_token || response.data?.access_token;
  if (!token) throw new Error("Sandbox authentication response did not contain an access token");
  return token;
}

export async function verifyPanWithSandbox(
  input: SandboxPanInput,
): Promise<SandboxPanResult> {
  const pan = input.pan.trim().toUpperCase();
  const name = input.nameAsPerPan.trim();
  const dob = input.dateOfBirth.trim();
  const reason = input.reason.trim();

  if (!PAN_RE.test(pan)) throw new Error("PAN format is invalid");
  if (!name) throw new Error("Name as per PAN is required");
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    throw new Error("dateOfBirth must use DD/MM/YYYY");
  }
  if (input.consent !== "Y") throw new Error("Candidate consent is required");
  if (!reason) throw new Error("Verification reason is required");

  const host = getBaseUrl();
  const apiKey = requiredEnv("SANDBOX_API_KEY");
  const token = await getAccessToken(host);

  type VerifyResponse = {
    code?: number;
    transaction_id?: string;
    data?: {
      status?: string;
      pan_status?: string;
      name_as_per_pan_match?: boolean;
      date_of_birth_match?: boolean;
      aadhaar_seeding_status?: string;
      remarks?: string | null;
    };
  };

  const response = await requestJson<VerifyResponse>(`${host}/kyc/pan/verify`, {
    method: "POST",
    headers: {
      authorization: token, // Provider docs specify no "Bearer" prefix.
      "x-api-key": apiKey,
      "x-api-version": process.env.SANDBOX_API_VERSION || "1.0.0",
    },
    body: JSON.stringify({
      "@entity": "in.co.sandbox.kyc.pan_verification.request",
      pan,
      name_as_per_pan: name,
      date_of_birth: dob,
      consent: "Y",
      reason,
    }),
  });

  const data = response.data || {};
  const status = String(data.status || data.pan_status || "").toLowerCase();
  const nameMatch = typeof data.name_as_per_pan_match === "boolean"
    ? data.name_as_per_pan_match : null;
  const dobMatch = typeof data.date_of_birth_match === "boolean"
    ? data.date_of_birth_match : null;

  // Do not convert an incomplete response into a pass/fail.
  const verified = status === "valid" && nameMatch === true && dobMatch === true
    ? true
    : status === "invalid" || nameMatch === false || dobMatch === false
      ? false : null;

  return {
    provider: "SANDBOX",
    environment: new URL(host).hostname === "api.sandbox.co.in" ? "production" : "test",
    verified,
    panStatus: status || null,
    nameMatch,
    dateOfBirthMatch: dobMatch,
    aadhaarSeedingStatus: typeof data.aadhaar_seeding_status === "string"
      ? data.aadhaar_seeding_status : null,
    remarks: typeof data.remarks === "string" ? data.remarks : null,
    transactionId: typeof response.transaction_id === "string"
      ? response.transaction_id : null,
    rawCode: typeof response.code === "number" ? response.code : null,
  };
}
