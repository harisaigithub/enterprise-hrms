import crypto from "crypto";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import minioClient, { MINIO_BUCKET, ensureMinioBucket } from "../../config/minio";


const RECEIPT_FOLDER = "expense-receipts";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/* =========================================================
   TYPES
========================================================= */

export interface ReceiptUploadInput {
  employeeId: string;
  claimId?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface UploadUrlInput {
  employeeId: string;
  claimId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CompleteUploadInput {
  claimId: string;
  objectName: string;
  fileId?: string;
}

interface ReceiptActor {
  employeeId?: string;
  role?: string;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeRole(role?: string): string {
  return String(role ?? "").toUpperCase();
}

function validateReceiptFile(
  fileName: string,
  mimeType: string,
  size: number
): void {
  if (!fileName?.trim()) {
    throw AppError.badRequest("Receipt file name is required.");
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw AppError.badRequest(
      `Unsupported receipt file type. Allowed types: ${ALLOWED_MIME_TYPES.join(
        ", "
      )}`
    );
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw AppError.badRequest("Receipt file is empty or invalid.");
  }

  if (size > MAX_FILE_SIZE) {
    throw AppError.badRequest("Receipt file must not exceed 10 MB.");
  }
}

function getSafeExtension(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).toLowerCase();

  if (ext) {
    return ext.replace(/[^a-z0-9.]/gi, "");
  }

  const mimeExtensionMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
  };

  return mimeExtensionMap[mimeType] ?? "";
}

function generateObjectName(
  employeeId: string,
  fileName: string,
  mimeType: string
): string {
  const extension = getSafeExtension(fileName, mimeType);

  return `${RECEIPT_FOLDER}/${employeeId}/${Date.now()}-${uuidv4()}${extension}`;
}

function calculateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function uploadReceiptToMinio(
  buffer: Buffer,
  objectName: string,
  mimeType: string
): Promise<void> {
  await ensureMinioBucket();

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    buffer,
    buffer.length,
    {
      "Content-Type": mimeType,
    }
  );
}

async function getClaim(claimId: string) {
  const claim = await prisma.expenseClaim.findUnique({
    where: {
      id: claimId,
    },
  });

  if (!claim) {
    throw AppError.notFound("Expense claim not found.");
  }

  return claim;
}

function ensureClaimAllowsReceipt(claim: {
  status: string;
}): void {
  const allowedStatuses = [
    "Draft",
    "Submitted",
    "Manager Pending",
    "Finance Pending",
  ];

  if (!allowedStatuses.includes(claim.status)) {
    throw AppError.badRequest(
      `Receipt cannot be changed when expense claim is ${claim.status}.`
    );
  }
}

async function ensureEmployeeOwnsClaim(
  claimEmployeeId: string,
  actor?: ReceiptActor,
  fallbackEmployeeId?: string
): Promise<void> {
  const actorEmployeeId = actor?.employeeId ?? fallbackEmployeeId;

  if (
    actorEmployeeId &&
    claimEmployeeId !== actorEmployeeId
  ) {
    throw AppError.forbidden(
      "You cannot upload a receipt for another employee's expense claim."
    );
  }
}

/* =========================================================
   DIRECT BACKEND → MINIO UPLOAD
========================================================= */

export async function uploadReceipt(
  input: ReceiptUploadInput,
  actor?: ReceiptActor
) {
  validateReceiptFile(
    input.fileName,
    input.mimeType,
    input.buffer.length
  );

  const claim = input.claimId
    ? await getClaim(input.claimId)
    : null;

  if (claim) {
    ensureClaimAllowsReceipt(claim);

    await ensureEmployeeOwnsClaim(
      claim.employeeId,
      actor,
      input.employeeId
    );
  }

  const employeeId =
    actor?.employeeId ?? input.employeeId;

  if (!employeeId) {
    throw AppError.badRequest(
      "Employee information is required for receipt upload."
    );
  }

  const objectName = generateObjectName(
    employeeId,
    input.fileName,
    input.mimeType
  );

  const fileHash = calculateHash(input.buffer);

  /*
   * Duplicate receipt check.
   * We do not block the upload; we return a warning instead.
   */
  const duplicateReceipt = await prisma.expenseReceipt.findFirst({
    where: {
      fileHash,
      ...(input.claimId
        ? {
          claimId: {
            not: input.claimId,
          },
        }
        : {}),
    },
    select: {
      id: true,
      claimId: true,
    },
  });

  await uploadReceiptToMinio(
    input.buffer,
    objectName,
    input.mimeType
  );

  let receipt;

  if (input.claimId) {
    receipt = await prisma.expenseReceipt.create({
      data: {
        claimId: input.claimId,
        minioObjectName: objectName,
        fileName: input.fileName,
        fileSize: input.buffer.length,
        mimeType: input.mimeType,
        fileHash,
        uploadedBy: employeeId,
      },
    });

    await prisma.expenseClaim.update({
      where: {
        id: input.claimId,
      },
      data: {
        receiptPending: false,
      },
    });
  }

  return {
    receipt,
    objectName,
    fileHash,
    duplicateWarning: Boolean(duplicateReceipt),
    duplicateReceiptId: duplicateReceipt?.id ?? null,
  };
}

