import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

type JsonObject = Record<string, any>;

const DEFAULT_SECURITY_CONFIG: JsonObject = {
  passwordPolicy: { minLength: 12, requireUpper: true, requireNumber: true, requireSymbol: true, expiryDays: 90 },
  ipRestrictions: [{ id: "payroll-release", action: "Payroll Release", allowedCidrs: [], enabled: false }],
  sessionPolicy: { tokenLifetimeMinutes: 60, maxConcurrentSessions: 3 },
};

export async function getSecurityConfig(): Promise<JsonObject> {
  const row = await prisma.securityState.findUnique({ where: { key: "security_config" } });
  const stored = (row?.value as JsonObject | undefined) ?? {};
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...stored,
    passwordPolicy: { ...DEFAULT_SECURITY_CONFIG.passwordPolicy, ...(stored.passwordPolicy || {}) },
    sessionPolicy: { ...DEFAULT_SECURITY_CONFIG.sessionPolicy, ...(stored.sessionPolicy || {}) },
    ipRestrictions: stored.ipRestrictions || DEFAULT_SECURITY_CONFIG.ipRestrictions,
  };
}

export async function getUserSecurityState(userId: string): Promise<JsonObject> {
  const row = await prisma.securityState.findUnique({ where: { key: "user_security" } });
  return ((row?.value as Record<string, JsonObject> | undefined) ?? {})[userId] ?? {};
}

export async function passwordChangeRequired(userId: string, passwordChangedAt: Date): Promise<boolean> {
  const [config, state] = await Promise.all([getSecurityConfig(), getUserSecurityState(userId)]);
  const expiryDays = Number(config.passwordPolicy.expiryDays || 0);
  const expired = expiryDays > 0 && passwordChangedAt.getTime() + expiryDays * 86_400_000 < Date.now();
  return Boolean(state.forcePasswordResetPending || expired);
}

export async function clearForcedPasswordReset(userId: string): Promise<void> {
  const row = await prisma.securityState.findUnique({ where: { key: "user_security" } });
  const state = (row?.value as Record<string, JsonObject> | undefined) ?? {};
  state[userId] = { ...state[userId], forcePasswordResetPending: false };
  await prisma.securityState.upsert({
    where: { key: "user_security" },
    create: { key: "user_security", value: state as Prisma.InputJsonValue, updatedBy: userId },
    update: { value: state as Prisma.InputJsonValue, updatedBy: userId },
  });
}

export async function validatePasswordPolicy(password: string): Promise<void> {
  const { passwordPolicy } = await getSecurityConfig();
  const errors: string[] = [];
  if (password.length < Number(passwordPolicy.minLength || 12)) errors.push(`at least ${passwordPolicy.minLength || 12} characters`);
  if (passwordPolicy.requireUpper && !/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (passwordPolicy.requireNumber && !/\d/.test(password)) errors.push("one number");
  if (passwordPolicy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) errors.push("one symbol");
  if (errors.length) throw AppError.badRequest(`Password must contain ${errors.join(", ")}`);
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  if (isIP(ip) !== 4 || isIP(network) !== 4 || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask);
}

function normalizeIp(raw: string): string {
  const value = raw.trim().split(",")[0].trim();
  return value.startsWith("::ffff:") ? value.slice(7) : value;
}

export async function enforceIpRestriction(restrictionId: string, rawIp: string): Promise<void> {
  const config = await getSecurityConfig();
  const restriction = config.ipRestrictions.find((item: JsonObject) => item.id === restrictionId);
  if (!restriction?.enabled) return;
  const allowed = Array.isArray(restriction.allowedCidrs) ? restriction.allowedCidrs : [];
  const ip = normalizeIp(rawIp);
  if (!allowed.length || !allowed.some((cidr: string) => ipv4InCidr(ip, cidr))) {
    throw AppError.forbidden(`${restriction.action || "Restricted action"} is not allowed from this IP address`);
  }
}
