import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyPassword, hashPassword } from "../../lib/password";
import { AppError } from "../../lib/errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { randomToken, sha256 } from "../../lib/crypto";
import { writeAuditLog } from "../../services/audit.service";
import { env } from "../../config/env";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (spec §23)

/** In-memory failed-login tracker: email -> { count, lockedUntil }. */
const failedLogins = new Map<string, { count: number; lockedUntil: number | null }>();
const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min (spec §23)

function isLocked(email: string): boolean {
  const entry = failedLogins.get(email);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) failedLogins.delete(email);
  return false;
}

function recordFailure(email: string): void {
  const entry = failedLogins.get(email) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  failedLogins.set(email, entry);
}

function resetFailures(email: string): void {
  failedLogins.delete(email);
}

interface LoginUser {
  user: {
    id: string;
    roleId: string;
    email: string;
    isActive: boolean;
    passwordHash: string;
  };
  permissions: string[];
  roleName: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: { title: string } | null;
  } | null;
}

async function loadUserWithPermissions(where: Prisma.UserWhereUniqueInput): Promise<LoginUser | null> {
  const user = await prisma.user.findUnique({
    where,
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      employee: { include: { designation: true } },
    },
  });
  if (!user) return null;
  return {
    user,
    roleName: user.role.name,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.code),
    employee: user.employee,
  };
}

export async function login(email: string, password: string, ip?: string) {
  const normalized = email.trim().toLowerCase();
  if (isLocked(normalized)) {
    throw AppError.forbidden("Account temporarily locked due to repeated failed attempts. Try again in 15 minutes.");
  }

  const account = await loadUserWithPermissions({ email: normalized });
  // Always run a compare to reduce timing side-channel on unknown emails.
  const dummyHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.xyzabcXYZabcXYZabcXYZabcXYZabcXYZabcXYZa";
  const valid = account ? await verifyPassword(password, account.user.passwordHash) : await verifyPassword(password, dummyHash);

  if (!account || !valid) {
    recordFailure(normalized);
    writeAuditLog({
      action: "LOGIN",
      entityType: "User",
      entityId: account?.user.id ?? null,
      newValue: { email: normalized, ip, success: false },
    });
    throw AppError.unauthorized("Invalid email or password");
  }

  if (!account.user.isActive) {
    throw AppError.forbidden("This account has been deactivated. Contact your administrator.");
  }

  resetFailures(normalized);

  await prisma.user.update({ where: { id: account.user.id }, data: { lastLogin: new Date() } });

  const accessToken = signAccessToken({
    sub: account.user.id,
    role: account.roleName,
    permissions: account.permissions,
    employeeId: account.employee?.id,
    employeeCode: account.employee?.employeeCode,
  });

  const refreshToken = await issueRefreshToken(account.user.id);
  const avatar = account.employee
    ? `https://i.pravatar.cc/150?img=${Number(account.employee.employeeCode.replace(/\D/g, "")) || 1}`
    : "";

  writeAuditLog({
    action: "LOGIN",
    entityType: "User",
    entityId: account.user.id,
    newValue: { email: normalized, ip, success: true },
  });

  return {
    user: {
      id: account.employee?.employeeCode ?? account.user.id,
      firstName: account.employee?.firstName ?? "",
      lastName: account.employee?.lastName ?? "",
      email: account.user.email,
      avatar,
      role: account.roleName,
      designation: account.employee?.designation?.title ?? "",
    },
    token: accessToken,
    refreshToken,
    permissions: account.permissions,
  };
}

async function issueRefreshToken(userId: string): Promise<string> {
  const jti = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(jti),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return signRefreshToken(userId, jti);
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = sha256(payload.jti);
  const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });

  if (!stored || stored.revokedAt) {
    throw AppError.unauthorized("Refresh token is invalid or revoked");
  }
  if (stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token has expired");
  }

  // Rotate: revoke the used token, issue a fresh one (reuse detection).
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const account = await loadUserWithPermissions({ id: payload.sub });
  if (!account || !account.user.isActive) {
    throw AppError.unauthorized("Account is inactive or no longer exists");
  }

  const accessToken = signAccessToken({
    sub: account.user.id,
    role: account.roleName,
    permissions: account.permissions,
    employeeId: account.employee?.id,
    employeeCode: account.employee?.employeeCode,
  });
  const newRefreshToken = await issueRefreshToken(account.user.id);

  writeAuditLog({
    action: "REFRESH",
    entityType: "User",
    entityId: account.user.id,
    newValue: { rotated: true },
  });

  return { token: accessToken, refreshToken: newRefreshToken, permissions: account.permissions };
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(payload.jti) },
      data: { revokedAt: new Date() },
    });
  } else {
    // Revoke all refresh tokens for the user (session invalidation).
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  }
  writeAuditLog({ action: "LOGOUT", entityType: "User", entityId: userId, newValue: { at: new Date().toISOString() } });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw AppError.unauthorized("Current password is incorrect");
  }
  if (newPassword.length < 8) {
    throw AppError.badRequest("New password must be at least 8 characters");
  }
  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  // Invalidate all existing refresh tokens after password change (spec §23).
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  writeAuditLog({ action: "UPDATE", entityType: "User", entityId: userId, newValue: { passwordChanged: true } });
}

export function getFailedLoginState() {
  return { activeLockouts: [...failedLogins.entries()].filter(([, v]) => v.lockedUntil && v.lockedUntil > Date.now()).length };
}