/* =========================================================
   LEGACY / COMPATIBILITY PRESIGNED UPLOAD
========================================================= */

export async function generateUploadUrl(
  input: UploadUrlInput,
  actor?: ReceiptActor
) {
  validateReceiptFile(
    input.fileName,
    input.mimeType,
    input.fileSize
  );

  await ensureMinioBucket();

  const claim = input.claimId
    ? await getClaim(input.claimId)
    : null;

  if (claim) {
    ensureClaimAllowsReceipt(claim);

    await ensureEmployeeOwnsClaim(
      claim.employeeId,
      actor,
      input.employeeId
    );
  }

  const employeeId =
    actor?.employeeId ?? input.employeeId;

  if (!employeeId) {
    throw AppError.badRequest(
      "Employee information is required for receipt upload."
    );
  }

  const objectName = generateObjectName(
    employeeId,
    input.fileName,
    input.mimeType
  );

  const uploadUrl = await minioClient.presignedPutObject(
    MINIO_BUCKET,
    objectName,
    SIGNED_URL_EXPIRY_SECONDS
  );

  /*
   * Keep existing placeholder behaviour for the
   * current frontend/controller until it is migrated
   * to uploadReceipt().
   */
  if (claim) {
    await prisma.expenseReceipt.create({
      data: {
        claimId: claim.id,
        minioObjectName: objectName,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash: "pending",
        uploadedBy: employeeId,
      },
    });

    await prisma.expenseClaim.update({
      where: {
        id: claim.id,
      },
      data: {
        receiptPending: true,
      },
    });
  }

  return {
    uploadUrl,
    objectName,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  };
}

/* =========================================================
   COMPLETE PRESIGNED UPLOAD
========================================================= */

export async function completeReceiptUpload(
  input: CompleteUploadInput,
  actor?: ReceiptActor
) {
  const claim = await getClaim(input.claimId);

  ensureClaimAllowsReceipt(claim);

  await ensureEmployeeOwnsClaim(
    claim.employeeId,
    actor
  );

  await ensureMinioBucket();

  let stat;

  try {
    stat = await minioClient.statObject(
      MINIO_BUCKET,
      input.objectName
    );
  } catch {
    throw AppError.badRequest(
      "Receipt was not uploaded to MinIO."
    );
  }

  if (!stat.size || stat.size <= 0) {
    throw AppError.badRequest(
      "Uploaded receipt is empty."
    );
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw AppError.badRequest(
      "Receipt file must not exceed 10 MB."
    );
  }

  const stream = await minioClient.getObject(
    MINIO_BUCKET,
    input.objectName
  );

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  const buffer = Buffer.concat(chunks);

  const fileHash = calculateHash(buffer);

  const duplicateReceipt =
    await prisma.expenseReceipt.findFirst({
      where: {
        fileHash,
        claimId: {
          not: input.claimId,
        },
      },
      select: {
        id: true,
        claimId: true,
      },
    });

  const existingReceipt =
    await prisma.expenseReceipt.findFirst({
      where: {
        claimId: input.claimId,
        minioObjectName: input.objectName,
      },
    });

  let receipt;

  if (existingReceipt) {
    receipt = await prisma.expenseReceipt.update({
      where: {
        id: existingReceipt.id,
      },
      data: {
        fileHash,
      },
    });
  } else {
    const mimeType =
      stat.metaData?.["content-type"] ||
      stat.metaData?.["Content-Type"] ||
      "application/octet-stream";

    const fileName =
      stat.metaData?.["x-amz-meta-filename"] ||
      path.basename(input.objectName);

    receipt = await prisma.expenseReceipt.create({
      data: {
        claimId: input.claimId,
        minioObjectName: input.objectName,
        fileName,
        fileSize: stat.size,
        mimeType,
        fileHash,
        uploadedBy:
          actor?.employeeId ?? claim.employeeId,
      },
    });
  }

  await prisma.expenseClaim.update({
    where: {
      id: input.claimId,
    },
    data: {
      receiptPending: false,
    },
  });

  return {
    receipt,
    duplicateWarning: Boolean(duplicateReceipt),
    duplicateReceiptId:
      duplicateReceipt?.id ?? null,
  };
}

