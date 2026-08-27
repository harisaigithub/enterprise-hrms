import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

export async function listOnboardingRecords() {
    const records = await prisma.onboarding.findMany({
        include: {
            checklistItems: {
                orderBy: {
                    dueDate: "asc",
                },
            },
        },
        orderBy: {
            joinDate: "asc",
        },
    });

    const data = await Promise.all(
        records.map(serializeOnboarding)
    );

    return { data };
}

export async function getOnboardingRecord(
    employeeId: string
) {
    const record = await prisma.onboarding.findUnique({
        where: {
            employeeId,
        },
        include: {
            checklistItems: {
                orderBy: {
                    dueDate: "asc",
                },
            },
        },
    });

    if (!record) {
        throw AppError.notFound(
            "Onboarding record not found"
        );
    }

    return {
        data: await serializeOnboarding(record),
    };
}

export async function getOnboardingSummary() {
    const records = await prisma.onboarding.findMany({
        include: {
            checklistItems: true,
        },
    });

    const items = records.flatMap(
        (record) => record.checklistItems
    );

    const totalItems = items.length;

    const completeItems = items.filter(
        (item) => item.status === "Complete"
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueItems = items.filter((item) => {
        if (item.status === "Complete") {
            return false;
        }

        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);

        return due < today;
    }).length;

    const pendingProcurement = items.filter(
        (item) =>
            item.status === "Pending_Procurement"
    ).length;

    return {
        data: {
            newJoiners: records.length,
            avgCompletion: totalItems
                ? Math.round(
                    (completeItems / totalItems) * 100
                )
                : 0,
            overdueItems,
            pendingProcurement,
        },
    };
}

export async function updateChecklistItemStatus(
    employeeId: string,
    itemId: string,
    status: string
) {
    const validStatuses = [
        "Pending",
        "Complete",
        "Pending_Procurement",
    ];

    if (!validStatuses.includes(status)) {
        throw AppError.badRequest(
            "Invalid checklist status"
        );
    }

    const onboarding =
        await prisma.onboarding.findUnique({
            where: {
                employeeId,
            },
            include: {
                checklistItems: true,
            },
        });

    if (!onboarding) {
        throw AppError.notFound(
            "Onboarding record not found"
        );
    }

    const item =
        onboarding.checklistItems.find(
            (i) => i.id === itemId
        );

    if (!item) {
        throw AppError.notFound(
            "Checklist item not found"
        );
    }

    if (
        status === "Complete" &&
        item.dependsOn
    ) {
        const dependency =
            onboarding.checklistItems.find(
                (i) => i.id === item.dependsOn
            );

        if (
            dependency &&
            dependency.status !== "Complete"
        ) {
            throw AppError.badRequest(
                `Cannot complete "${item.title}". Waiting on "${dependency.title}".`
            );
        }
    }

    await prisma.onboardingChecklistItem.update({
        where: {
            id: itemId,
        },
        data: {
            status: status as any,
            completedAt:
                status === "Complete"
                    ? new Date()
                    : null,
            blockedReason: null,
        },
    });

    const dependents =
        onboarding.checklistItems.filter(
            (i) => i.dependsOn === itemId
        );

    for (const dependent of dependents) {
        if (status !== "Complete") {
            await prisma.onboardingChecklistItem.update({
                where: {
                    id: dependent.id,
                },
                data: {
                    status: "Blocked",
                    blockedReason:
                        `Waiting on "${item.title}"`,
                },
            });
        } else if (
            dependent.status === "Blocked"
        ) {
            await prisma.onboardingChecklistItem.update({
                where: {
                    id: dependent.id,
                },
                data: {
                    status: "Pending",
                    blockedReason: null,
                },
            });
        }
    }

    const items =
        await prisma.onboardingChecklistItem.findMany({
            where: {
                onboardingId: onboarding.id,
            },
        });

    const completed =
        items.length > 0 &&
        items.every(
            (i) => i.status === "Complete"
        );

    const started = items.some(
        (i) =>
            i.status !== "Pending" &&
            i.status !== "Blocked"
    );

    await prisma.onboarding.update({
        where: {
            id: onboarding.id,
        },
        data: {
            status: completed
                ? "COMPLETED"
                : started
                    ? "IN_PROGRESS"
                    : "NOT_STARTED",
        },
    });

    const updated =
        await prisma.onboarding.findUnique({
            where: {
                employeeId,
            },
            include: {
                checklistItems: {
                    orderBy: {
                        dueDate: "asc",
                    },
                },
            },
        });

    return {
        data: await serializeOnboarding(updated),
    };
}

async function serializeOnboarding(
    record: any
) {
    const employee =
        await prisma.employee.findUnique({
            where: {
                id: record.employeeId,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });

    return {
        employeeId: record.employeeId,

        employeeName: employee
            ? `${employee.firstName} ${employee.lastName ?? ""}`.trim()
            : "Unknown Employee",

        avatar: employee
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                `${employee.firstName} ${employee.lastName ?? ""}`.trim()
            )}`
            : null,

        designation: null,

        department: null,

        joinDate: new Date(record.joinDate)
            .toISOString()
            .slice(0, 10),

        buddy: record.buddy,

        probationEndDate:
            new Date(record.probationEndDate)
                .toISOString()
                .slice(0, 10),

        status: record.status,

        items: record.checklistItems.map(
            (item: any) => {
                const dueDate =
                    new Date(item.dueDate)
                        .toISOString()
                        .slice(0, 10);

                const today =
                    new Date()
                        .toISOString()
                        .slice(0, 10);

                return {
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    owner: item.owner,
                    dueDate,

                    status:
                        item.status ===
                        "Pending_Procurement"
                            ? "Pending Procurement"
                            : item.status,

                    dependsOn: item.dependsOn,

                    blockedReason:
                        item.blockedReason,

                    isOverdue:
                        item.status !== "Complete" &&
                        dueDate < today,
                };
            }
        ),
    };
}