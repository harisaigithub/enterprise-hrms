import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export type UpdateBgvCandidateProfileInput = {
    firstName?: string;
    lastName?: string | null;
    email?: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    fatherName?: string | null;
    motherName?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    highestEducation?: string | null;
    degree?: string | null;
    specialization?: string | null;
    collegeName?: string | null;
    passingYear?: number | string | null;
    totalExperienceYears?: number | string | null;
    currentCompany?: string | null;
    currentDesignation?: string | null;
    noticePeriodDays?: number | string | null;
    currentLocation?: string | null;
};

function normalizeString(value: string | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const valueTrimmed = value.trim();
    return valueTrimmed === "" ? null : valueTrimmed;
}

function normalizeNumber(
    value: number | string | null | undefined,
    fieldName: string,
    min?: number,
    max?: number,
    integer = false
) {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const numberValue =
        typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numberValue)) {
        throw AppError.badRequest(
            `${fieldName} must be a valid number`
        );
    }

    if (integer && !Number.isInteger(numberValue)) {
        throw AppError.badRequest(
            `${fieldName} must be an integer`
        );
    }

    if (min !== undefined && numberValue < min) {
        throw AppError.badRequest(
            `${fieldName} must be at least ${min}`
        );
    }

    if (max !== undefined && numberValue > max) {
        throw AppError.badRequest(
            `${fieldName} must be at most ${max}`
        );
    }

    return numberValue;
}

function normalizeDateOfBirth(
    value: string | null | undefined
): Date | null | undefined {
    if (value === undefined) return undefined;

    if (value === null || value === "") {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest("Invalid date of birth");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (date > today) {
        throw AppError.badRequest(
            "Date of birth cannot be in the future"
        );
    }

    return date;
}

export async function updateBgvCandidateProfile(
    id: string,
    input: UpdateBgvCandidateProfileInput
) {
    if (!id || !id.trim()) {
        throw AppError.badRequest("Candidate id is required");
    }

    const existing = await prisma.candidate.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!existing) {
        throw AppError.notFound("Candidate not found");
    }

    const data: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
        const firstName = normalizeString(input.firstName);

        if (!firstName) {
            throw AppError.badRequest("First name is required");
        }

        data.firstName = firstName;
    }

    if (input.lastName !== undefined) {
        data.lastName = normalizeString(input.lastName);
    }

    if (input.email !== undefined) {
        const email = normalizeString(input.email);

        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            throw AppError.badRequest("Invalid email address");
        }

        data.email = email;
    }

    if (input.phone !== undefined) {
        data.phone = normalizeString(input.phone);
    }

    if (input.dateOfBirth !== undefined) {
        data.dateOfBirth = normalizeDateOfBirth(
            input.dateOfBirth
        );
    }

    if (input.gender !== undefined) {
        data.gender = normalizeString(input.gender);
    }

    if (input.fatherName !== undefined) {
        data.fatherName = normalizeString(input.fatherName);
    }

    if (input.motherName !== undefined) {
        data.motherName = normalizeString(input.motherName);
    }

    if (input.address !== undefined) {
        data.address = normalizeString(input.address);
    }

    if (input.city !== undefined) {
        data.city = normalizeString(input.city);
    }

    if (input.state !== undefined) {
        data.state = normalizeString(input.state);
    }

    if (input.country !== undefined) {
        data.country = normalizeString(input.country);
    }

    if (input.postalCode !== undefined) {
        data.postalCode = normalizeString(input.postalCode);
    }

    if (input.highestEducation !== undefined) {
        data.highestEducation =
            normalizeString(input.highestEducation);
    }

    if (input.degree !== undefined) {
        data.degree = normalizeString(input.degree);
    }

    if (input.specialization !== undefined) {
        data.specialization =
            normalizeString(input.specialization);
    }

    if (input.collegeName !== undefined) {
        data.collegeName =
            normalizeString(input.collegeName);
    }

    if (input.passingYear !== undefined) {
        data.passingYear = normalizeNumber(
            input.passingYear,
            "Passing year",
            1900,
            new Date().getFullYear() + 1,
            true
        );
    }

    if (input.totalExperienceYears !== undefined) {
        data.totalExperienceYears = normalizeNumber(
            input.totalExperienceYears,
            "Total experience years",
            0,
            100
        );
    }

    if (input.currentCompany !== undefined) {
        data.currentCompany =
            normalizeString(input.currentCompany);
    }

    if (input.currentDesignation !== undefined) {
        data.currentDesignation =
            normalizeString(input.currentDesignation);
    }

    if (input.noticePeriodDays !== undefined) {
        data.noticePeriodDays = normalizeNumber(
            input.noticePeriodDays,
            "Notice period days",
            0,
            3650,
            true
        );
    }

    if (input.currentLocation !== undefined) {
        data.currentLocation =
            normalizeString(input.currentLocation);
    }

    if (Object.keys(data).length === 0) {
        throw AppError.badRequest(
            "At least one candidate profile field is required"
        );
    }

    const updated = await prisma.candidate.update({
        where: { id },
        data,
    });

    return {
        data: updated,
    };
}
