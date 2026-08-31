import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

/* =========================================================
   TASK CONSTANTS
   ========================================================= */

export const TASK_STATUSES = [
    "Todo",
    "In Progress",
    "Review",
    "Done",
] as const;

export const TASK_PRIORITIES = [
    "Low",
    "Medium",
    "High",
    "Urgent",
] as const;

/* =========================================================
   TYPES
   ========================================================= */

export interface CreateProjectInput {
    name: string;
    memberIds?: string[];
}

export interface CreateMilestoneInput {
    title: string;
    dueDate: string;
}

export interface CreateTaskInput {
    projectId: string;
    milestoneId?: string | null;
    title: string;
    assigneeId: string;
    priority?: string;
    dueDate: string;
    blockerTaskIds?: string[];
}

export interface UpdateTaskStatusOptions {
    force?: boolean;
    reason?: string;
}

export interface TimeEntryInput {
    employeeId: string;
    date: string;
    hours: number | string;
    note?: string;
}

/* =========================================================
   COMMON INCLUDES
   ========================================================= */

const EMPLOYEE_SELECT = {
    id: true,
    employeeCode: true,
    firstName: true,
    lastName: true,
    status: true,
} satisfies Prisma.EmployeeSelect;

const PROJECT_INCLUDE = {
    members: {
        include: {
            employee: {
                select: EMPLOYEE_SELECT,
            },
        },
    },
    milestones: {
        orderBy: {
            dueDate: "asc",
        },
    },
} satisfies Prisma.TaskProjectInclude;

const TASK_INCLUDE = {
    project: {
        select: {
            id: true,
            name: true,
        },
    },

    milestone: {
        select: {
            id: true,
            title: true,
            dueDate: true,
        },
    },

    assignee: {
        select: EMPLOYEE_SELECT,
    },

    dependencies: {
        include: {
            blocker: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                },
            },
        },
    },
} satisfies Prisma.TaskInclude;

/* =========================================================
   PROJECTS
   ========================================================= */

export async function listProjects() {
    const projects = await prisma.taskProject.findMany({
        include: PROJECT_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });

    return {
        data: projects.map(serializeProject),
    };
}

export async function createProject(
    input: CreateProjectInput
) {
    const name = input.name?.trim();

    if (!name) {
        throw AppError.badRequest(
            "Project name is required"
        );
    }

    const memberIds = [
        ...new Set(input.memberIds ?? []),
    ];

    if (memberIds.length > 0) {
        const employees =
            await prisma.employee.findMany({
                where: {
                    id: {
                        in: memberIds,
                    },
                    status: "Active",
                },
                select: {
                    id: true,
                },
            });

        if (employees.length !== memberIds.length) {
            throw AppError.badRequest(
                "One or more project members are invalid or inactive"
            );
        }
    }

    const project =
        await prisma.taskProject.create({
            data: {
                name,

                members: {
                    create: memberIds.map(
                        (employeeId) => ({
                            employeeId,
                        })
                    ),
                },
            },

            include: PROJECT_INCLUDE,
        });

    return {
        data: serializeProject(project),
    };
}

/* =========================================================
   MILESTONES
   ========================================================= */

export async function createMilestone(
    projectId: string,
    input: CreateMilestoneInput
) {
    const project =
        await prisma.taskProject.findUnique({
            where: {
                id: projectId,
            },
        });

    if (!project) {
        throw AppError.notFound(
            "Project not found"
        );
    }

    const title = input.title?.trim();

    if (!title) {
        throw AppError.badRequest(
            "Milestone title is required"
        );
    }

    const dueDate = parseDate(
        input.dueDate,
        "Milestone due date"
    );

    const milestone =
        await prisma.taskMilestone.create({
            data: {
                projectId,
                title,
                dueDate,
            },
        });

    return {
        data: serializeMilestone(milestone),
    };
}

/* =========================================================
   TASKS
   ========================================================= */

export async function listTasks() {
    const tasks =
        await prisma.task.findMany({
            include: TASK_INCLUDE,

            orderBy: [
                {
                    dueDate: "asc",
                },
                {
                    createdAt: "desc",
                },
            ],
        });

    return {
        data: tasks.map(serializeTask),
    };
}

