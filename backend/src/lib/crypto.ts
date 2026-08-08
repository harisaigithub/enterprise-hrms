import crypto from "crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

/** Safely serialize a value for audit logging (avoids BigInt serialization errors). */
export function jsonSafe(value: unknown): unknown {
  if (value === undefined) return null;
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}
