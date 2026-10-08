import { Prisma, BGVDocumentStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

/*
 * BGVDocument stores document metadata and verification state.
 * Physical file upload/storage is intentionally kept outside this service:
 * filePath is the storage reference supplied by the upload layer.
 */

export interface CreateBgvDocumentInput {
    caseId: string;
    verificationId?: string | null;
    documentType: string;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    fileSize?: number | null;
    uploadedById: string;
    expiresAt?: string | Date | null;
}

export interface BgvDocumentFilters {
    caseId?: string;
    verificationId?: string;
    verificationStatus?: BGVDocumentStatus;
    uploadedById?: string;
    page?: number | string;
    limit?: number | string;
}

const BGV_DOCUMENT_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
            priority: true,
        },
    },
    verification: {
        select: {
            id: true,
            type: true,
            status: true,
            result: true,
        },
    },
    uploadedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
    verifiedBy: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.BGVDocumentInclude;

function normalizeDate(value: string | Date | null | undefined) {
    if (value === undefined || value === null) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest("Invalid document expiry date");
    }

    return date;
}

function requiredText(value: unknown, field: string, maxLength = 1000) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw AppError.badRequest(`${field} is required`);
    }

    const normalized = value.trim();

    if (normalized.length > maxLength) {
        throw AppError.badRequest(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized;
}

function optionalText(
    value: unknown,
    field: string,
    maxLength = 1000
) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value !== "string") {
        throw AppError.badRequest(`${field} must be a string`);
    }

    const normalized = value.trim();

    if (normalized.length > maxLength) {
        throw AppError.badRequest(
            `${field} cannot exceed ${maxLength} characters`
        );
    }

    return normalized || undefined;
}

function assertPositiveFileSize(fileSize: number | null | undefined) {
    if (fileSize === undefined || fileSize === null) {
        return;
    }

    if (!Number.isInteger(fileSize) || fileSize < 0) {
        throw AppError.badRequest(
            "fileSize must be a non-negative integer"
        );
    }
}

async function assertEmployeeExists(
    employeeId: string,
    field = "Employee"
) {
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!employee) {
        throw AppError.notFound(`${field} not found`);
    }

    if (employee.status !== "Active") {
        throw AppError.badRequest(`${field} is not active`);
    }

    return employee;
}

async function assertCaseExists(caseId: string) {
    const bgvCase = await prisma.bGVCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!bgvCase) {
        throw AppError.notFound("BGV case not found");
    }

    return bgvCase;
}

async function assertVerificationBelongsToCase(
    verificationId: string,
    caseId: string
) {
    const verification = await prisma.bGVVerification.findUnique({
        where: { id: verificationId },
        select: {
            id: true,
            caseId: true,
            status: true,
        },
    });

    if (!verification) {
        throw AppError.notFound("BGV verification not found");
    }

    if (verification.caseId !== caseId) {
        throw AppError.badRequest(
            "Verification does not belong to the selected BGV case"
        );
    }

    return verification;
}

async function assertDocumentExists(id: string) {
    const document = await prisma.bGVDocument.findUnique({
        where: { id },
    });

    if (!document) {
        throw AppError.notFound("BGV document not found");
    }

    return document;
}

/* =========================================================
   GET DOCUMENT
   ========================================================= */

export async function getBgvDocument(id: string) {
    const document = await prisma.bGVDocument.findUnique({
        where: { id },
        include: BGV_DOCUMENT_INCLUDE,
    });

    if (!document) {
        throw AppError.notFound("BGV document not found");
    }

    return {
        data: document,
    };
}

/* =========================================================
   LIST DOCUMENTS
   ========================================================= */