export async function createTask(
    input: CreateTaskInput
) {
    if (!input.projectId) {
        throw AppError.badRequest(
            "Project is required"
        );
    }

    const title = input.title?.trim();

    if (!title) {
        throw AppError.badRequest(
            "Task title is required"
        );
    }

    validatePriority(input.priority);

    const project =
        await prisma.taskProject.findUnique({
            where: {
                id: input.projectId,
            },

            include: {
                members: true,
            },
        });

    if (!project) {
        throw AppError.notFound(
            "Project not found"
        );
    }

    const memberIds = project.members.map(
        (member) => member.employeeId
    );

    if (!memberIds.includes(input.assigneeId)) {
        throw AppError.badRequest(
            "Assignee must be a member of the project"
        );
    }

    const employee =
        await prisma.employee.findUnique({
            where: {
                id: input.assigneeId,
            },

            select: {
                id: true,
                status: true,
            },
        });

    if (!employee || employee.status !== "Active") {
        throw AppError.badRequest(
            "Assignee is invalid or inactive"
        );
    }

    if (input.milestoneId) {
        const milestone =
            await prisma.taskMilestone.findFirst({
                where: {
                    id: input.milestoneId,
                    projectId: input.projectId,
                },
            });

        if (!milestone) {
            throw AppError.badRequest(
                "Milestone does not belong to this project"
            );
        }
    }

    const blockerTaskIds = [
        ...new Set(
            input.blockerTaskIds ?? []
        ),
    ];

    if (blockerTaskIds.length > 0) {
        const blockers =
            await prisma.task.findMany({
                where: {
                    id: {
                        in: blockerTaskIds,
                    },
                },

                select: {
                    id: true,
                    projectId: true,
                },
            });

        if (
            blockers.length !==
            blockerTaskIds.length
        ) {
            throw AppError.badRequest(
                "One or more blocker tasks were not found"
            );
        }

        const hasSelfDependency =
            blockerTaskIds.includes(
                // temporary value; actual task doesn't exist yet
                ""
            );

        if (hasSelfDependency) {
            throw AppError.badRequest(
                "A task cannot block itself"
            );
        }
    }

    const dueDate = parseDate(
        input.dueDate,
        "Task due date"
    );

    const task =
        await prisma.$transaction(
            async (tx) => {
                const created =
                    await tx.task.create({
                        data: {
                            projectId:
                                input.projectId,

                            milestoneId:
                                input.milestoneId ??
                                null,

                            title,

                            assigneeId:
                                input.assigneeId,

                            status: "Todo",

                            priority:
                                input.priority ??
                                "Medium",

                            dueDate,

                            dependencies:
                                blockerTaskIds.length >
                                    0
                                    ? {
                                        create: blockerTaskIds.map(
                                            (
                                                blockerId
                                            ) => ({
                                                blockerId,
                                            })
                                        ),
                                    }
                                    : undefined,
                        },

                        include: TASK_INCLUDE,
                    });

                await tx.taskHistory.create({
                    data: {
                        taskId: created.id,
                        action: "CREATED",
                        detail: `Task created: ${created.title}`,
                    },
                });

                return created;
            }
        );

    return {
        data: serializeTask(task),
    };
}

/* =========================================================
   UPDATE TASK STATUS
   ========================================================= */