/* =========================================================
   DOWNLOAD / VIEW RECEIPT
========================================================= */

export async function generateDownloadUrl(
  receiptId: string,
  actorEmployeeId: string,
  actorRole: string
) {
  const receipt = await prisma.expenseReceipt.findUnique({
    where: { id: receiptId },
    include: {
      claim: {
        select: {
          employeeId: true,
          status: true,
        },
      },
    },
  });

  if (!receipt) {
    throw AppError.notFound("Expense receipt not found");
  }

  const normalizedRole = actorRole.toUpperCase();

  const isOwner =
    receipt.claim.employeeId === actorEmployeeId;

  const isApprover = [
    "MANAGER",
    "FINANCE",
    "ADMIN",
    "HR",
  ].includes(normalizedRole);

  if (!isOwner && !isApprover) {
    throw AppError.forbidden(
      "You are not allowed to view this receipt"
    );
  }

  if (
    isOwner &&
    ![
      "Draft",
      "Submitted",
      "Manager Pending",
      "Finance Pending",
      "Approved",
    ].includes(receipt.claim.status)
  ) {
    throw AppError.forbidden(
      "Receipt cannot be viewed in the current claim status"
    );
  }

  const baseUrl =
    process.env.API_BASE_URL ||
    `http://localhost:${process.env.PORT || 4000}`;

  const downloadUrl =
    `${baseUrl}/uploads/expense/` +
    receipt.minioObjectName.replace(/^expense-receipts\//, "");

  return {
    receiptId: receipt.id,
    downloadUrl,
    fileName: receipt.fileName,
    mimeType: receipt.mimeType,
  };
}

/* =========================================================
   RECEIPT METADATA
========================================================= */

export async function getReceiptMetadata(
  receiptId: string,
  actorEmployeeId: string,
  actorRole: string
) {
  const receipt =
    await prisma.expenseReceipt.findUnique({
      where: {
        id: receiptId,
      },
      include: {
        claim: true,
      },
    });

  if (!receipt) {
    throw AppError.notFound(
      "Expense receipt not found."
    );
  }

  const normalizedRole =
    normalizeRole(actorRole);

  const isOwner =
    receipt.claim.employeeId === actorEmployeeId;

  const isApprover = [
    "MANAGER",
    "FINANCE",
    "ADMIN",
    "HR",
  ].includes(normalizedRole);

  if (!isOwner && !isApprover) {
    throw AppError.forbidden(
      "You are not allowed to view this receipt."
    );
  }

  return receipt;
}

/* =========================================================
   DELETE RECEIPT
========================================================= */

export async function deleteReceipt(
  receiptId: string,
  actorEmployeeId: string
) {
  const receipt =
    await prisma.expenseReceipt.findUnique({
      where: {
        id: receiptId,
      },
      include: {
        claim: true,
      },
    });

  if (!receipt) {
    throw AppError.notFound(
      "Expense receipt not found."
    );
  }

  if (
    receipt.claim.employeeId !== actorEmployeeId
  ) {
    throw AppError.forbidden(
      "You cannot delete another employee's receipt."
    );
  }

  if (receipt.claim.status !== "Draft") {
    throw AppError.badRequest(
      "Receipt can only be deleted while the expense claim is in Draft status."
    );
  }

  await ensureMinioBucket();

  try {
    await minioClient.removeObject(
      MINIO_BUCKET,
      receipt.minioObjectName
    );
  } catch {
    /*
     * Do not leave the DB record behind if MinIO
     * deletion itself failed.
     */
    throw AppError.badRequest(
      "Unable to delete receipt from MinIO."
    );
  }

  await prisma.expenseReceipt.delete({
    where: {
      id: receiptId,
    },
  });

  await prisma.expenseClaim.update({
    where: {
      id: receipt.claimId,
    },
    data: {
      receiptPending: false,
    },
  });

  return {
    success: true,
    receiptId,
  };
}