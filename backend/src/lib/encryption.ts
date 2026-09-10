import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.PII_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("PII_ENCRYPTION_KEY is not configured");
  }

  return crypto
    .createHash("sha256")
    .update(secret)
    .digest();
}

export function encryptPII(value: string): string {
  if (!value) return value;

  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptPII(value: string): string {
  if (!value) return value;

  const [ivBase64, authTagBase64, encryptedBase64] =
    value.split(".");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted PII value");
  }

  const key = getKey();

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}