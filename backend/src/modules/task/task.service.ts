import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import type { AccessTokenPayload } from "../../lib/jwt";
import { writeAuditLog } from "../../services/audit.service";

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
    description?: string | null;
    memberIds?: string[];
    projectLeadId?: string | null;
    startDate?: string | null;
    targetEndDate?: string | null;
    milestones?: Array<{ title: string; dueDate: string }>;
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
    comments?: string | null;
    subtasks?: string[] | string | null;
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
    projectLead: {
        select: EMPLOYEE_SELECT,
    },
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

export const TASK_INCLUDE = {
    project: {
        select: {
            id: true,
            name: true,
            projectLeadId: true,
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

export async function listProjects(actor?: AccessTokenPayload) {
    const role = actor?.role?.toUpperCase();
    if (!actor) throw AppError.unauthorized("Authentication required");
    if (role === "EMPLOYEE" && !actor.employeeId) {
        throw AppError.forbidden("Account is not linked to an employee record");
    }
    const projects = await prisma.taskProject.findMany({
        where: role === "EMPLOYEE"
            ? { members: { some: { employeeId: actor.employeeId! } } }
            : undefined,
        include: PROJECT_INCLUDE,
        orderBy: {
            createdAt: "desc",
        },
    });
    const projectIds = projects.map((project) => project.id);
    const taskGroups = projectIds.length
        ? await prisma.task.groupBy({
            by: ["projectId", "status"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
        })
        : [];
    const stats = new Map<string, { taskCount: number; doneTaskCount: number }>();
    for (const group of taskGroups) {
        const projectStats = stats.get(group.projectId) ?? { taskCount: 0, doneTaskCount: 0 };
        projectStats.taskCount += group._count._all;
        if (group.status === "Done") projectStats.doneTaskCount += group._count._all;
        stats.set(group.projectId, projectStats);
    }

    return {
        data: projects.map((project) => serializeProject(project, stats.get(project.id))),
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

    const description = input.description?.trim() || null;
    const memberIds = [
        ...new Set(input.memberIds ?? []),
    ];

    if (memberIds.length === 0) {
        throw AppError.badRequest(
            "A project must include at least one team member"
        );
    }

    if (input.projectLeadId && !memberIds.includes(input.projectLeadId)) {
        throw AppError.badRequest(
            "Project lead must be part of the selected team"
        );
    }

    const projectLeadId = input.projectLeadId || memberIds[0];

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

    const startDate = input.startDate ? parseDate(input.startDate, "Project start date") : null;
    const targetEndDate = input.targetEndDate ? parseDate(input.targetEndDate, "Project target end date") : null;

    if (startDate && targetEndDate && targetEndDate < startDate) {
        throw AppError.badRequest(
            "Project target end date cannot be before the start date"
        );
    }

    const project = await prisma.taskProject.create({
        data: {
            name,
            description,
            projectLeadId,
            startDate: startDate ?? undefined,
            targetEndDate: targetEndDate ?? undefined,
            members: {
                create: memberIds.map(
                    (employeeId) => ({
                        employeeId,
                    })
                ),
            },
            milestones: {
                create: (input.milestones ?? []).map((milestone) => ({
                    title: milestone.title?.trim(),
                    dueDate: parseDate(milestone.dueDate, "Milestone due date"),
                })).filter((milestone) => Boolean(milestone.title)),
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

export async function listTasks(actor?: AccessTokenPayload) {
    if (!actor) throw AppError.unauthorized("Authentication required");
    const role = actor.role?.toUpperCase();
    if ((role === "EMPLOYEE" || role === "MANAGER") && !actor.employeeId) {
        throw AppError.forbidden("Account is not linked to an employee record");
    }
    const where: Prisma.TaskWhereInput = role === "EMPLOYEE"
        ? { assigneeId: actor.employeeId, project: { members: { some: { employeeId: actor.employeeId! } } } }
        : role === "MANAGER"
            ? { OR: [{ assigneeId: actor.employeeId }, { assignee: { reportingManagerId: actor.employeeId } }] }
            : {};
    const tasks =
        await prisma.task.findMany({
            where,
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

    const comments = input.comments?.trim() || null;

    const subtasks = normalizeSubtasksInput(input.subtasks);

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

        if (blockers.some((blocker) => blocker.projectId !== input.projectId)) {
            throw AppError.badRequest("Blocker tasks must belong to the same project");
        }
    }

    const dueDate = parseDate(
        input.dueDate,
        "Task due date"
    );

    const task =
        await prisma.$transaction(
            async (tx: any) => {
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
                            comments,
                            subtasks: JSON.stringify(subtasks),

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

export function getTaskDoneBlockers(task: any) {
    const openBlockers = (task.dependencies ?? [])
        .filter((dependency: any) => dependency?.blocker && dependency.blocker.status !== "Done")
        .map((dependency: any) => ({
            id: dependency.blocker.id,
            title: dependency.blocker.title,
            status: dependency.blocker.status,
        }));

    const openSubtasks = parseStoredSubtasks(task.subtasks)
        .filter((subtask) => !subtask.done)
        .map((subtask) => subtask.title);

    return {
        openBlockers,
        openSubtasks,
    };
}

export function assertActiveTaskAssignee(status: string | null | undefined) {
    if (status !== "Active") {
        throw AppError.conflict("Reassign this task to an active employee before changing its status.");
    }
}

export function assertTaskReopenAllowed(
    task: { project?: { projectLeadId?: string | null } },
    actor: AccessTokenPayload | undefined
) {
    if (
        actor?.role?.toUpperCase() !== "ADMIN" &&
        (!actor?.employeeId || task.project?.projectLeadId !== actor.employeeId)
    ) {
        throw AppError.forbidden("Only the Project Lead or an Admin can reopen a completed task.");
    }
}

export function assertNoTaskDependencyCycle(
    taskId: string,
    blockerIds: string[],
    dependencies: Array<{ taskId: string; blockerId: string }>
) {
    const graph = new Map<string, string[]>();
    for (const dependency of dependencies) {
        const blockers = graph.get(dependency.taskId) ?? [];
        blockers.push(dependency.blockerId);
        graph.set(dependency.taskId, blockers);
    }
    graph.set(taskId, blockerIds);

    const reachesTask = (currentId: string, visited: Set<string>): boolean => {
        if (currentId === taskId) return true;
        if (visited.has(currentId)) return false;
        visited.add(currentId);
        return (graph.get(currentId) ?? []).some((blockerId) => reachesTask(blockerId, visited));
    };

    if (blockerIds.some((blockerId) => reachesTask(blockerId, new Set()))) {
        throw AppError.badRequest("Task dependencies cannot contain a cycle.");
    }
}

export async function replaceTaskDependencies(
    taskId: string,
    rawBlockerIds: unknown,
    actor: AccessTokenPayload
) {
    if (!Array.isArray(rawBlockerIds) || rawBlockerIds.some((id) => typeof id !== "string")) {
        throw AppError.badRequest("Blocker task IDs must be an array of task IDs.");
    }
    const blockerIds = [...new Set(rawBlockerIds as string[])];
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, projectId: true },
    });
    if (!task) throw AppError.notFound("Task not found");

    const blockers = blockerIds.length
        ? await prisma.task.findMany({
            where: { id: { in: blockerIds } },
            select: { id: true, projectId: true },
        })
        : [];
    if (blockers.length !== blockerIds.length || blockers.some((blocker) => blocker.projectId !== task.projectId)) {
        throw AppError.badRequest("Blocker tasks must exist in the same project.");
    }

    const dependencies = await prisma.taskDependency.findMany({
        where: { task: { projectId: task.projectId } },
        select: { taskId: true, blockerId: true },
    });
    assertNoTaskDependencyCycle(taskId, blockerIds, dependencies);

    await prisma.$transaction(async (tx) => {
        await tx.taskDependency.deleteMany({ where: { taskId } });
        if (blockerIds.length) {
            await tx.taskDependency.createMany({
                data: blockerIds.map((blockerId) => ({ taskId, blockerId })),
            });
        }
        await tx.taskHistory.create({
            data: {
                taskId,
                action: "DEPENDENCIES_CHANGED",
                detail: blockerIds.length
                    ? `Blockers updated: ${blockerIds.join(", ")}`
                    : "Blockers cleared",
                actorId: actor.employeeId ?? null,
                actorName: actor.name ?? ([actor.firstName, actor.lastName].filter(Boolean).join(" ") || null),
            },
        });
    });
}

export function assertForceCloseAllowed(
    task: { project?: { projectLeadId?: string | null } },
    actor: AccessTokenPayload | undefined,
    openBlockers: unknown[],
    openSubtasks: unknown[],
    reason?: string
) {
    if (openSubtasks.length > 0) {
        throw AppError.badRequest("Open checklist items must be completed before closing a task.");
    }
    if (openBlockers.length === 0) return;
    if (!actor?.employeeId || task.project?.projectLeadId !== actor.employeeId) {
        throw AppError.forbidden("Only the Project Lead can force-close a task with open blockers.");
    }
    if (!reason?.trim()) {
        throw AppError.badRequest("Force-close reason is required");
    }
}

export async function updateTaskStatus(
    taskId: string,
    newStatus: string,
    options: UpdateTaskStatusOptions = {},
    actor?: AccessTokenPayload
) {
    validateStatus(newStatus);

    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            include: {
                assignee: {
                    select: {
                        status: true,
                    },
                },
                project: {
                    select: {
                        projectLeadId: true,
                    },
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
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    assertActiveTaskAssignee(task.assignee?.status);

    const actorRole = actor?.role?.toUpperCase();
    if (actorRole === "EMPLOYEE" && task.assigneeId !== actor?.employeeId) {
        throw AppError.forbidden("Employees can update only their assigned tasks");
    }
    if (task.status === "Done" && newStatus !== "Done") {
        assertTaskReopenAllowed(task, actor);
    }

    const { openBlockers, openSubtasks } = getTaskDoneBlockers(task);

    if (
        openBlockers.length > 0 &&
        newStatus !== "Todo" &&
        !(newStatus === "Done" && options.force)
    ) {
        return {
            data: {
                error: "blocked",
                openBlockers,
                openSubtasks,
            },
        };
    }

    /*
     * Normal Done:
     * blockers and open subtasks must be completed.
     */
    if (
        newStatus === "Done" &&
        (openBlockers.length > 0 || openSubtasks.length > 0) &&
        !options.force
    ) {
        return {
            data: {
                error: "blocked",
                openBlockers,
                openSubtasks,
            },
        };
    }

    if (newStatus === "Done" && options.force) {
        assertForceCloseAllowed(task, actor, openBlockers, openSubtasks, options.reason);
    }

    const updated =
        await prisma.$transaction(
            async (tx: any) => {
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
                        actorId: actor?.employeeId ?? null,
                        actorName: actor?.name ?? ([actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || null),
                    },
                });

                return updatedTask;
            }
        );

    await writeAuditLog({
        actorUserId: actor?.sub,
        action: "UPDATE",
        entityType: "Task",
        entityId: updated.id,
        oldValue: {
            status: task.status,
            forceClosed: task.forceClosed,
            forceCloseReason: task.forceCloseReason,
        },
        newValue: {
            status: updated.status,
            forceClosed: updated.forceClosed,
            forceCloseReason: updated.forceCloseReason,
        },
    });

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
            async (tx: any) => {
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
    taskId: string,
    actor?: AccessTokenPayload
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            select: {
                id: true,
                assigneeId: true,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    if (actor?.role === "EMPLOYEE" && task.assigneeId !== actor.employeeId) {
        throw AppError.forbidden("Employees can view history only for their assigned tasks");
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
    taskId: string,
    actor?: AccessTokenPayload
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

    if (actor?.role === "EMPLOYEE" && task.assigneeId !== actor.employeeId) {
        throw AppError.forbidden("Employees can view time only for their assigned tasks");
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
    input: TimeEntryInput,
    actor?: AccessTokenPayload
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

    if (actor?.role === "EMPLOYEE") {
        if (!actor.employeeId || task.assigneeId !== actor.employeeId) {
            throw AppError.forbidden("Employees can log time only for their assigned tasks");
        }
        input = { ...input, employeeId: actor.employeeId };
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
            async (tx: any) => {
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
    taskId: string,
    actor?: AccessTokenPayload
) {
    const task =
        await prisma.task.findUnique({
            where: {
                id: taskId,
            },

            select: {
                id: true,
                assigneeId: true,
            },
        });

    if (!task) {
        throw AppError.notFound(
            "Task not found"
        );
    }

    if (actor?.role === "EMPLOYEE" && task.assigneeId !== actor.employeeId) {
        throw AppError.forbidden("Employees can view totals only for their assigned tasks");
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

export function normalizeTaskUpdateInput(input: Record<string, any>) {
    const update: Record<string, unknown> = {};

    if ("title" in input) {
        const title = String(input.title ?? "").trim();
        if (!title) {
            throw AppError.badRequest("Task title is required");
        }
        update.title = title;
    }

    if ("priority" in input) {
        validatePriority(String(input.priority ?? "Medium"));
        update.priority = String(input.priority);
    }

    if ("dueDate" in input && input.dueDate !== undefined && input.dueDate !== null && input.dueDate !== "") {
        update.dueDate = parseDate(String(input.dueDate), "Task due date");
    }

    if ("comments" in input) {
        const comments = String(input.comments ?? "").trim();
        if (
            comments.length > 1500
        ) {
            throw AppError.badRequest("Task comments cannot exceed 1500 characters");
        }
        update.comments = comments || null;
    }

    if ("subtasks" in input) {
        const subtasks = normalizeSubtasksInput(input.subtasks);
        update.subtasks = JSON.stringify(subtasks);
    }

    if (Object.keys(update).length === 0) {
        throw AppError.badRequest("No supported task fields were provided");
    }

    return update;
}

function serializeProject(
    project: any,
    stats: { taskCount: number; doneTaskCount: number } = { taskCount: 0, doneTaskCount: 0 }
) {
    return {
        id: project.id,

        name: project.name,
        description: project.description ?? null,
        projectLeadId: project.projectLeadId ?? project.projectLead?.id ?? null,
        leadName: project.projectLead ? employeeName(project.projectLead) : null,
        taskCount: stats.taskCount,
        doneTaskCount: stats.doneTaskCount,
        progress: stats.taskCount ? Math.round((stats.doneTaskCount / stats.taskCount) * 100) : 0,
        startDate: project.startDate ? toDateString(project.startDate) : null,
        targetEndDate: project.targetEndDate ? toDateString(project.targetEndDate) : null,

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

export function serializeTask(task: any) {
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

        projectLeadId:
            task.project?.projectLeadId ?? null,

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

        assigneeStatus:
            task.assignee?.status ?? null,

        status: task.status,

        priority: task.priority,

        dueDate: toDateString(
            task.dueDate
        ),

        comments: task.comments ?? null,
        subtasks: parseStoredSubtasks(task.subtasks),

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

export function validateStatus(
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

export function validatePriority(
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

function normalizeSubtasksInput(raw: unknown): Array<{ id: string; title: string; done: boolean }> {
    if (!raw) return [];

    const items = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/);
    const normalized = items
        .map((entry) => {
            if (typeof entry === "string") {
                const title = entry.trim();
                return title ? { id: crypto.randomUUID(), title, done: false } : null;
            }
            if (entry && typeof entry === "object") {
                const title = String((entry as any).title ?? "").trim();
                const done = Boolean((entry as any).done);
                if (!title) return null;
                return {
                    id: String((entry as any).id ?? crypto.randomUUID()),
                    title,
                    done,
                };
            }
            return null;
        })
        .filter(Boolean) as Array<{ id: string; title: string; done: boolean }>;

    return normalized.filter((item, index, arr) => arr.findIndex((candidate) => candidate.title.toLowerCase() === item.title.toLowerCase()) === index);
}

function parseStoredSubtasks(raw: string | null | undefined): Array<{ id: string; title: string; done: boolean }> {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
                id: String(item.id ?? crypto.randomUUID()),
                title: String(item.title ?? "").trim(),
                done: Boolean(item.done),
            })).filter((item) => item.title);
        }
    } catch {
        // noop
    }
    return [];
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
