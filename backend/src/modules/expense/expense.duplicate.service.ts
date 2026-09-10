import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { sha256 } from "../../lib/crypto";
import type { ExpenseCategory } from "./expense.validation";

/** Result of duplicate detection */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: "exact" | "near" | "none";
  matchedClaimId?: string;
  matchedClaimNumber?: string;
  similarityScore?: number; // For near-duplicates: 0-100
  details: {
    sameReceiptHash?: boolean;
    sameAmount?: boolean;
    sameDate?: boolean;
    sameEmployee?: boolean;
    perceptualHashSimilarity?: number;
  };
}

/** Check for exact duplicates: same receipt hash + amount + date + employee */
export async function checkExactDuplicate(
  input: {
    employeeId: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    fileHash?: string; // SHA256 of uploaded file
  }
): Promise<DuplicateCheckResult> {
  if (!input.fileHash) {
    return { isDuplicate: false, matchType: "none", details: {} };
  }

  const existingReceipt = await prisma.expenseReceipt.findFirst({
    where: { fileHash: input.fileHash },
    include: { claim: { select: { id: true, claimNumber: true, employeeId: true, amount: true, expenseDate: true, category: true } } },
  });

  if (!existingReceipt) {
    return { isDuplicate: false, matchType: "none", details: {} };
  }

  const existingClaim = existingReceipt.claim;
  const sameEmployee = existingClaim.employeeId === input.employeeId;
  const sameAmount = Number(existingClaim.amount) === input.amount;
  const sameDate = existingClaim.expenseDate.toISOString().split("T")[0] === input.expenseDate.toISOString().split("T")[0];
  const sameCategory = existingClaim.category === input.category;

  // Exact duplicate: same receipt hash AND same employee AND same amount AND same date
  if (sameEmployee && sameAmount && sameDate && sameCategory) {
    return {
      isDuplicate: true,
      matchType: "exact",
      matchedClaimId: existingClaim.id,
      matchedClaimNumber: existingClaim.claimNumber,
      details: {
        sameReceiptHash: true,
        sameAmount: true,
        sameDate: true,
        sameEmployee: true,
      },
    };
  }

// Same receipt but different employee/amount/date - could be shared receipt
  if (!sameEmployee || !sameAmount || !sameDate) {
    return {
      isDuplicate: false,
      matchType: "none",
      details: {
        sameReceiptHash: true,
        sameAmount,
        sameDate,
        sameEmployee,
      },
    };
  }

  return { isDuplicate: false, matchType: "none", details: {} };
}

/** Check for near-duplicates using perceptual hash (pHash) */
export async function checkNearDuplicate(
  input: {
    employeeId: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    perceptualHash?: string; // 64-char hex string from pHash
  }
): Promise<DuplicateCheckResult> {
  if (!input.perceptualHash) {
    return { isDuplicate: false, matchType: "none", details: {} };
  }

  // Find receipts with similar perceptual hashes for this employee
  const receipts = await prisma.expenseReceipt.findMany({
    where: {
      perceptualHash: { not: null },
      claim: {
        employeeId: input.employeeId,
        category: input.category,
        status: { notIn: ["Cancelled", "Rejected"] }, // Only check against active/approved claims
      },
    },
    include: {
      claim: { select: { id: true, claimNumber: true, amount: true, expenseDate: true, category: true } },
    },
    take: 50, // Limit for performance
  });

  let bestMatch: { claim: typeof receipts[0]["claim"]; similarity: number } | null = null;

  for (const receipt of receipts) {
    if (!receipt.perceptualHash) continue;

    const similarity = calculatePerceptualHashSimilarity(input.perceptualHash, receipt.perceptualHash);

    // Consider near-duplicate if similarity > 85% (adjustable threshold)
    if (similarity > 85) {
      const claim = receipt.claim;
      const amountDiff = Math.abs(Number(claim.amount) - input.amount) / Math.max(Number(claim.amount), input.amount);
      const daysDiff = Math.abs(claim.expenseDate.getTime() - input.expenseDate.getTime()) / (1000 * 60 * 60 * 24);

      // Stronger match if amount and date are also similar
      if (amountDiff < 0.1 && daysDiff <= 3) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { claim, similarity };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      isDuplicate: true,
      matchType: "near",
      matchedClaimId: bestMatch.claim.id,
      matchedClaimNumber: bestMatch.claim.claimNumber,
      similarityScore: Math.round(bestMatch.similarity),
      details: {
        perceptualHashSimilarity: Math.round(bestMatch.similarity),
        sameEmployee: true,
      },
    };
  }

  return { isDuplicate: false, matchType: "none", details: {} };
}

/** Calculate Hamming distance between two perceptual hashes (64-char hex = 256 bits) */
function calculatePerceptualHashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== 64 || hash2.length !== 64) return 0;

  // Convert hex to binary strings
  const bin1 = BigInt("0x" + hash1).toString(2).padStart(256, "0");
  const bin2 = BigInt("0x" + hash2).toString(2).padStart(256, "0");

  // Calculate Hamming distance
  let distance = 0;
  for (let i = 0; i < 256; i++) {
    if (bin1[i] !== bin2[i]) distance++;
  }

  // Similarity = 1 - (distance / 256)
  return ((256 - distance) / 256) * 100;
}

/** Comprehensive duplicate check combining exact and near-duplicate detection */
export async function checkDuplicates(
  input: {
    employeeId: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: Date;
    fileHash?: string;
    perceptualHash?: string;
  }
): Promise<DuplicateCheckResult> {
  // First check exact duplicates (strongest signal)
  const exactResult = await checkExactDuplicate(input);
  if (exactResult.isDuplicate) {
    return exactResult;
  }

  // Then check near-duplicates
  const nearResult = await checkNearDuplicate(input);
  if (nearResult.isDuplicate) {
    return nearResult;
  }

  return { isDuplicate: false, matchType: "none", details: {} };
}

/** Generate perceptual hash for an image file (placeholder - would use a library like sharp + pHash in production) */
export async function generatePerceptualHash(fileBuffer: Buffer): Promise<string> {
  // In production, use a proper perceptual hashing library
  // For now, return a hash based on file content (SHA256 as fallback)
  // This is a placeholder implementation
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return hash.substring(0, 64); // Return first 64 chars as "perceptual hash"
}

/** Compute file hash (SHA256) for exact duplicate detection */
export function computeFileHash(fileBuffer: Buffer): string {
  return sha256(fileBuffer.toString("binary"));
}

/** Get duplicate warnings for a claim (for display in UI) */
export async function getDuplicateWarnings(claimId: string): Promise<DuplicateCheckResult[]> {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { receipts: true },
  });

  if (!claim) throw AppError.notFound("Claim not found");

  const results: DuplicateCheckResult[] = [];

  for (const receipt of claim.receipts) {
    const exact = await checkExactDuplicate({
      employeeId: claim.employeeId,
      category: claim.category as ExpenseCategory,
      amount: Number(claim.amount),
      expenseDate: claim.expenseDate,
      fileHash: receipt.fileHash,
    });

if (exact.isDuplicate && exact.matchedClaimId !== claimId) {
      results.push(exact);
    }

    if (receipt.perceptualHash) {
      const near = await checkNearDuplicate({
        employeeId: claim.employeeId,
        category: claim.category as ExpenseCategory,
        amount: Number(claim.amount),
        expenseDate: claim.expenseDate,
        perceptualHash: receipt.perceptualHash,
      });

      if (near.isDuplicate && near.matchedClaimId !== claimId) {
        results.push(near);
      }
    }
  }

  return results;
}
