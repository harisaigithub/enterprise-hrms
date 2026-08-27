import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { randomUUID } from "crypto";
import path from "path";
import minioClient, {
    MINIO_BUCKET,
} from "../../config/minio";
import {createCertificate} from "./certificate/certificate.service";

const MAX_ATTEMPTS = 3;

export async function listCourses() {
    const courses = await prisma.course.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });

    return {
        data: courses,
    };
}

export async function createCourse(input: {
    title: string;
    description?: string;
    contentModules: string[];
    isCompliance: boolean;
    expiryMonths?: number | null;
    passThreshold?: number;

    versionGroupId?: string;

    questions?: {
        question: string;
        options: {
            optionText: string;
            isCorrect: boolean;
        }[];
    }[];
}) {
    if (!input.title?.trim()) {
        throw AppError.badRequest("Course title is required");
    }

    if (!input.contentModules?.length) {
        throw AppError.badRequest(
            "At least one content module is required"
        );
    }

    const passThreshold = input.passThreshold ?? 70;

    if (passThreshold < 1 || passThreshold > 100) {
        throw AppError.badRequest(
            "Pass threshold must be between 1 and 100"
        );
    }

    let version = 1;
    let versionGroupId = input.versionGroupId ?? null;

    if (input.versionGroupId) {
        const baseCourse = await prisma.course.findUnique({
            where: {
                id: input.versionGroupId,
            },
            select: {
                id: true,
                versionGroupId: true,
            },
        });

        if (!baseCourse) {
            throw AppError.notFound(
                "Base course for versioning not found"
            );
        }

        // Always use the original/root version group
        versionGroupId =
            baseCourse.versionGroupId ?? baseCourse.id;

        const latestVersion = await prisma.course.findFirst({
            where: {
                OR: [
                    {
                        id: versionGroupId,
                    },
                    {
                        versionGroupId,
                    },
                ],
            },
            orderBy: {
                version: "desc",
            },
            select: {
                version: true,
            },
        });

        version = (latestVersion?.version ?? 0) + 1;
    }

    if (
        input.isCompliance &&
        (!input.expiryMonths || input.expiryMonths <= 0)
    ) {
        throw AppError.badRequest(
            "Compliance courses require an expiry period"
        );
    }

    const course = await prisma.course.create({
        data: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            contentModules: input.contentModules,
            isCompliance: input.isCompliance,
            expiryMonths: input.isCompliance
                ? input.expiryMonths
                : null,
            passThreshold,

            version,

            versionGroupId,

            questions: input.questions?.length
                ? {
                    create: input.questions.map((q, index) => ({
                        question: q.question,
                        order: index + 1,
                        options: {
                            create: q.options,
                        },
                    })),
                }
                : undefined,
        },
        include: {
            questions: {
                include: {
                    options: true,
                },
            },
        },
    });

    return {
        data: course,
    };
}

export async function publishCourse(courseId: string) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            questions: {
                include: {
                    options: true,
                },
            },
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    if (course.status !== "DRAFT") {
        throw AppError.badRequest(
            "Only draft courses can be published"
        );
    }

    if (!course.title.trim()) {
        throw AppError.badRequest(
            "Course title is required before publishing"
        );
    }

    if (
        !Array.isArray(course.contentModules) ||
        course.contentModules.length === 0
    ) {
        throw AppError.badRequest(
            "At least one course content module is required before publishing"
        );
    }

    if (
        course.isCompliance &&
        (!course.expiryMonths || course.expiryMonths <= 0)
    ) {
        throw AppError.badRequest(
            "Compliance course requires expiry period"
        );
    }

    if (course.questions.length === 0) {
        throw AppError.badRequest(
            "Course must contain quiz questions"
        );
    }

    for (const question of course.questions) {
        if (!question.question.trim()) {
            throw AppError.badRequest(
                "Quiz question text is required"
            );
        }

        if (question.options.length !== 4) {
            throw AppError.badRequest(
                `Question "${question.question}" must have exactly 4 options`
            );
        }

        const correct = question.options.filter(
            (o) => o.isCorrect
        );

        if (correct.length !== 1) {
            throw AppError.badRequest(
                `Question "${question.question}" must have exactly one correct answer`
            );
        }

        for (const option of question.options) {
            if (!option.optionText.trim()) {
                throw AppError.badRequest(
                    `All options for question "${question.question}" are required`
                );
            }
        }
    }

    const versionGroupId =
        course.versionGroupId ?? course.id;

    const updated = await prisma.$transaction(async (tx) => {

        // Archive previously published version
        await tx.course.updateMany({
            where: {
                OR: [
                    {
                        id: versionGroupId,
                    },
                    {
                        versionGroupId: versionGroupId,
                    },
                ],
                status: "PUBLISHED",
                id: {
                    not: course.id,
                },
            },
            data: {
                status: "ARCHIVED",
            },
        });

        // Publish current version
        return tx.course.update({
            where: {
                id: courseId,
            },
            data: {
                status: "PUBLISHED",
                versionGroupId,
            },
        });
    });

    return {
        data: {
            course: updated,
        },
    };
}

