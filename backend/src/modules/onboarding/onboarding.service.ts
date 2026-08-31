import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

/**
 * List all onboarding records with checklist items.
 */
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
        records.map((record) => serializeOnboarding(record))
    );

    return { data };
}

/**
 * Get onboarding record for a specific employee.
 */
export async function getOnboardingRecord(employeeId: string) {
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

/**
 * Get onboarding dashboard summary.
 */
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

        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
    }).length;

    const pendingProcurement = items.filter(
        (item) =>
            item.status === "Pending_Procurement"
    ).length;

    return {
        data: {
            newJoiners: records.length,

            avgCompletion:
                totalItems > 0
                    ? Math.round(
                        (completeItems / totalItems) * 100
                    )
                    : 0,

            overdueItems,

            pendingProcurement,
        },
    };
}

/**
 * Update checklist item status.
 */
export async function updateChecklistItemStatus(
    employeeId: string,
    itemId: string,
    status: string
) {
    /**
     * Statuses supported by the onboarding workflow.
     */
    const validStatuses = [
        "Pending",
        "Complete",
        "Pending_Procurement",
        "Blocked",
    ];

    if (!validStatuses.includes(status)) {
        throw AppError.badRequest(
            `Invalid checklist status: ${status}`
        );
    }

    /**
     * Find onboarding record first.
     */
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

    /**
     * Find requested checklist item.
     */
    const item =
        onboarding.checklistItems.find(
            (checklistItem) =>
                checklistItem.id === itemId
        );

    if (!item) {
        throw AppError.notFound(
            "Checklist item not found"
        );
    }

    /**
     * A checklist item cannot be completed
     * until its dependency is completed.
     */
    if (
        status === "Complete" &&
        item.dependsOn
    ) {
        const dependency =
            onboarding.checklistItems.find(
                (checklistItem) =>
                    checklistItem.id === item.dependsOn
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

    /**
     * Update selected checklist item.
     */
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

            blockedReason:
                status === "Blocked"
                    ? item.blockedReason
                    : null,
        },
    });

    /**
     * Find all items depending on the updated item.
     */
    const dependents =
        onboarding.checklistItems.filter(
            (checklistItem) =>
                checklistItem.dependsOn === itemId
        );

    /**
     * If current item is not complete,
     * dependent items become blocked.
     *
     * If current item becomes complete,
     * previously blocked dependents become pending.
     */
    for (const dependent of dependents) {
        if (status !== "Complete") {
            await prisma.onboardingChecklistItem.update({
                where: {
                    id: dependent.id,
                },
                data: {
                    status: "Blocked" as any,

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

                    completedAt: null,
                },
            });
        }
    }

    /**
     * Recalculate onboarding status
     * after checklist changes.
     */
    const items =
        await prisma.onboardingChecklistItem.findMany({
            where: {
                onboardingId: onboarding.id,
            },
        });

    const completed =
        items.length > 0 &&
        items.every(
            (checklistItem) =>
                checklistItem.status === "Complete"
        );

    const started = items.some(
        (checklistItem) =>
            checklistItem.status !== "Pending" &&
            checklistItem.status !== "Blocked"
    );

    let onboardingStatus:
        | "COMPLETED"
        | "IN_PROGRESS"
        | "NOT_STARTED";

    if (completed) {
        onboardingStatus = "COMPLETED";
    } else if (started) {
        onboardingStatus = "IN_PROGRESS";
    } else {
        onboardingStatus = "NOT_STARTED";
    }

    await prisma.onboarding.update({
        where: {
            id: onboarding.id,
        },
        data: {
            status: onboardingStatus,
        },
    });

    /**
     * Return latest database state.
     */
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

    if (!updated) {
        throw AppError.notFound(
            "Onboarding record not found after update"
        );
    }

    return {
        data: await serializeOnboarding(updated),
    };
}

/**
 * Convert database onboarding record
 * into frontend-friendly response.
 */
async function serializeOnboarding(record: any) {
    if (!record) {
        throw AppError.notFound(
            "Onboarding record not found"
        );
    }

    /**
     * Find employee information.
     */
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

    /**
     * Safely format employee name.
     */
    const employeeName = employee
        ? `${employee.firstName} ${
            employee.lastName ?? ""
        }`.trim()
        : "Unknown Employee";

    /**
     * Safely serialize checklist items.
     */
    const checklistItems =
        Array.isArray(record.checklistItems)
            ? record.checklistItems
            : [];

    const items = checklistItems.map(
        (item: any) => {
            const dueDate =
                item.dueDate
                    ? new Date(item.dueDate)
                        .toISOString()
                        .slice(0, 10)
                    : null;

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
                    dueDate !== null &&
                    dueDate < today,
            };
        }
    );

    return {
        employeeId: record.employeeId,

        employeeName,

        avatar: employee
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                employeeName
            )}`
            : null,

        designation: null,

        department: null,

        joinDate: record.joinDate
            ? new Date(record.joinDate)
                .toISOString()
                .slice(0, 10)
            : null,

        buddy: record.buddy,

        probationEndDate:
            record.probationEndDate
                ? new Date(
                    record.probationEndDate
                )
                    .toISOString()
                    .slice(0, 10)
                : null,

        status: record.status,

        items,
    };
}