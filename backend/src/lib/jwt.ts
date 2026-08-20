import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errors";

export interface AccessTokenPayload {
  sub: string; // user id
  role: string; // role name (ADMIN, HR, MANAGER, EMPLOYEE)
  permissions: string[];
  employeeId?: string; // linked employee UUID (if any)
  employeeCode?: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  type: "refresh";
  jti: string; // unique token id (stored hashed in DB)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, type: "refresh", jti } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & AccessTokenPayload;
    return {
      sub: payload.sub,
      role: payload.role,
      permissions: payload.permissions ?? [],
      employeeId: payload.employeeId,
      employeeCode: payload.employeeCode,
    };
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & RefreshTokenPayload;
    if (payload.type !== "refresh") throw new Error("not a refresh token");
    return { sub: payload.sub, type: "refresh", jti: payload.jti };
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }
}
