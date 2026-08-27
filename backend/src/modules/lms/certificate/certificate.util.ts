import crypto from "node:crypto";

export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();

  const random = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `CERT-${year}-${random}`;
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function sha256(buffer: Buffer): string {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}