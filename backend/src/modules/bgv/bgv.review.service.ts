import { Prisma, BGVReviewDecision, BGVCaseStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export interface CreateBgvReviewInput {
    caseId: string;
    reviewerId: string;
    decision: BGVReviewDecision;
    remarks: string;
}

export interface BgvReviewFilters {
    caseId?: string;
    reviewerId?: string;
    decision?: BGVReviewDecision;
}

const BGV_REVIEW_INCLUDE = {
    case: {
        select: {
            id: true,
            status: true,
            priority: true,
            candidateId: true,
            employeeId: true,
            applicationId: true,
        },
    },
    reviewer: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.BGVReviewInclude;

const TERMINAL_CASE_STATUSES: BGVCaseStatus[] = [
    BGVCaseStatus.CANCELLED,
    BGVCaseStatus.CLOSED,
];

const REVIEWABLE_CASE_STATUSES: BGVCaseStatus[] = [
    BGVCaseStatus.UNDER_REVIEW,
    BGVCaseStatus.DISCREPANCY,
    BGVCaseStatus.ESCALATED,
    BGVCaseStatus.CONCERN,
    BGVCaseStatus.IN_PROGRESS,
];

function normalizeRemarks(value: string): string {
    const remarks = value?.trim();

    if (!remarks) {
        throw AppError.badRequest("Review remarks are required");
    }

    if (remarks.length > 5000) {
        throw AppError.badRequest(
            "Review remarks cannot exceed 5000 characters"
        );
    }

    return remarks;
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

async function assertReviewerExists(reviewerId: string) {
    const reviewer = await prisma.employee.findUnique({
        where: { id: reviewerId },
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    });

    if (!reviewer) {
        throw AppError.notFound("Reviewer employee not found");
    }

    return reviewer;
}

async function assertReviewExists(reviewId: string) {
    const review = await prisma.bGVReview.findUnique({
        where: { id: reviewId },
        include: BGV_REVIEW_INCLUDE,
    });

    if (!review) {
        throw AppError.notFound("BGV review not found");
    }

    return review;
}

function assertCaseCanBeReviewed(status: BGVCaseStatus) {
    if (TERMINAL_CASE_STATUSES.includes(status)) {
        throw AppError.badRequest(
            `BGV case with status ${status} cannot be reviewed`
        );
    }
}

export async function getBgvReview(reviewId: string) {
    return assertReviewExists(reviewId);
}

export async function listBgvReviews(filters: BgvReviewFilters = {}) {
    const where: Prisma.BGVReviewWhereInput = {};

    if (filters.caseId) {
        where.caseId = filters.caseId;
    }

    if (filters.reviewerId) {
        where.reviewerId = filters.reviewerId;
    }

    if (filters.decision) {
        where.decision = filters.decision;
    }

    return prisma.bGVReview.findMany({
        where,
        include: BGV_REVIEW_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function createBgvReview(input: CreateBgvReviewInput) {
    const remarks = normalizeRemarks(input.remarks);

    const [bgvCase, reviewer] = await Promise.all([
        assertCaseExists(input.caseId),
        assertReviewerExists(input.reviewerId),
    ]);

    assertCaseCanBeReviewed(bgvCase.status);

    if (!REVIEWABLE_CASE_STATUSES.includes(bgvCase.status)) {
        throw AppError.badRequest(
            `BGV case with status ${bgvCase.status} is not ready for review`
        );
    }

    return prisma.bGVReview.create({
        data: {
            caseId: input.caseId,
            reviewerId: reviewer.id,
            decision: input.decision,
            remarks,
        },
        include: BGV_REVIEW_INCLUDE,
    });
}

export async function getLatestBgvReview(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVReview.findFirst({
        where: { caseId },
        include: BGV_REVIEW_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getBgvReviewHistory(caseId: string) {
    await assertCaseExists(caseId);

    return prisma.bGVReview.findMany({
        where: { caseId },
        include: BGV_REVIEW_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function hasBgvReviewDecision(
    caseId: string,
    decision: BGVReviewDecision
) {
    await assertCaseExists(caseId);

    const review = await prisma.bGVReview.findFirst({
        where: {
            caseId,
            decision,
        },
        select: {
            id: true,
        },
    });

    return Boolean(review);
}

export async function deleteBgvReview(reviewId: string) {
    const review = await assertReviewExists(reviewId);

    if (TERMINAL_CASE_STATUSES.includes(review.case.status)) {
        throw AppError.badRequest(
            "Reviews belonging to a cancelled or closed BGV case cannot be deleted"
        );
    }

    return prisma.bGVReview.delete({
        where: { id: reviewId },
    });
}
