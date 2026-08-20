import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { jsonSafe } from "../lib/crypto";
import { logger } from "../lib/logger";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "LOGIN" | "LOGOUT" | "REFRESH" | "CANCEL";

/**
 * Append-only audit log. Every write/approval is recorded with the actor,
 * before/after state (JSONB) and an immutable timestamp. Retention and
 * read-access are controlled at the Admin/Auditor layer (spec Module 23).
 */
export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  try {
    const data: Prisma.AuditLogCreateInput = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue !== undefined ? (jsonSafe(input.oldValue) as Prisma.InputJsonValue) : Prisma.DbNull,
      newValue: input.newValue !== undefined ? (jsonSafe(input.newValue) as Prisma.InputJsonValue) : Prisma.DbNull,
      actor: input.actorUserId ? { connect: { id: input.actorUserId } } : undefined,
    };
    await prisma.auditLog.create({ data });
  } catch (err) {
    // Audit failures must never break the primary operation.
    logger.error({ err, input: { entityType: input.entityType, action: input.action } }, "Audit log write failed");
  }
}
