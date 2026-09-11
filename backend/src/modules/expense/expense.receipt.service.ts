import { randomUUID as uuidv4 } from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import minioClient, { MINIO_BUCKET, ensureMinioBucket } from "../../config/minio";
import { computeFileHash, generatePerceptualHash } from "./expense.duplicate.service";
import { sha256 } from "../../lib/crypto";
import { writeAuditLog } from "../../services/audit.service";
import { jsonSafe } from "../../lib/crypto";
import type { AccessTokenPayload } from "../../lib/jwt";

const RECEIPT_FOLDER = "expense-receipts";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/** Allowed MIME types for receipts (L3 security - receipts contain financial data) */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Max file size: 10MB for receipts */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Generate a unique object name for MinIO */
function generateObjectName(employeeId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  return `${RECEIPT_FOLDER}/${employeeId}/${timestamp}-${uuid}.${ext}`;
}

/** Validate file type and size */
export function validateReceiptFile(file: { mimeType: string; size: number }): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.mimeType as AllowedMimeType)) {
    return { valid: false, error: `File type ${file.mimeType} not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${file.size} bytes exceeds maximum of ${MAX_FILE_SIZE} bytes (10MB)` };
  }
  return { valid: true };
}

/** Generate presigned PUT URL for direct client upload to MinIO */
export async function generateUploadUrl(
  input: {
    employeeId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    claimId?: string;
  },
  actor?: AccessTokenPayload
): Promise<{ uploadUrl: string; objectName: string; fileId: string; expiresIn: number }> {
  // Validate
  const validation = validateReceiptFile({ mimeType: input.mimeType, size: input.fileSize });
  if (!validation.valid) throw AppError.badRequest(validation.error!);

  // Ensure bucket exists
  await ensureMinioBucket();

  const objectName = generateObjectName(input.employeeId, input.fileName);
  const fileId = uuidv4();

  // Generate presigned PUT URL
  const uploadUrl = await minioClient.presignedPutObject(MINIO_BUCKET, objectName, SIGNED_URL_EXPIRY_SECONDS);

  // Optionally pre-create a receipt record in "pending" state if claimId provided
  if (input.claimId) {
    const claim = await prisma.expenseClaim.findUnique({
      where: { id: input.claimId },
      select: { id: true, employeeId: true, status: true, isDraft: true },
    });

    if (!claim) throw AppError.notFound("Claim not found");
    if (claim.employeeId !== input.employeeId) throw AppError.forbidden("Cannot upload receipt for another employee's claim");
    if (!claim.isDraft && claim.status !== "Draft") {
      throw AppError.badRequest("Receipts can only be uploaded for draft claims");
    }

    // Create placeholder receipt record
    await prisma.expenseReceipt.create({
      data: {
        claimId: input.claimId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        minioObjectName: objectName,
        fileHash: "pending", // Will be updated after upload
        uploadedBy: actor?.employeeId ?? input.employeeId,
      },
    });

    // Update claim to mark receipt as pending
    await prisma.expenseClaim.update({
      where: { id: input.claimId },
      data: { receiptPending: true },
    });
  }

  return { uploadUrl, objectName, fileId, expiresIn: SIGNED_URL_EXPIRY_SECONDS };
}

/** Complete receipt upload after client uploads to MinIO */
export async function completeReceiptUpload(
  input: {
    claimId: string;
    objectName: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileBuffer?: Buffer; // If server-side upload, buffer is provided
  },
  actor?: AccessTokenPayload
): Promise<{ receiptId: string; fileHash: string; perceptualHash?: string }> {
const claim = await prisma.expenseClaim.findUnique({
    where: { id: input.claimId },
    select: { id: true, employeeId: true, status: true, isDraft: true },
  });

  if (!claim) throw AppError.notFound("Claim not found");
  if (!claim.isDraft && claim.status !== "Draft") {
    throw AppError.badRequest("Receipts can only be added to draft claims");
  }

  // Verify object exists in MinIO
  try {
    await minioClient.statObject(MINIO_BUCKET, input.objectName);
  } catch {
    throw AppError.badRequest("Uploaded file not found in storage");
  }

  // Compute hashes
  let fileHash: string;
  let perceptualHash: string | undefined;

  if (input.fileBuffer) {
    fileHash = computeFileHash(input.fileBuffer);
    perceptualHash = await generatePerceptualHash(input.fileBuffer);
  } else {
    // For client-side upload, we need to download to compute hash
    // In production, consider having client compute and send hash
    const stream = await minioClient.getObject(MINIO_BUCKET, input.objectName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fileHash = computeFileHash(buffer);
    perceptualHash = await generatePerceptualHash(buffer);
  }

  // Check for exact duplicate receipt (same hash)
  const existingReceipt = await prisma.expenseReceipt.findFirst({
    where: { fileHash },
    include: { claim: { select: { id: true, claimNumber: true, employeeId: true } } },
  });

  if (existingReceipt && existingReceipt.claimId !== input.claimId) {
    // Same receipt used in another claim - warn but allow (could be shared receipt)
    // Log audit for duplicate receipt usage
    writeAuditLog({
      action: "CREATE",
      entityType: "ExpenseReceipt",
      entityId: null,
      actorUserId: actor?.userId ?? null,
      newValue: jsonSafe({
        claimId: input.claimId,
        objectName: input.objectName,
        fileHash,
        duplicateOf: existingReceipt.claimId,
        duplicateClaimNumber: existingReceipt.claim.claimNumber,
      }),
    });
  }

// Create or update receipt record
  let receipt = await prisma.expenseReceipt.findFirst({
    where: { minioObjectName: input.objectName },
  });

  if (receipt) {
    receipt = await prisma.expenseReceipt.update({
      where: { id: receipt.id },
      data: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash,
        perceptualHash,
        uploadedBy: actor?.employeeId ?? claim.employeeId,
      },
    });
  } else {
    receipt = await prisma.expenseReceipt.create({
      data: {
        claimId: input.claimId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        minioObjectName: input.objectName,
        fileHash,
        perceptualHash,
        uploadedBy: actor?.employeeId ?? claim.employeeId,
      },
    });
  }

  // Update claim: receipt no longer pending
  await prisma.expenseClaim.update({
    where: { id: input.claimId },
    data: { receiptPending: false },
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpenseReceipt",
    entityId: receipt.id,
    actorUserId: actor?.userId ?? null,
    newValue: jsonSafe({
      claimId: input.claimId,
      fileName: input.fileName,
      fileHash,
      perceptualHash: perceptualHash?.substring(0, 16) + "...", // Truncate for log
    }),
  });

  return { receiptId: receipt.id, fileHash, perceptualHash };
}

