import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { parsePagination } from "../../lib/utils";

export interface RequisitionFilters {
    search?: string;
    status?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
}

export interface CandidateFilters {
    search?: string;
    stage?: string;
    requisitionId?: string;
    page?: number;
    limit?: number;
}

export interface InterviewFilters {
    status?: string;
    page?: number;
    limit?: number;
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

const REQUISITION_INCLUDE = {
    department: true,
    designation: true,
    location: true,
    raisedByEmployee: {
        select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
        },
    },
} satisfies Prisma.JobRequisitionInclude;

export async function listRequisitions(
    filters: RequisitionFilters = {}
) {
    const { page, limit, skip } = parsePagination({
        page: filters.page,
        limit: filters.limit,
    });

    const where: Prisma.JobRequisitionWhereInput = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.departmentId) {
        where.departmentId = filters.departmentId;
    }

    if (filters.search?.trim()) {
        const q = filters.search.trim();

        where.OR = [
            {
                title: {
                    contains: q,
                    mode: "insensitive",
                },
            },
            {
                requisitionCode: {
                    contains: q,
                    mode: "insensitive",
                },
            },
            {
                department: {
                    name: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            },
        ];
    }

    const [rows, total] = await Promise.all([
        prisma.jobRequisition.findMany({
            where,
            include: REQUISITION_INCLUDE,
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        }),

        prisma.jobRequisition.count({
            where,
        }),
    ]);

    return {
        data: rows.map(serializeRequisition),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export async function getRequisitionById(id: string) {
    const row = await prisma.jobRequisition.findUnique({
        where: { id },
        include: REQUISITION_INCLUDE,
    });

    if (!row) {
        throw AppError.notFound("Job requisition not found");
    }

    return {
        data: serializeRequisition(row),
    };
}

export async function createRequisition(input: any, userId: string) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            isActive: true,
            employee: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!user || !user.isActive) {
        throw new Error("Authenticated user not found or inactive");
    }

    if (!user.employee) {
        throw new Error(
            "Authenticated user is not linked to an employee"
        );
    }

    const raisedBy = user.employee.id;

    const requisitionCode = await generateRequisitionCode();

    const row = await prisma.jobRequisition.create({
        data: {
            requisitionCode,

            title: input.title,

            departmentId: input.departmentId || null,

            designationId: input.designationId || null,

            locationId: input.locationId || null,

            grade: input.grade || null,

            openings: Number(input.openings || 1),

            salaryMin: input.salaryMin,

            salaryMax: input.salaryMax,

            justification: input.justification || null,

            status: input.status || "Draft",

            raisedBy,
        },

        include: REQUISITION_INCLUDE,
    });

    writeAuditLog({
        action: "CREATE",
        entityType: "JobRequisition",
        entityId: row.id,
        newValue: {
            requisitionCode: row.requisitionCode,
            title: row.title,
            status: row.status,
        },
    });

    return {
        data: serializeRequisition(row),
    };
}

export async function updateRequisition(
    id: string,
    input: any
) {
    const existing = await prisma.jobRequisition.findUnique({
        where: { id },
    });

    if (!existing) {
        throw AppError.notFound("Job requisition not found");
    }

    const updated = await prisma.jobRequisition.update({
        where: { id },

        data: {
            title: input.title ?? undefined,
            departmentId: input.departmentId ?? undefined,
            designationId: input.designationId ?? undefined,
            locationId: input.locationId ?? undefined,
            grade: input.grade ?? undefined,
            openings:
                input.openings !== undefined
                    ? Number(input.openings)
                    : undefined,
            salaryMin: input.salaryMin ?? undefined,
            salaryMax: input.salaryMax ?? undefined,
            justification: input.justification ?? undefined,
            status: input.status ?? undefined,
        },

        include: REQUISITION_INCLUDE,
    });

    writeAuditLog({
        action: "UPDATE",
        entityType: "JobRequisition",
        entityId: id,
        oldValue: {
            status: existing.status,
        },
        newValue: {
            status: updated.status,
        },
    });

    return {
        data: serializeRequisition(updated),
    };
}