export async function listEmployeeEnrollments(
    employeeId: string
) {
    const enrollments =
        await prisma.courseEnrollment.findMany({
            where: {
                employeeId,
            },
            include: {
                course: true,
                certificate: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

    return {
        data: enrollments,
    };
}

export async function listAllEnrollments() {
    const enrollments =
        await prisma.courseEnrollment.findMany({
            include: {
                course: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

    return {
        data: enrollments,
    };
}

export async function assignCourse(
    courseId: string,
    employeeId: string
) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    if (course.status !== "PUBLISHED") {
        throw AppError.badRequest(
            "Only published courses can be assigned"
        );
    }

    const employee = await prisma.employee.findUnique({
        where: {
            employeeCode: employeeId,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
        },
    });

    if (!employee) {
        throw AppError.notFound("Employee not found");
    }

    const employeeName =
        `${employee.firstName} ${employee.lastName ?? ""}`.trim();

    const existing =
        await prisma.courseEnrollment.findUnique({
            where: {
                courseId_employeeId: {
                    courseId,
                    employeeId: employee.id,
                },
            },
        });

    if (existing) {
        throw AppError.badRequest(
            "Course is already assigned to this employee"
        );
    }

    const enrollment =
        await prisma.courseEnrollment.create({
            data: {
                courseId,
                employeeId: employee.id,
                employeeName,
            },
            include: {
                course: true,
            },
        });

    return {
        data: enrollment,
    };
}

export async function submitQuiz(
    enrollmentId: string,
    answers: {
        questionId: string;
        optionId: string;
    }[]
) {
    const enrollment =
        await prisma.courseEnrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            include: {
                course: {
                    include: {
                        questions: {
                            include: {
                                options: true,
                            },
                        },
                    },
                },
            },
        });

    if (!enrollment) {
        throw AppError.notFound(
            "Course enrollment not found"
        );
    }

    if (enrollment.status === "LOCKED") {
        throw AppError.badRequest(
            "Maximum quiz attempts reached"
        );
    }

    if (enrollment.status === "PASSED") {
        throw AppError.badRequest(
            "Course already completed"
        );
    }

    if (enrollment.attempts >= MAX_ATTEMPTS) {
        await prisma.courseEnrollment.update({
            where: {
                id: enrollment.id,
            },
            data: {
                status: "LOCKED",
            },
        });

        throw AppError.badRequest(
            "Maximum quiz attempts reached"
        );
    }

    if (
        answers.length !== enrollment.course.questions.length
    ) {
        throw AppError.badRequest(
            "All quiz questions must be answered"
        );
    }

    const questionIds = new Set(
        answers.map((answer) => answer.questionId)
    );

    if (questionIds.size !== enrollment.course.questions.length) {
        throw AppError.badRequest(
            "Each quiz question must be answered exactly once"
        );
    }

    let correctCount = 0;

    const evaluatedAnswers = answers.map((answer) => {
        const question =
            enrollment.course.questions.find(
                (q) => q.id === answer.questionId
            );

        if (!question) {
            throw AppError.badRequest(
                "Invalid question"
            );
        }

        const option = question.options.find(
            (o) => o.id === answer.optionId
        );

        if (!option) {
            throw AppError.badRequest(
                "Invalid answer option"
            );
        }

        const isCorrect = option.isCorrect;

        if (isCorrect) {
            correctCount++;
        }

        return {
            questionId: question.id,
            optionId: option.id,
            isCorrect,
        };
    });

    const totalQuestions =
        enrollment.course.questions.length;

    const score = Math.round(
        (correctCount / totalQuestions) * 100
    );

    const passed =
        score >= enrollment.course.passThreshold;

    const attemptNumber =
        enrollment.attempts + 1;

    const expiresAt =
        passed &&
            enrollment.course.isCompliance &&
            enrollment.course.expiryMonths
            ? new Date(
                Date.now()
            )
            : null;

    if (expiresAt && enrollment.course.expiryMonths) {
        expiresAt.setMonth(
            expiresAt.getMonth() +
            enrollment.course.expiryMonths
        );
    }

    const result =
        await prisma.$transaction(async (tx) => {
            const attempt =
                await tx.courseQuizAttempt.create({
                    data: {
                        enrollmentId,
                        attemptNumber,
                        correctCount,
                        totalQuestions,
                        score,
                        passed,
                        answers: {
                            create: evaluatedAnswers,
                        },
                    },
                });

            const newAttempts = attemptNumber;

            const newStatus = passed
                ? "PASSED"
                : newAttempts >= MAX_ATTEMPTS
                    ? "LOCKED"
                    : "FAILED";

            const updated =
                await tx.courseEnrollment.update({
                    where: {
                        id: enrollmentId,
                    },
                    data: {
                        attempts: newAttempts,
                        score,
                        status: newStatus,
                        certifiedAt: passed
                            ? new Date()
                            : null,
                        expiresAt: passed
                            ? expiresAt
                            : null,
                    },
                    include: {
                        course: true,
                        employee:true,
                    },
                });

            return {
                attempt,
                enrollment: updated,
            };
        });


    let certificate = null;

    if (passed) {
        certificate = await createCertificate({
            enrollmentId: result.enrollment.id,
            employeeId: result.enrollment.employeeId,
            courseId: result.enrollment.courseId,

            employeeName:
                `${result.enrollment.employee.firstName} ${result.enrollment.employee.lastName}`.trim(),

            courseName: result.enrollment.course.title,

            score,

            expiresAt: result.enrollment.expiresAt,
        });
    }

    // return {
    //     data: {
    //         status:
    //             result.enrollment.status === "PASSED"
    //                 ? "Passed"
    //                 : result.enrollment.status === "LOCKED"
    //                     ? "Locked"
    //                     : "Failed",

    //         score,
    //         attempts: result.enrollment.attempts,

    //         attemptsRemaining: Math.max(
    //             0,
    //             MAX_ATTEMPTS - result.enrollment.attempts
    //         ),

    //         certifiedAt:
    //             result.enrollment.certifiedAt,

    //         expiresAt:
    //             result.enrollment.expiresAt,

    //         enrollment: result.enrollment,
    //     },
    // };

    return {
        data: {
            status:
                result.enrollment.status === "PASSED"
                    ? "Passed"
                    : result.enrollment.status === "LOCKED"
                        ? "Locked"
                        : "Failed",

            score,

            attempts:
                result.enrollment.attempts,

            attemptsRemaining: Math.max(
                0,
                MAX_ATTEMPTS -
                result.enrollment.attempts
            ),

            certifiedAt:
                result.enrollment.certifiedAt,

            expiresAt:
                result.enrollment.expiresAt,

            certificate: certificate
                ? {
                    id: certificate.id,
                    certificateNumber:
                        certificate.certificateNumber,
                    status:
                        certificate.status,
                    verificationUrl:
                        certificate.verificationUrl,
                }
                : null,

            enrollment:
                result.enrollment,
        },
    };
}

export async function getQuiz(
    enrollmentId: string
) {
    const enrollment =
        await prisma.courseEnrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            include: {
                course: {
                    include: {
                        questions: {
                            orderBy: {
                                order: "asc",
                            },
                            include: {
                                options: {
                                    select: {
                                        id: true,
                                        optionText: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

    if (!enrollment) {
        throw AppError.notFound(
            "Enrollment not found"
        );
    }

    return {
        data: {
            enrollmentId,
            courseId: enrollment.courseId,
            passThreshold:
                enrollment.course.passThreshold,
            attempts: enrollment.attempts,
            maxAttempts: MAX_ATTEMPTS,
            questions:
                enrollment.course.questions,
        },
    };
}

export async function createCourseVersion(courseId: string) {
    const existingCourse = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            questions: {
                orderBy: {
                    order: "asc",
                },
                include: {
                    options: true,
                },
            },

            contents: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    });

    if (!existingCourse) {
        throw AppError.notFound("Course not found");
    }

    // First version becomes the root of the version group.
    const versionGroupId =
        existingCourse.versionGroupId ?? existingCourse.id;

    // Find the latest version in this version group.
    const latestVersion = await prisma.course.findFirst({
        where: {
            OR: [
                {
                    id: versionGroupId,
                },
                {
                    versionGroupId,
                },
            ],
        },
        orderBy: {
            version: "desc",
        },
        select: {
            version: true,
        },
    });

    const nextVersion =
        (latestVersion?.version ?? existingCourse.version) + 1;

    const newCourse = await prisma.course.create({
        data: {
            title: existingCourse.title,
            description: existingCourse.description,
            contentModules: existingCourse.contentModules as Prisma.InputJsonValue,
            isCompliance: existingCourse.isCompliance,
            expiryMonths: existingCourse.expiryMonths,
            passThreshold: existingCourse.passThreshold,

            status: "DRAFT",

            version: nextVersion,
            versionGroupId,

            questions: {
                create: existingCourse.questions.map((question) => ({
                    question: question.question,
                    order: question.order,

                    options: {
                        create: question.options.map((option) => ({
                            optionText: option.optionText,
                            isCorrect: option.isCorrect,
                        })),
                    },
                })),
            },
            contents: {
                create: existingCourse.contents.map((content) => ({
                    moduleName: content.moduleName,
                    title: content.title,
                    type: content.type,
                    content: content.content,
                    fileUrl: content.fileUrl,
                    order: content.order,
                })),
            },
        },

        include: {
            questions: {
                orderBy: {
                    order: "asc",
                },
                include: {
                    options: true,
                },
            },
        },
    });

    return {
        data: newCourse,
    };
}

export async function updateCourseVersion(
    courseId: string,
    input: {
        title: string;
        description?: string;
        contentModules: string[];
        isCompliance: boolean;
        expiryMonths?: number | null;
        passThreshold: number;
        questions: {
            question: string;
            options: {
                optionText: string;
                isCorrect: boolean;
            }[];
        }[];
    }
) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        include: {
            questions: true,
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    // Published courses must never be edited directly.
    if (course.status !== "DRAFT") {
        throw AppError.badRequest(
            "Only draft course versions can be edited"
        );
    }

    if (!input.title?.trim()) {
        throw AppError.badRequest(
            "Course title is required"
        );
    }

    if (!input.contentModules?.length) {
        throw AppError.badRequest(
            "At least one content module is required"
        );
    }

    if (
        input.passThreshold < 1 ||
        input.passThreshold > 100
    ) {
        throw AppError.badRequest(
            "Pass threshold must be between 1 and 100"
        );
    }

    if (
        input.isCompliance &&
        (!input.expiryMonths || input.expiryMonths <= 0)
    ) {
        throw AppError.badRequest(
            "Compliance courses require an expiry period"
        );
    }

    if (!input.questions?.length) {
        throw AppError.badRequest(
            "At least one quiz question is required"
        );
    }

    for (const question of input.questions) {
        if (!question.question?.trim()) {
            throw AppError.badRequest(
                "Quiz question text is required"
            );
        }

        if (question.options.length !== 4) {
            throw AppError.badRequest(
                `Question "${question.question}" must have exactly 4 options`
            );
        }

        const correctOptions =
            question.options.filter(
                (option) => option.isCorrect
            );

        if (correctOptions.length !== 1) {
            throw AppError.badRequest(
                `Question "${question.question}" must have exactly one correct answer`
            );
        }

        for (const option of question.options) {
            if (!option.optionText?.trim()) {
                throw AppError.badRequest(
                    `All options for question "${question.question}" are required`
                );
            }
        }
    }

    const updatedCourse =
        await prisma.$transaction(async (tx) => {
            // Remove old questions.
            await tx.courseQuizQuestion.deleteMany({
                where: {
                    courseId,
                },
            });

            // Update course and create new question set.
            return tx.course.update({
                where: {
                    id: courseId,
                },

                data: {
                    title: input.title.trim(),
                    description:
                        input.description?.trim() || null,

                    contentModules:
                        input.contentModules,

                    isCompliance:
                        input.isCompliance,

                    expiryMonths:
                        input.isCompliance
                            ? input.expiryMonths
                            : null,

                    passThreshold:
                        input.passThreshold,

                    questions: {
                        create:
                            input.questions.map(
                                (question, index) => ({
                                    question:
                                        question.question.trim(),

                                    order: index + 1,

                                    options: {
                                        create:
                                            question.options.map(
                                                (option) => ({
                                                    optionText:
                                                        option.optionText.trim(),

                                                    isCorrect:
                                                        option.isCorrect,
                                                })
                                            ),
                                    },
                                })
                            ),
                    },
                },

                include: {
                    questions: {
                        orderBy: {
                            order: "asc",
                        },
                        include: {
                            options: true,
                        },
                    },
                },
            });
        });

    return {
        data: updatedCourse,
    };
}

export async function addCourseContent(
    courseId: string,
    input: {
        moduleName: string;
        title: string;
        type: "TEXT" | "PDF" | "VIDEO" | "LINK";
        content?: string;
        fileUrl?: string;
        order: number;
    }
) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    if (course.status !== "DRAFT") {
        throw AppError.badRequest(
            "Content can only be added to draft courses"
        );
    }

    if (!input.moduleName?.trim()) {
        throw AppError.badRequest(
            "Module name is required"
        );
    }

    if (!input.title?.trim()) {
        throw AppError.badRequest(
            "Content title is required"
        );
    }

    if (!input.order || input.order < 1) {
        throw AppError.badRequest(
            "Content order must be greater than 0"
        );
    }

    if (input.type === "TEXT" && !input.content?.trim()) {
        throw AppError.badRequest(
            "Text content is required"
        );
    }

    if (
        ["PDF", "VIDEO", "LINK"].includes(input.type) &&
        !input.fileUrl?.trim()
    ) {
        throw AppError.badRequest(
            "Content URL is required"
        );
    }

    const existing =
        await prisma.courseContent.findFirst({
            where: {
                courseId,
                order: input.order,
            },
        });

    if (existing) {
        throw AppError.badRequest(
            `Content order ${input.order} already exists`
        );
    }

    const content =
        await prisma.courseContent.create({
            data: {
                courseId,
                moduleName: input.moduleName.trim(),
                title: input.title.trim(),
                type: input.type,
                content: input.content?.trim() || null,
                fileUrl: input.fileUrl?.trim() || null,
                order: input.order,
            },
        });

    return {
        data: content,
    };
}

export async function listCourseContents(
    courseId: string
) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        select: {
            id: true,
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    const contents =
        await prisma.courseContent.findMany({
            where: {
                courseId,
            },
            orderBy: {
                order: "asc",
            },
        });

    return {
        data: contents,
    };
}

export async function startCourseContent(
    enrollmentId: string,
    contentId: string
) {
    const enrollment =
        await prisma.courseEnrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            select: {
                id: true,
                courseId: true,
                status: true,
            },
        });

    if (!enrollment) {
        throw AppError.notFound(
            "Course enrollment not found"
        );
    }

    if (enrollment.status === "LOCKED") {
        throw AppError.badRequest(
            "Course enrollment is locked"
        );
    }

    if (enrollment.status === "PASSED") {
        throw AppError.badRequest(
            "Course is already completed"
        );
    }

    const content =
        await prisma.courseContent.findFirst({
            where: {
                id: contentId,
                courseId: enrollment.courseId,
            },
        });

    if (!content) {
        throw AppError.notFound(
            "Course content not found"
        );
    }

    const progress =
        await prisma.courseContentProgress.upsert({
            where: {
                enrollmentId_contentId: {
                    enrollmentId,
                    contentId,
                },
            },

            create: {
                enrollmentId,
                contentId,
                status: "IN_PROGRESS",
                startedAt: new Date(),
            },

            update: {
                status: "IN_PROGRESS",
            },
        });

    // Enrollment should move from NOT_STARTED -> IN_PROGRESS
    if (enrollment.status === "NOT_STARTED") {
        await prisma.courseEnrollment.update({
            where: {
                id: enrollmentId,
            },
            data: {
                status: "IN_PROGRESS",
            },
        });
    }

    return {
        data: progress,
    };
}

export async function completeCourseContent(
    enrollmentId: string,
    contentId: string
) {
    const enrollment =
        await prisma.courseEnrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            select: {
                id: true,
                courseId: true,
                status: true,
            },
        });

    if (!enrollment) {
        throw AppError.notFound(
            "Course enrollment not found"
        );
    }

    if (enrollment.status === "LOCKED") {
        throw AppError.badRequest(
            "Course enrollment is locked"
        );
    }

    if (enrollment.status === "PASSED") {
        throw AppError.badRequest(
            "Course is already completed"
        );
    }

    const content =
        await prisma.courseContent.findFirst({
            where: {
                id: contentId,
                courseId: enrollment.courseId,
            },
        });

    if (!content) {
        throw AppError.notFound(
            "Course content not found"
        );
    }

    const existingProgress =
        await prisma.courseContentProgress.findUnique({
            where: {
                enrollmentId_contentId: {
                    enrollmentId,
                    contentId,
                },
            },
        });

    if (!existingProgress) {
        throw AppError.badRequest(
            "Start the course content before completing it"
        );
    }

    const progress =
        await prisma.courseContentProgress.update({
            where: {
                enrollmentId_contentId: {
                    enrollmentId,
                    contentId,
                },
            },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });

    if (enrollment.status === "NOT_STARTED") {
        await prisma.courseEnrollment.update({
            where: {
                id: enrollmentId,
            },
            data: {
                status: "IN_PROGRESS",
            },
        });
    }

    return {
        data: progress,
    };
}

export async function getEnrollmentContent(
    enrollmentId: string
) {
    const enrollment =
        await prisma.courseEnrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            include: {
                course: {
                    include: {
                        contents: {
                            orderBy: {
                                order: "asc",
                            },
                        },
                    },
                },
                contentProgress: true,
            },
        });

    if (!enrollment) {
        throw AppError.notFound(
            "Course enrollment not found"
        );
    }

    const progressMap = new Map(
        enrollment.contentProgress.map((progress) => [
            progress.contentId,
            progress,
        ])
    );

    const contents = enrollment.course.contents.map(
        (content) => {
            const progress =
                progressMap.get(content.id);

            return {
                id: content.id,
                moduleName: content.moduleName,
                title: content.title,
                type: content.type,
                content: content.content,
                fileUrl: content.fileUrl,
                order: content.order,

                status:
                    progress?.status ??
                    "NOT_STARTED",

                startedAt:
                    progress?.startedAt ?? null,

                completedAt:
                    progress?.completedAt ?? null,
            };
        }
    );

    const completedCount = contents.filter(
        (content) =>
            content.status === "COMPLETED"
    ).length;

    const totalCount = contents.length;

    const progressPercentage =
        totalCount === 0
            ? 0
            : Math.round(
                (completedCount / totalCount) * 100
            );

    return {
        data: {
            enrollmentId: enrollment.id,

            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                description:
                    enrollment.course.description,
                passThreshold:
                    enrollment.course.passThreshold,
            },

            enrollmentStatus:
                enrollment.status,

            contents,

            progress: {
                completed: completedCount,
                total: totalCount,
                percentage: progressPercentage,
            },
        },
    };
}