/** Generate presigned GET URL for receipt download (authorization checked at route level) */
export async function generateDownloadUrl(
  receiptId: string,
  actorEmployeeId: string,
  actorRole: string
): Promise<{ downloadUrl: string; fileName: string; expiresIn: number }> {
  const receipt = await prisma.expenseReceipt.findUnique({
    where: { id: receiptId },
    include: { claim: { select: { employeeId: true, status: true } } },
  });

  if (!receipt) throw AppError.notFound("Receipt not found");

  // Authorization: employee can download their own, managers/finance/admins can download for approval
  const isOwner = receipt.claim.employeeId === actorEmployeeId;
  const isApprover = ["MANAGER", "FINANCE", "ADMIN", "HR"].includes(actorRole);

  if (!isOwner && !isApprover) {
    throw AppError.forbidden("Not authorized to download this receipt");
  }

  // For L3 data, verify claim is in a state that allows access
  if (isOwner && !["Draft", "Submitted", "Manager Pending", "Finance Pending", "Approved"].includes(receipt.claim.status)) {
    throw AppError.forbidden("Cannot access receipt for this claim status");
  }

  const downloadUrl = await minioClient.presignedGetObject(MINIO_BUCKET, receipt.minioObjectName, SIGNED_URL_EXPIRY_SECONDS);

  writeAuditLog({
    action: "CREATE",
    entityType: "ExpenseReceiptDownload",
    entityId: receiptId,
    actorUserId: actorEmployeeId,
    newValue: jsonSafe({ receiptId, fileName: receipt.fileName }),
  });

  return { downloadUrl, fileName: receipt.fileName, expiresIn: SIGNED_URL_EXPIRY_SECONDS };
}

/** Delete receipt (only for draft claims) */
export async function deleteReceipt(
  receiptId: string,
  actorEmployeeId: string,
  actor?: AccessTokenPayload
): Promise<void> {
  const receipt = await prisma.expenseReceipt.findUnique({
    where: { id: receiptId },
    include: { claim: { select: { employeeId: true, status: true, isDraft: true } } },
  });

  if (!receipt) throw AppError.notFound("Receipt not found");
  if (receipt.claim.employeeId !== actorEmployeeId) throw AppError.forbidden("Cannot delete another employee's receipt");
  if (!receipt.claim.isDraft && receipt.claim.status !== "Draft") {
    throw AppError.badRequest("Cannot delete receipt from non-draft claim");
  }

  // Delete from MinIO
  try {
    await minioClient.removeObject(MINIO_BUCKET, receipt.minioObjectName);
  } catch (err) {
    // Log but don't fail - MinIO might be temporarily unavailable
    console.error("MinIO delete failed:", err);
  }

  // Delete from database
  await prisma.expenseReceipt.delete({ where: { id: receiptId } });

  // If no more receipts, clear receiptPending flag
  const remainingReceipts = await prisma.expenseReceipt.count({ where: { claimId: receipt.claimId } });
  if (remainingReceipts === 0) {
    await prisma.expenseClaim.update({
      where: { id: receipt.claimId },
      data: { receiptPending: false },
    });
  }

  writeAuditLog({
    action: "DELETE",
    entityType: "ExpenseReceipt",
    entityId: receiptId,
    actorUserId: actor?.userId ?? null,
    oldValue: jsonSafe({ claimId: receipt.claimId, fileName: receipt.fileName }),
  });
}

/** Get receipt metadata (no file content) */
export async function getReceiptMetadata(receiptId: string, actorEmployeeId: string, actorRole: string) {
  const receipt = await prisma.expenseReceipt.findUnique({
    where: { id: receiptId },
    include: { claim: { select: { employeeId: true, claimNumber: true, status: true } } },
  });

  if (!receipt) throw AppError.notFound("Receipt not found");

  const isOwner = receipt.claim.employeeId === actorEmployeeId;
  const isApprover = ["MANAGER", "FINANCE", "ADMIN", "HR"].includes(actorRole);

  if (!isOwner && !isApprover) throw AppError.forbidden("Not authorized to view this receipt");

  return {
    id: receipt.id,
    claimId: receipt.claimId,
    claimNumber: receipt.claim.claimNumber,
    fileName: receipt.fileName,
    fileSize: receipt.fileSize,
    mimeType: receipt.mimeType,
    fileHash: receipt.fileHash,
    perceptualHash: receipt.perceptualHash,
    uploadedAt: receipt.uploadedAt,
    uploadedBy: receipt.uploadedBy,
  };
}