export async function updateTaskStatus(
    taskId: string,
    newStatus: string,
    options: UpdateTaskStatusOptions = {}
) {
    validateStatus(newStatus);

    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            include: {
                dependencies: {
                    include: {
                        blocker: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const openBlockers =
        task.dependencies
            .filter(
                (dependency) =>
                    dependency.blocker.status !==
                    "Done"
            )
            .map((dependency) => ({
                id: dependency.blocker.id,
                title: dependency.blocker.title,
                status: dependency.blocker.status,
            }));

    /*
     * Normal Done:
     * blockers must be completed.
     */
    if (
        newStatus === "Done" &&
        openBlockers.length > 0 &&
        !options.force
    ) {
        return {
            data: {
                error: "blocked",
                openBlockers,
            },
        };
    }

    /*
     * Force close:
     * reason is mandatory.
     */
    if (
        newStatus === "Done" &&
        openBlockers.length > 0 &&
        options.force
    ) {
        if (!options.reason?.trim()) {
            throw AppError.badRequest(
                "Force-close reason is required"
            );
        }
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const updatedTask =
                    await tx.task.update({
                        where: {
                            id: taskId,
                        },

                        data: {
                            status: newStatus,

                            forceClosed:
                                newStatus === "Done" &&
                                    Boolean(
                                        options.force &&
                                        openBlockers.length
                                    )
                                    ? true
                                    : undefined,

                            forceCloseReason:
                                newStatus === "Done" &&
                                    options.force &&
                                    openBlockers.length
                                    ? options.reason!.trim()
                                    : undefined,
                        },

                        include: TASK_INCLUDE,
                    });

                let detail =
                    `Status changed from ${task.status} to ${newStatus}`;

                if (
                    newStatus === "Done" &&
                    options.force &&
                    openBlockers.length
                ) {
                    detail =
                        `Task force-closed as Done. Reason: ${options.reason!.trim()}`;
                }

                await tx.taskHistory.create({
                    data: {
                        taskId,
                        action:
                            options.force &&
                                newStatus === "Done" &&
                                openBlockers.length
                                ? "FORCE_CLOSED"
                                : "STATUS_CHANGED",

                        detail,
                    },
                });

                return updatedTask;
            }
        );

    return {
        data: {
            task: serializeTask(updated),
        },
    };
}

/* =========================================================
   REASSIGN TASK
   ========================================================= */

export async function reassignTask(
    taskId: string,
    newAssigneeId: string
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            include: {
                project: {
                    include: {
                        members: true,
                    },
                },

                assignee: {
                    select: EMPLOYEE_SELECT,
                },
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const newAssignee =
        await prisma.employee.findUnique({
            where: {
                id: newAssigneeId,
            },

            select: EMPLOYEE_SELECT,
        });

    if (
        !newAssignee ||
        newAssignee.status !== "Active"
    ) {
        throw AppError.badRequest(
            "New assignee is invalid or inactive"
        );
    }

    const projectMember =
        task.project.members.some(
            (member) =>
                member.employeeId ===
                newAssigneeId
        );

    if (!projectMember) {
        throw AppError.badRequest(
            "New assignee must be a member of the project"
        );
    }

    const updated =
        await prisma.$transaction(
            async (tx) => {
                const result =
                    await tx.task.update({
                        where: {
                            id: taskId,
                        },

                        data: {
                            assigneeId:
                                newAssigneeId,
                        },

                        include: TASK_INCLUDE,
                    });

                await tx.taskHistory.create({
                    data: {
                        taskId,

                        action: "REASSIGNED",

                        detail: `Task reassigned from ${employeeName(
                            task.assignee
                        )} to ${employeeName(
                            newAssignee
                        )}`,
                    },
                });

                return result;
            }
        );

    return {
        data: serializeTask(updated),
    };
}

/* =========================================================
   ORPHANED TASKS
   ========================================================= */

export async function listOrphanedTasks() {
    const tasks =
        await prisma.task.findMany({
            where: {
                assignee: {
                    status: {
                        not: "Active",
                    },
                },
            },

            include: TASK_INCLUDE,

            orderBy: {
                dueDate: "asc",
            },
        });

    return {
        data: tasks.map(serializeTask),
    };
}

/* =========================================================
   TASK HISTORY
   ========================================================= */

export async function listTaskHistory(
    taskId: string
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            select: {
                id: true,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const history =
        await prisma.taskHistory.findMany({
            where: {
                taskId,
            },

            orderBy: {
                createdAt: "desc",
            },

            include: {
                actor: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

    return {
        data: history.map((item) => ({
            id: item.id,
            action: item.action,
            detail: item.detail,
            date: item.createdAt,
            actorName:
                item.actorName ??
                (item.actor
                    ? employeeName(item.actor)
                    : null),
        })),
    };
}

/* =========================================================
   TIME ENTRIES
   ========================================================= */

export async function listTimeEntries(
    taskId: string
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const entries =
        await prisma.taskTimeEntry.findMany({
            where: {
                taskId,
            },

            include: {
                employee: {
                    select: EMPLOYEE_SELECT,
                },
            },

            orderBy: {
                date: "desc",
            },
        });

    return {
        data: entries.map((entry) => ({
            id: entry.id,
            taskId: entry.taskId,
            employeeId:
                entry.employeeId,
            employeeName:
                employeeName(entry.employee),
            date: entry.date,
            hours: Number(entry.hours),
            note: entry.note,
        })),
    };
}

export async function createTimeEntry(
    taskId: string,
    input: TimeEntryInput
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const employee =
        await prisma.employee.findUnique({
            where: {
                id: input.employeeId,
            },

            select: EMPLOYEE_SELECT,
        });

    if (
        !employee ||
        employee.status !== "Active"
    ) {
        throw AppError.badRequest(
            "Employee is invalid or inactive"
        );
    }

    const hours = Number(input.hours);

    if (
        !Number.isFinite(hours) ||
        hours <= 0
    ) {
        throw AppError.badRequest(
            "Hours must be greater than 0"
        );
    }

    if (hours > 24) {
        throw AppError.badRequest(
            "Hours cannot exceed 24 per entry"
        );
    }

    const date = parseDate(
        input.date,
        "Time entry date"
    );

    const entry =
        await prisma.$transaction(
            async (tx) => {
                const created =
                    await tx.taskTimeEntry.create({
                        data: {
                            taskId,

                            employeeId:
                                input.employeeId,

                            date,

                            hours,

                            note:
                                input.note?.trim() ||
                                null,
                        },

                        include: {
                            employee: {
                                select:
                                    EMPLOYEE_SELECT,
                            },
                        },
                    });

                await tx.taskHistory.create({
                    data: {
                        taskId,

                        action: "TIME_LOGGED",

                        detail: `${hours}h logged by ${employeeName(
                            employee
                        )}`,
                    },
                });

                return created;
            }
        );

    return {
        data: {
            id: entry.id,
            taskId: entry.taskId,
            employeeId:
                entry.employeeId,
            employeeName:
                employeeName(entry.employee),
            date: entry.date,
            hours: Number(entry.hours),
            note: entry.note,
        },
    };
}

export async function getTaskTotalHours(
    taskId: string
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            select: {
                id: true,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    const result =
        await prisma.taskTimeEntry.aggregate({
            where: {
                taskId,
            },

            _sum: {
                hours: true,
            },
        });

    return {
        data: {
            taskId,
            totalHours: Number(
                result._sum.hours ?? 0
            ),
        },
    };
}

/* =========================================================
   TASK META
   ========================================================= */

export async function getTaskMeta(
    userId: string
) {
    const employees =
        await prisma.employee.findMany({
            where: {
                status: "Active",
            },

            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                status: true,
            },

            orderBy: {
                firstName: "asc",
            },
        });

    const currentEmployee =
        await prisma.employee.findUnique({
            where: {
                userId,
            },

            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                status: true,
            },
        });

    return {
        data: {
            statuses: [...TASK_STATUSES],

            priorities: [...TASK_PRIORITIES],
            statusMeta: {
                Todo: {
                    color: "#64748b",
                    bg: "#f1f5f9",
                },

                "In Progress": {
                    color: "#2563eb",
                    bg: "#eff6ff",
                },

                Review: {
                    color: "#d97706",
                    bg: "#fffbeb",
                },

                Done: {
                    color: "#16a34a",
                    bg: "#f0fdf4",
                },
            },

            priorityMeta: {
                Low: {
                    color: "#64748b",
                    bg: "#f1f5f9",
                },

                Medium: {
                    color: "#2563eb",
                    bg: "#eff6ff",
                },

                High: {
                    color: "#d97706",
                    bg: "#fffbeb",
                },

                Urgent: {
                    color: "#dc2626",
                    bg: "#fef2f2",
                },
            },

            employees: employees.map(
                (employee) => ({
                    id: employee.id,
                    employeeCode:
                        employee.employeeCode,
                    name: employeeName(employee),
                    isActive:
                        employee.status === "Active",
                })
            ),

            currentEmployee:
                currentEmployee
                    ? {
                        id:
                            currentEmployee.id,
                        employeeCode:
                            currentEmployee.employeeCode,
                        name: employeeName(
                            currentEmployee
                        ),
                        isActive:
                            currentEmployee.status ===
                            "Active",
                    }
                    : null,
        },
    };
}

/* =========================================================
   SERIALIZERS
   ========================================================= */

function serializeProject(
    project: any
) {
    return {
        id: project.id,

        name: project.name,

        members:
            project.members?.map(
                (member: any) =>
                    member.employeeId
            ) ?? [],

        memberDetails:
            project.members?.map(
                (member: any) => ({
                    id: member.employee.id,
                    employeeCode:
                        member.employee.employeeCode,
                    name: employeeName(
                        member.employee
                    ),
                })
            ) ?? [],

        milestones:
            project.milestones?.map(
                serializeMilestone
            ) ?? [],

        createdAt: project.createdAt,

        updatedAt: project.updatedAt,
    };
}

function serializeMilestone(
    milestone: any
) {
    return {
        id: milestone.id,
        projectId: milestone.projectId,
        title: milestone.title,
        dueDate: toDateString(
            milestone.dueDate
        ),
    };
}

function serializeTask(task: any) {
    const blockerIds =
        task.dependencies?.map(
            (dependency: any) =>
                dependency.blockerId
        ) ?? [];

    return {
        id: task.id,

        projectId: task.projectId,

        projectName:
            task.project?.name ?? null,

        milestoneId:
            task.milestoneId,

        milestone:
            task.milestone
                ? {
                    id:
                        task.milestone.id,
                    title:
                        task.milestone
                            .title,
                    dueDate:
                        toDateString(
                            task.milestone
                                .dueDate
                        ),
                }
                : null,

        title: task.title,

        assigneeId:
            task.assigneeId,

        assigneeName:
            task.assignee
                ? employeeName(
                    task.assignee
                )
                : null,

        status: task.status,

        priority: task.priority,

        dueDate: toDateString(
            task.dueDate
        ),

        blockedByTaskIds:
            blockerIds,

        blockers:
            task.dependencies?.map(
                (dependency: any) => ({
                    id:
                        dependency
                            .blocker.id,
                    title:
                        dependency
                            .blocker.title,
                    status:
                        dependency
                            .blocker.status,
                })
            ) ?? [],

        forceClosed:
            task.forceClosed,

        forceCloseReason:
            task.forceCloseReason,

        createdAt:
            task.createdAt,

        updatedAt:
            task.updatedAt,
    };
}

/* =========================================================
   VALIDATION / HELPERS
   ========================================================= */

function validateStatus(
    status: string
) {
    if (
        !TASK_STATUSES.includes(
            status as any
        )
    ) {
        throw AppError.badRequest(
            `Invalid task status. Allowed values: ${TASK_STATUSES.join(
                ", "
            )}`
        );
    }
}

function validatePriority(
    priority?: string
) {
    const value = priority ?? "Medium";

    if (
        !TASK_PRIORITIES.includes(
            value as any
        )
    ) {
        throw AppError.badRequest(
            `Invalid task priority. Allowed values: ${TASK_PRIORITIES.join(
                ", "
            )}`
        );
    }
}

function parseDate(
    value: string,
    fieldName: string
) {
    if (!value) {
        throw AppError.badRequest(
            `${fieldName} is required`
        );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw AppError.badRequest(
            `Invalid ${fieldName.toLowerCase()}`
        );
    }

    return date;
}

function toDateString(
    value: Date
) {
    return new Date(value)
        .toISOString()
        .slice(0, 10);
}

function employeeName(
    employee: {
        firstName: string;
        lastName?: string | null;
    }
) {
    return `${employee.firstName} ${employee.lastName ?? ""
        }`.trim();
}