export async function uploadCourseContentFile(
    file: Express.Multer.File
) {
    if (!file) {
        throw AppError.badRequest("File is required");
    }

    const extension = path.extname(file.originalname);

    const objectName =
        `lms/content/${randomUUID()}${extension}`;

    await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        file.buffer,
        file.size,
        {
            "Content-Type": file.mimetype,
        }
    );

    return {
        fileUrl: `/uploads/lms/content/${objectName
            .split("/")
            .pop()}`,

        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
    };
}

export async function uploadCourseThumbnail(
    courseId: string,
    file: Express.Multer.File
) {
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (!course) {
        throw AppError.notFound("Course not found");
    }

    if (course.status !== "DRAFT") {
        throw AppError.badRequest(
            "Thumbnail can only be changed for draft courses"
        );
    }

    if (!file) {
        throw AppError.badRequest(
            "Thumbnail file is required"
        );
    }

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        throw AppError.badRequest(
            "Only JPG, JPEG, PNG and WEBP images are allowed"
        );
    }

    const extension = path.extname(file.originalname);

    const objectName =
        `lms/thumbnails/${randomUUID()}${extension}`;

    await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        file.buffer,
        file.size,
        {
            "Content-Type": file.mimetype,
        }
    );

    const fileName = objectName.split("/").pop();

    const fileUrl =
        `/uploads/lms/thumbnails/${fileName}`;

    const updatedCourse =
        await prisma.course.update({
            where: {
                id: courseId,
            },
            data: {
                thumbnailUrl: fileUrl,
            },
        });

    return {
        data: {
            thumbnailUrl:
                updatedCourse.thumbnailUrl,
        },
    };
}