async function generateRequisitionCode() {
    const last = await prisma.jobRequisition.findFirst({
        orderBy: {
            requisitionCode: "desc",
        },
        select: {
            requisitionCode: true,
        },
    });

    const number = last
        ? Number(last.requisitionCode.replace(/\D/g, "")) + 1
        : 1;

    return `REQ${String(number).padStart(4, "0")}`;
}

/* =========================================================
   CANDIDATES
   ========================================================= */

const APPLICATION_INCLUDE = {
    candidate: true,
    requisition: {
        select: {
            id: true,
            requisitionCode: true,
            title: true,
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} satisfies Prisma.ApplicationInclude;

export async function listCandidates(
    filters: CandidateFilters = {}
) {
    const { page, limit, skip } = parsePagination({
        page: filters.page,
        limit: filters.limit,
    });

    const where: Prisma.ApplicationWhereInput = {};

    if (filters.stage) {
        where.stage = filters.stage;
    }

    if (filters.requisitionId) {
        where.requisitionId = filters.requisitionId;
    }

    if (filters.search?.trim()) {
        const q = filters.search.trim();

        where.OR = [
            {
                candidate: {
                    firstName: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            },
            {
                candidate: {
                    lastName: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            },
            {
                candidate: {
                    email: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            },
            {
                candidate: {
                    candidateCode: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
            },
        ];
    }

    const [rows, total] = await Promise.all([
        prisma.application.findMany({
            where,
            include: APPLICATION_INCLUDE,
            orderBy: {
                appliedOn: "desc",
            },
            skip,
            take: limit,
        }),

        prisma.application.count({
            where,
        }),
    ]);

    return {
        data: rows.map(serializeApplication),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export async function createCandidate(input: any) {
    const candidateCode = await generateCandidateCode();

    const candidate = await prisma.candidate.create({
        data: {
            candidateCode,

            firstName: input.firstName,

            lastName: input.lastName || null,

            email: input.email,

            phone: input.phone || null,

            resumeSummary: input.resumeSummary || null,
        },
    });

    let application = null;

    if (input.requisitionId) {
        application = await prisma.application.create({
            data: {
                candidateId: candidate.id,

                requisitionId: input.requisitionId,

                stage: input.stage || "Applied",

                rating: Number(input.rating || 0),

                notes: input.notes || null,
            },

            include: APPLICATION_INCLUDE,
        });
    }

    return {
        data: application
            ? serializeApplication(application)
            : serializeCandidate(candidate),
    };
}

export async function moveCandidateStage(
    id: string,
    stage: string
) {
    const validStages = [
        "Applied",
        "Screening",
        "Interview",
        "Offer",
        "Hired",
        "Rejected",
    ];

    if (!validStages.includes(stage)) {
        throw AppError.badRequest("Invalid candidate stage");
    }

    const existing = await prisma.application.findUnique({
        where: { id },
        include: APPLICATION_INCLUDE,
    });

    if (!existing) {
        throw AppError.notFound("Application not found");
    }

    const updated = await prisma.application.update({
        where: { id },

        data: {
            stage,
        },

        include: APPLICATION_INCLUDE,
    });

    writeAuditLog({
        action: "UPDATE",
        entityType: "Application",
        entityId: id,
        oldValue: {
            stage: existing.stage,
        },
        newValue: {
            stage,
        },
    });

    return {
        data: serializeApplication(updated),
    };
}

export async function rateCandidate(
    id: string,
    rating: number,
    notes?: string
) {
    if (rating < 0 || rating > 5) {
        throw AppError.badRequest(
            "Rating must be between 0 and 5"
        );
    }

    const existing = await prisma.application.findUnique({
        where: { id },
    });

    if (!existing) {
        throw AppError.notFound("Application not found");
    }

    const updated = await prisma.application.update({
        where: { id },

        data: {
            rating,
            notes: notes ?? undefined,
        },

        include: APPLICATION_INCLUDE,
    });

    return {
        data: serializeApplication(updated),
    };
}

async function generateCandidateCode() {
    const last = await prisma.candidate.findFirst({
        orderBy: {
            candidateCode: "desc",
        },
        select: {
            candidateCode: true,
        },
    });

    const number = last
        ? Number(last.candidateCode.replace(/\D/g, "")) + 1
        : 1;

    return `CAN${String(number).padStart(4, "0")}`;
}

/* =========================================================
   INTERVIEWS
   ========================================================= */

const INTERVIEW_INCLUDE = {
    application: {
        include: {
            candidate: true,
            requisition: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    },

    panel: {
        include: {
            interviewer: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },

    scorecards: {
        include: {
            interviewer: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },
} satisfies Prisma.InterviewInclude;

export async function listInterviews(
    filters: InterviewFilters = {}
) {
    const { page, limit, skip } = parsePagination({
        page: filters.page,
        limit: filters.limit,
    });

    const where: Prisma.InterviewWhereInput = {};

    if (filters.status) {
        where.status = filters.status;
    }

    const [rows, total] = await Promise.all([
        prisma.interview.findMany({
            where,
            include: INTERVIEW_INCLUDE,
            orderBy: {
                scheduledAt: "desc",
            },
            skip,
            take: limit,
        }),

        prisma.interview.count({
            where,
        }),
    ]);

    return {
        data: rows.map(serializeInterview),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export async function scheduleInterview(input: any) {
    const application = await prisma.application.findUnique({
        where: {
            id: input.applicationId,
        },
    });

    if (!application) {
        throw AppError.notFound("Application not found");
    }

    if (!input.interviewers?.length) {
        throw AppError.badRequest(
            "At least one interviewer is required"
        );
    }

    // Frontend sends employeeCode (e.g. EMP001).
    // Backend resolves employeeCode -> Employee UUID.
    const employees = await prisma.employee.findMany({
        where: {
            employeeCode: {
                in: input.interviewers,
            },
            status: "Active",
        },
        select: {
            id: true,
            employeeCode: true,
        },
    });

    if (employees.length !== input.interviewers.length) {
        throw AppError.badRequest(
            "One or more selected interviewers are invalid or inactive"
        );
    }

    const employeeIdByCode = new Map(
        employees.map((employee) => [
            employee.employeeCode,
            employee.id,
        ])
    );

    // Convert employee codes -> Employee UUIDs
    const interviewerIds = input.interviewers.map(
        (employeeCode: string) => {
            const employeeId = employeeIdByCode.get(employeeCode);

            if (!employeeId) {
                throw AppError.badRequest(
                    `Interviewer ${employeeCode} not found`
                );
            }

            return employeeId;
        }
    );

    const interview = await prisma.interview.create({
        data: {
            applicationId: input.applicationId,

            round: input.round,

            scheduledAt: new Date(input.scheduledAt),

            status: "Scheduled",

            panel: {
                create: interviewerIds.map(
                    (interviewerId: string) => ({
                        interviewerId,
                    })
                ),
            },
        },

        include: INTERVIEW_INCLUDE,
    });

    return {
        data: serializeInterview(interview),
    };
}


export async function submitScorecard(
    interviewId: string,
    interviewerId: string,
    rating: number,
    notes?: string
) {
    if (rating < 1 || rating > 5) {
        throw AppError.badRequest(
            "Rating must be between 1 and 5"
        );
    }

    const interview = await prisma.interview.findUnique({
        where: {
            id: interviewId,
        },

        include: {
            panel: true,
            scorecards: true,
        },
    });

    if (!interview) {
        throw AppError.notFound("Interview not found");
    }

    const isPanelMember = interview.panel.some(
        (p) => p.interviewerId === interviewerId
    );

    if (!isPanelMember) {
        throw AppError.forbidden(
            "You are not a panel member for this interview"
        );
    }

    const scorecard =
        await prisma.interviewScorecard.upsert({
            where: {
                interviewId_interviewerId: {
                    interviewId,
                    interviewerId,
                },
            },

            create: {
                interviewId,
                interviewerId,
                rating,
                notes: notes || null,
                submitted: true,
                submittedAt: new Date(),
            },

            update: {
                rating,
                notes: notes || null,
                submitted: true,
                submittedAt: new Date(),
            },
        });

    const totalPanelMembers = interview.panel.length;

    const submittedCount =
        await prisma.interviewScorecard.count({
            where: {
                interviewId,
                submitted: true,
            },
        });

    let status = "Feedback Pending";

    if (
        totalPanelMembers > 0 &&
        submittedCount >= totalPanelMembers
    ) {
        status = "Completed";
    }

    const updated = await prisma.interview.update({
        where: {
            id: interviewId,
        },

        data: {
            status,
        },

        include: INTERVIEW_INCLUDE,
    });

    return {
        data: serializeInterview(updated),
    };
}

/* =========================================================
   OFFERS
   ========================================================= */

const OFFER_INCLUDE = {
    application: {
        include: {
            candidate: true,

            requisition: {
                select: {
                    id: true,
                    title: true,
                    salaryMin: true,
                    salaryMax: true,
                },
            },
        },
    },
} satisfies Prisma.OfferInclude;

export async function listOffers() {
    const rows = await prisma.offer.findMany({
        include: OFFER_INCLUDE,

        orderBy: {
            createdAt: "desc",
        },
    });

    return {
        data: rows.map(serializeOffer),
    };
}

export async function createOffer(input: any) {
    const application = await prisma.application.findUnique({
        where: {
            id: input.applicationId,
        },

        include: {
            requisition: true,
        },
    });

    if (!application) {
        throw AppError.notFound("Application not found");
    }

    if (application.stage !== "Offer") {
        throw AppError.badRequest(
            "Candidate must be in Offer stage"
        );
    }

    const salary = Number(input.proposedSalary);

    if (!Number.isFinite(salary) || salary <= 0) {
        throw AppError.badRequest(
            "Invalid proposed salary"
        );
    }

    const salaryMin = Number(application.requisition.salaryMin);
    const salaryMax = Number(application.requisition.salaryMax);

    if (salary < salaryMin) {
        throw AppError.badRequest(
            `Proposed salary cannot be below the approved minimum of ${salaryMin}`
        );
    }

    const overBand = salary > salaryMax;

    const offer = await prisma.offer.create({
        data: {
            applicationId: application.id,

            proposedSalary: salary,

            status: overBand
                ? "Salary Approval Pending"
                : "Approved",

            consentOnFile: false,

            financeOverride: false,
        },

        include: OFFER_INCLUDE,
    });

    return {
        data: serializeOffer(offer),
    };
}

export async function updateOfferStatus(
    id: string,
    status: string,
    patch: any = {}
) {
    const existing = await prisma.offer.findUnique({
        where: { id },
        include: OFFER_INCLUDE,
    });

    if (!existing) {
        throw AppError.notFound("Offer not found");
    }

    /*
     * Hard block:
     * Offer cannot be sent until candidate consent
     * is recorded.
     */
    if (
        status === "Sent — Awaiting Signature" &&
        !(
            patch.consentOnFile ??
            existing.consentOnFile
        )
    ) {
        throw AppError.badRequest(
            "Candidate consent is required before sending the offer"
        );
    }

    const updated = await prisma.offer.update({
        where: { id },

        data: {
            status,

            consentOnFile:
                patch.consentOnFile ?? undefined,

            financeOverride:
                patch.financeOverride ?? undefined,

            overrideReason:
                patch.overrideReason ?? undefined,

            sentAt:
                patch.sentAt
                    ? new Date(patch.sentAt)
                    : undefined,
        },

        include: OFFER_INCLUDE,
    });

    writeAuditLog({
        action: "UPDATE",
        entityType: "Offer",
        entityId: id,

        oldValue: {
            status: existing.status,
        },

        newValue: {
            status: updated.status,
            financeOverride: updated.financeOverride,
        },
    });

    return {
        data: serializeOffer(updated),
    };
}

/* =========================================================
   SERIALIZERS
   ========================================================= */

function serializeRequisition(row: any) {
    return {
        id: row.id,

        requisitionCode: row.requisitionCode,

        title: row.title,

        departmentId: row.departmentId,

        department: row.department?.name ?? null,

        designationId: row.designationId,

        designation: row.designation?.title ?? null,

        locationId: row.locationId,

        location: row.location?.name ?? null,

        grade: row.grade,

        openings: row.openings,

        salaryMin: Number(row.salaryMin),

        salaryMax: Number(row.salaryMax),

        justification: row.justification,

        status: row.status,

        raisedBy: row.raisedByEmployee
            ? `${row.raisedByEmployee.firstName} ${row.raisedByEmployee.lastName ?? ""}`.trim()
            : null,

        createdAt: row.createdAt,
    };
}

function serializeCandidate(row: any) {
    return {
        id: row.id,

        candidateCode: row.candidateCode,

        name: `${row.firstName} ${row.lastName ?? ""}`.trim(),

        firstName: row.firstName,

        lastName: row.lastName,

        email: row.email,

        phone: row.phone,

        resumeSummary: row.resumeSummary,
    };
}

function serializeApplication(row: any) {
    const candidate = row.candidate;

    return {
        id: row.id,

        candidateId: candidate.id,

        requisitionId: row.requisitionId,

        name: `${candidate.firstName} ${candidate.lastName ?? ""}`.trim(),

        firstName: candidate.firstName,

        lastName: candidate.lastName,

        email: candidate.email,

        phone: candidate.phone,

        resumeSummary: candidate.resumeSummary,

        stage: row.stage,

        rating: row.rating,

        notes: row.notes,

        appliedOn: row.appliedOn
            ? new Date(row.appliedOn).toISOString()
            : null,

        requisition: row.requisition
            ? {
                id: row.requisition.id,
                title: row.requisition.title,
                department:
                    row.requisition.department?.name ?? null,
            }
            : null,
    };
}

function serializeInterview(row: any) {
    return {
        id: row.id,

        applicationId: row.applicationId,

        candidateId:
            row.application?.candidate?.id ?? null,

        candidateName: row.application?.candidate
            ? `${row.application.candidate.firstName} ${row.application.candidate.lastName ?? ""
                }`.trim()
            : null,

        round: row.round,

        scheduledAt: row.scheduledAt,

        status: row.status,

        interviewers:
            row.panel?.map((p: any) =>
                `${p.interviewer.firstName} ${p.interviewer.lastName ?? ""
                    }`.trim()
            ) ?? [],

        interviewerIds:
            row.panel?.map(
                (p: any) => p.interviewerId
            ) ?? [],

        scorecards:
            row.scorecards?.map((s: any) => ({
                interviewerId: s.interviewerId,

                interviewer:
                    `${s.interviewer.firstName} ${s.interviewer.lastName ?? ""
                        }`.trim(),

                submitted: s.submitted,

                rating: s.rating,

                notes: s.notes,

                submittedAt: s.submittedAt,
            })) ?? [],
    };
}

function serializeOffer(row: any) {
    const candidate =
        row.application?.candidate;

    const requisition =
        row.application?.requisition;

    return {
        id: row.id,

        applicationId: row.applicationId,

        candidateId: candidate?.id ?? null,

        requisitionId: requisition?.id ?? null,

        candidateName: candidate
            ? `${candidate.firstName} ${candidate.lastName ?? ""
                }`.trim()
            : null,

        proposedSalary: Number(row.proposedSalary),

        salaryMin: requisition
            ? Number(requisition.salaryMin)
            : null,

        salaryMax: requisition
            ? Number(requisition.salaryMax)
            : null,

        status: row.status,

        consentOnFile: row.consentOnFile,

        financeOverride: row.financeOverride,

        overrideReason: row.overrideReason,

        sentAt: row.sentAt,
    };
}