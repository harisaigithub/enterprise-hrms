import { BGVFieldMatchStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export type SaveBgvFieldsInput = {
    fields: Array<{
        id?: string;
        fieldName: string;
        actualValue?: string | null;
        expectedValue?: string | null;
        matchStatus?: BGVFieldMatchStatus;
        remarks?: string | null;
    }>;
};

const FIELD_ALIASES: Record<string, string[]> = {
    fullName: ["firstName", "lastName"],
    name: ["firstName", "lastName"],
    firstName: ["firstName"],
    lastName: ["lastName"],
    surname: ["lastName"],
    dob: ["dateOfBirth"],
    dateOfBirth: ["dateOfBirth"],
    gender: ["gender"],
    fatherName: ["fatherName"],
    fathersName: ["fatherName"],
    motherName: ["motherName"],
    mothersName: ["motherName"],
    address: ["address"],
    city: ["city"],
    state: ["state"],
    country: ["country"],
    postalCode: ["postalCode"],
    email: ["email"],
    phone: ["phone"],
    degree: ["degree"],
    highestEducation: ["highestEducation"],
    specialization: ["specialization"],
    collegeName: ["collegeName"],
    passingYear: ["passingYear"],
    currentCompany: ["currentCompany"],
    currentDesignation: ["currentDesignation"],
    totalExperienceYears: ["totalExperienceYears"],
    noticePeriodDays: ["noticePeriodDays"],
    currentLocation: ["currentLocation"],
};

function clean(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function comparable(value: unknown): string {
    return clean(value).replace(/[^a-z0-9]+/g, "");
}

function candidateValue(
    candidate: Record<string, unknown> | null | undefined,
    fieldName: string
): string {
    const keys = FIELD_ALIASES[fieldName] || [fieldName];

    if (fieldName === "fullName" || fieldName === "name") {
        return [candidate?.firstName, candidate?.lastName]
            .filter((value) => value !== null && value !== undefined)
            .map((value) => String(value).trim())
            .filter(Boolean)
            .join(" ");
    }

    for (const key of keys) {
        const value = candidate?.[key];

        if (value !== undefined && value !== null) {
            if (value instanceof Date) {
                return value.toISOString().slice(0, 10);
            }

            return String(value);
        }
    }

    return "";
}

function compare(
    expected: string,
    actual: string
): BGVFieldMatchStatus {
    const expectedClean = clean(expected);
    const actualClean = clean(actual);

    if (!actualClean) {
        return "MISSING";
    }

    if (!expectedClean) {
        return "NOT_CHECKED";
    }

    return comparable(expected) === comparable(actual)
        ? "MATCH"
        : "MISMATCH";
}

async function getVerificationContext(id: string) {
    if (!id || !id.trim()) {
        throw AppError.badRequest("Verification id is required");
    }

    const verification = await prisma.bGVVerification.findUnique({
        where: { id },
        include: {
            fields: {
                orderBy: {
                    createdAt: "asc",
                },
            },
            candidateDocument: true,
            case: {
                include: {
                    candidate: true,
                    application: true,
                },
            },
        },
    });

    if (!verification) {
        throw AppError.notFound("BGV verification not found");
    }

    return verification;
}

function buildFieldValues(
    candidate: Record<string, unknown>,
    field: SaveBgvFieldsInput["fields"][number]
) {
    const fieldName = String(field.fieldName || "").trim();

    if (!fieldName) {
        throw AppError.badRequest("fieldName is required");
    }

    const expectedValue = candidateValue(candidate, fieldName);
    const actualValue = String(field.actualValue ?? "").trim();
    const matchStatus = compare(expectedValue, actualValue);

    return {
        id: field.id,
        fieldName,
        expectedValue: expectedValue || null,
        actualValue: actualValue || null,
        matchStatus,
        remarks: field.remarks?.trim() || null,
    };
}

function validateUniqueFieldNames(
    fields: Array<{ fieldName: string }>
) {
    const seen = new Set<string>();

    for (const field of fields) {
        const key = field.fieldName.trim().toLowerCase();

        if (seen.has(key)) {
            throw AppError.badRequest(
                `Duplicate verification field: ${field.fieldName}`
            );
        }

        seen.add(key);
    }
}

function getComparisonState(
    fields: Array<{
        matchStatus: BGVFieldMatchStatus;
    }>
) {
    const mismatch = fields.filter(
        (field) => field.matchStatus === "MISMATCH"
    ).length;

    const missing = fields.filter(
        (field) => field.matchStatus === "MISSING"
    ).length;

    const matched = fields.filter(
        (field) => field.matchStatus === "MATCH"
    ).length;

    const notChecked = fields.filter(
        (field) => field.matchStatus === "NOT_CHECKED"
    ).length;

    const notApplicable = fields.filter(
        (field) => field.matchStatus === "NOT_APPLICABLE"
    ).length;

    const clear =
        fields.length > 0 &&
        mismatch === 0 &&
        missing === 0 &&
        notChecked === 0;

    return {
        total: fields.length,
        matched,
        mismatch,
        missing,
        notChecked,
        notApplicable,
        clear,
    };
}

async function updateVerificationResult(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    verificationId: string,
    status: string,
    state: ReturnType<typeof getComparisonState>
) {
    if (state.mismatch > 0 || state.missing > 0) {
        const canEnterDiscrepancy = [
            "IN_PROGRESS",
            "SUBMITTED",
            "UNDER_REVIEW",
            "DISCREPANCY",
        ].includes(status);

        return tx.bGVVerification.update({
            where: { id: verificationId },
            data: {
                result: "DISCREPANCY",
                ...(canEnterDiscrepancy
                    ? { status: "DISCREPANCY" }
                    : {}),
                discrepancyLevel:
                    state.mismatch > 0 ? "MAJOR" : "MINOR",
                remarks:
                    state.mismatch > 0
                        ? "One or more document fields do not match candidate data."
                        : "One or more document fields are missing.",
            },
        });
    }

    if (state.clear) {
        return tx.bGVVerification.update({
            where: { id: verificationId },
            data: {
                result: "CLEAR",
                status: "COMPLETED",
                discrepancyLevel: null,
                remarks:
                    "All entered document fields match the candidate profile.",
            },
        });
    }

    return tx.bGVVerification.update({
        where: { id: verificationId },
        data: {
            result: null,
            remarks:
                "Verification fields are saved but comparison is not complete.",
        },
    });
}

export async function getBgvVerificationFields(id: string) {
    const verification = await getVerificationContext(id);

    return {
        data: verification.fields,
        candidate: verification.case.candidate,
        application: verification.case.application,
        candidateDocument: verification.candidateDocument,
    };
}

export async function saveBgvVerificationFields(
    id: string,
    input: SaveBgvFieldsInput
) {
    const verification = await getVerificationContext(id);
    const candidate = verification.case.candidate;

    if (!candidate) {
        throw AppError.badRequest(
            "Candidate profile is not available for comparison"
        );
    }

    if (!input || !Array.isArray(input.fields)) {
        throw AppError.badRequest("fields array is required");
    }

    if (input.fields.length === 0) {
        throw AppError.badRequest(
            "At least one verification field is required"
        );
    }

    const normalized = input.fields.map((field) =>
        buildFieldValues(
            candidate as unknown as Record<string, unknown>,
            field
        )
    );

    validateUniqueFieldNames(normalized);

    const state = getComparisonState(normalized);

    await prisma.$transaction(async (tx) => {
        for (const field of normalized) {
            if (field.id) {
                const existingField =
                    await tx.bGVVerificationField.findFirst({
                        where: {
                            id: field.id,
                            verificationId: id,
                        },
                        select: {
                            id: true,
                        },
                    });

                if (!existingField) {
                    throw AppError.notFound(
                        "Verification field not found"
                    );
                }

                await tx.bGVVerificationField.update({
                    where: {
                        id: field.id,
                    },
                    data: {
                        fieldName: field.fieldName,
                        expectedValue: field.expectedValue,
                        actualValue: field.actualValue,
                        matchStatus: field.matchStatus,
                        remarks: field.remarks,
                    },
                });
            } else {
                await tx.bGVVerificationField.create({
                    data: {
                        verificationId: id,
                        fieldName: field.fieldName,
                        expectedValue: field.expectedValue,
                        actualValue: field.actualValue,
                        matchStatus: field.matchStatus,
                        remarks: field.remarks,
                    },
                });
            }
        }

        await updateVerificationResult(
            tx,
            id,
            verification.status,
            state
        );
    });

    return getBgvVerificationFields(id);
}

export async function compareBgvVerificationFields(id: string) {
    const verification = await getVerificationContext(id);
    const candidate = verification.case.candidate;

    if (!candidate) {
        throw AppError.badRequest(
            "Candidate profile is not available for comparison"
        );
    }

    if (verification.fields.length === 0) {
        throw AppError.badRequest(
            "No verification fields have been entered"
        );
    }

    const fields = verification.fields.map((field) => {
        const expectedValue = candidateValue(
            candidate as unknown as Record<string, unknown>,
            field.fieldName
        );

        const actualValue = field.actualValue || "";
        const matchStatus = compare(
            expectedValue,
            actualValue
        );

        return {
            ...field,
            expectedValue: expectedValue || null,
            matchStatus,
        };
    });

    const state = getComparisonState(fields);

    await prisma.$transaction(async (tx) => {
        for (const field of fields) {
            await tx.bGVVerificationField.update({
                where: {
                    id: field.id,
                },
                data: {
                    expectedValue: field.expectedValue,
                    matchStatus: field.matchStatus,
                },
            });
        }

        await updateVerificationResult(
            tx,
            id,
            verification.status,
            state
        );
    });

    return {
        data: fields,
        summary: state,
    };
}