export async function listBgvDocuments(
    filters: BgvDocumentFilters = {}
) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(
        Math.max(Number(filters.limit) || 20, 1),
        100
    );
    const skip = (page - 1) * limit;

    const where: Prisma.BGVDocumentWhereInput = {};

    if (filters.caseId) {
        where.caseId = filters.caseId;
    }

    if (filters.verificationId) {
        where.verificationId = filters.verificationId;
    }

    if (filters.verificationStatus) {
        where.verificationStatus =
            filters.verificationStatus;
    }

    if (filters.uploadedById) {
        where.uploadedById = filters.uploadedById;
    }

    const [rows, total] = await Promise.all([
        prisma.bGVDocument.findMany({
            where,
            include: BGV_DOCUMENT_INCLUDE,
            orderBy: [
                { createdAt: "desc" },
                { version: "desc" },
            ],
            skip,
            take: limit,
        }),
        prisma.bGVDocument.count({ where }),
    ]);

    return {
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

/* =========================================================
   CREATE DOCUMENT
   ========================================================= */

export async function createBgvDocument(
    input: CreateBgvDocumentInput
) {
    const caseId = requiredText(input.caseId, "caseId");
    const documentType = requiredText(
        input.documentType,
        "documentType",
        200
    );
    const fileName = requiredText(
        input.fileName,
        "fileName",
        500
    );
    const filePath = requiredText(
        input.filePath,
        "filePath",
        2000
    );
    const uploadedById = requiredText(
        input.uploadedById,
        "uploadedById"
    );

    const verificationId =
        input.verificationId === null ||
        input.verificationId === undefined ||
        input.verificationId === ""
            ? null
            : requiredText(
                input.verificationId,
                "verificationId"
            );

    const mimeType =
        input.mimeType === null ||
        input.mimeType === undefined
            ? null
            : optionalText(
                input.mimeType,
                "mimeType",
                200
            ) ?? null;

    assertPositiveFileSize(input.fileSize);

    const expiresAt = normalizeDate(input.expiresAt);

    await assertCaseExists(caseId);
    await assertEmployeeExists(
        uploadedById,
        "Uploading employee"
    );

    if (verificationId) {
        await assertVerificationBelongsToCase(
            verificationId,
            caseId
        );
    }

    /*
     * A new upload is a new version only when the caller explicitly
     * supplies the next version through a future storage/upload workflow.
     * The database default remains version 1 for the first document.
     */
    const latest = await prisma.bGVDocument.findFirst({
        where: {
            caseId,
            documentType,
            ...(verificationId
                ? { verificationId }
                : {}),
        },
        orderBy: {
            version: "desc",
        },
        select: {
            version: true,
        },
    });

    const version = (latest?.version ?? 0) + 1;

    const document = await prisma.bGVDocument.create({
        data: {
            caseId,
            verificationId,
            documentType,
            fileName,
            filePath,
            mimeType,
            fileSize: input.fileSize ?? null,
            version,
            uploadedById,
            expiresAt,
        },
        include: BGV_DOCUMENT_INCLUDE,
    });

    return {
        data: document,
    };
}

/* =========================================================
   VERIFY DOCUMENT
   ========================================================= */

export async function verifyBgvDocument(
    id: string,
    verifiedById: string
) {
    const existing = await assertDocumentExists(id);

    await assertEmployeeExists(
        verifiedById,
        "Verifying employee"
    );

    if (existing.verificationStatus === "VERIFIED") {
        throw AppError.badRequest(
            "BGV document is already verified"
        );
    }

    if (existing.verificationStatus === "EXPIRED") {
        throw AppError.badRequest(
            "Expired BGV document cannot be verified"
        );
    }

    if (existing.verificationStatus === "REJECTED") {
        throw AppError.badRequest(
            "Rejected BGV document must be replaced before verification"
        );
    }

    const document = await prisma.bGVDocument.update({
        where: { id },
        data: {
            verificationStatus: "VERIFIED",
            verifiedById,
            verifiedAt: new Date(),
            rejectionReason: null,
        },
        include: BGV_DOCUMENT_INCLUDE,
    });

    return {
        data: document,
    };
}

/* =========================================================
   REJECT DOCUMENT
   ========================================================= */

export async function rejectBgvDocument(
    id: string,
    verifiedById: string,
    rejectionReason: string
) {
    const existing = await assertDocumentExists(id);

    await assertEmployeeExists(
        verifiedById,
        "Reviewing employee"
    );

    const reason = requiredText(
        rejectionReason,
        "rejectionReason",
        2000
    );

    if (existing.verificationStatus === "EXPIRED") {
        throw AppError.badRequest(
            "Expired BGV document cannot be rejected"
        );
    }

    if (existing.verificationStatus === "VERIFIED") {
        throw AppError.badRequest(
            "Verified BGV document cannot be rejected"
        );
    }

    const document = await prisma.bGVDocument.update({
        where: { id },
        data: {
            verificationStatus: "REJECTED",
            verifiedById,
            verifiedAt: new Date(),
            rejectionReason: reason,
        },
        include: BGV_DOCUMENT_INCLUDE,
    });

    return {
        data: document,
    };
}

/* =========================================================
   MARK EXPIRED
   ========================================================= */

export async function expireBgvDocument(id: string) {
    const existing = await assertDocumentExists(id);

    if (existing.verificationStatus === "EXPIRED") {
        throw AppError.badRequest(
            "BGV document is already expired"
        );
    }

    if (!existing.expiresAt) {
        throw AppError.badRequest(
            "BGV document does not have an expiry date"
        );
    }

    if (existing.expiresAt > new Date()) {
        throw AppError.badRequest(
            "BGV document has not reached its expiry date"
        );
    }

    const document = await prisma.bGVDocument.update({
        where: { id },
        data: {
            verificationStatus: "EXPIRED",
        },
        include: BGV_DOCUMENT_INCLUDE,
    });

    return {
        data: document,
    };
}

/* =========================================================
   DELETE DOCUMENT
   ========================================================= */

export async function deleteBgvDocument(id: string) {
    const existing = await assertDocumentExists(id);

    if (existing.verificationStatus === "VERIFIED") {
        throw AppError.forbidden(
            "Verified BGV documents cannot be deleted"
        );
    }

    await prisma.bGVDocument.delete({
        where: { id },
    });

    return {
        data: {
            id,
            deleted: true,
        },
    };
}
