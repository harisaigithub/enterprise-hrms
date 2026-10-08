import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { BGVCaseStatus } from "@prisma/client";

export interface CreateBgvStatusHistoryInput {
  caseId: string;
  fromStatus?: BGVCaseStatus | null;
  toStatus: BGVCaseStatus;
  changedById?: string | null;
  reason?: string | null;
}

export interface BgvStatusHistoryFilters {
  caseId?: string;
  fromStatus?: BGVCaseStatus;
  toStatus?: BGVCaseStatus;
  changedById?: string;
  page?: number;
  limit?: number;
}

const BGV_STATUS_HISTORY_INCLUDE = {
  case: {
    select: {
      id: true,
      status: true,
    },
  },
  changedBy: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

function normalizeOptionalText(value?: string | null): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = value.trim();
  return normalized || null;
}

async function assertCaseExists(caseId: string) {
  const existing = await prisma.bGVCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    throw AppError.notFound("BGV case not found");
  }

  return existing;
}

async function assertEmployeeExists(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!employee) {
    throw AppError.notFound("Employee not found");
  }

  return employee;
}

async function assertStatusHistoryExists(historyId: string) {
  const history = await prisma.bGVStatusHistory.findUnique({
    where: { id: historyId },
    include: BGV_STATUS_HISTORY_INCLUDE,
  });

  if (!history) {
    throw AppError.notFound("BGV status history record not found");
  }

  return history;
}

export async function getBgvStatusHistory(historyId: string) {
  return assertStatusHistoryExists(historyId);
}

export async function listBgvStatusHistory(
  filters: BgvStatusHistoryFilters = {}
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.caseId && { caseId: filters.caseId }),
    ...(filters.fromStatus && { fromStatus: filters.fromStatus }),
    ...(filters.toStatus && { toStatus: filters.toStatus }),
    ...(filters.changedById && { changedById: filters.changedById }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.bGVStatusHistory.findMany({
      where,
      include: BGV_STATUS_HISTORY_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.bGVStatusHistory.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getBgvCaseStatusHistory(caseId: string) {
  await assertCaseExists(caseId);

  return prisma.bGVStatusHistory.findMany({
    where: { caseId },
    include: BGV_STATUS_HISTORY_INCLUDE,
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLatestBgvStatusHistory(caseId: string) {
  await assertCaseExists(caseId);

  return prisma.bGVStatusHistory.findFirst({
    where: { caseId },
    include: BGV_STATUS_HISTORY_INCLUDE,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createBgvStatusHistory(
  input: CreateBgvStatusHistoryInput
) {
  const caseRecord = await assertCaseExists(input.caseId);

  if (input.changedById) {
    await assertEmployeeExists(input.changedById);
  }

  if (
    input.fromStatus !== undefined &&
    input.fromStatus !== null &&
    input.fromStatus !== caseRecord.status
  ) {
    throw AppError.badRequest(
      `fromStatus "${input.fromStatus}" does not match current case status "${caseRecord.status}"`
    );
  }

  if (input.fromStatus === input.toStatus) {
    throw AppError.badRequest(
      "fromStatus and toStatus cannot be the same"
    );
  }

  return prisma.bGVStatusHistory.create({
    data: {
      caseId: input.caseId,
      fromStatus: input.fromStatus ?? caseRecord.status,
      toStatus: input.toStatus,
      changedById: input.changedById ?? null,
      reason: normalizeOptionalText(input.reason),
    },
    include: BGV_STATUS_HISTORY_INCLUDE,
  });
}

export async function countBgvStatusHistory(caseId?: string) {
  return prisma.bGVStatusHistory.count({
    where: caseId ? { caseId } : undefined,
  });
}
