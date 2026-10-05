import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import * as taskService from "./task.service";
/* =========================================================
   PROJECTS
   ========================================================= */

export async function getProjects(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result =
            await taskService.listProjects(req.auth);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function createProject(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result =
            await taskService.createProject({
                name: req.body.name,
                description: req.body.description,
                memberIds: req.body.memberIds,
                projectLeadId: req.body.projectLeadId,
                startDate: req.body.startDate,
                targetEndDate: req.body.targetEndDate,
                milestones: req.body.milestones,
            });

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   MILESTONES
   ========================================================= */

export async function createMilestone(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const projectId =
            String(req.params.projectId);

        const result =
            await taskService.createMilestone(
                projectId,
                {
                    title: req.body.title,
                    dueDate: req.body.dueDate,
                }
            );

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   TASKS
   ========================================================= */

export async function getTasks(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result =
            await taskService.listTasks(req.auth);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function createTask(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result =
            await taskService.createTask({
                projectId:
                    req.body.projectId,

                milestoneId:
                    req.body.milestoneId ??
                    null,

                title:
                    req.body.title,

                assigneeId:
                    req.body.assigneeId,

                priority:
                    req.body.priority ??
                    "Medium",

                dueDate:
                    req.body.dueDate,

                comments:
                    req.body.comments,

                subtasks:
                    req.body.subtasks,

                blockerTaskIds:
                    req.body.blockerTaskIds ??
                    [],
            });

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   TASK STATUS
   ========================================================= */

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
        const actor = req.auth;
        if (!actor) {
      throw AppError.unauthorized("Unauthorized");
    }

    const existingTask = await prisma.task.findUnique({
            where: { id: String(id) },
    });
    if (!existingTask) {
      throw AppError.notFound("Task not found");
    }

        if (actor.role === "EMPLOYEE" && (!actor.employeeId || existingTask.assigneeId !== actor.employeeId)) {
            throw AppError.forbidden("Employees can update only their assigned tasks");
        }

        if (actor.role === "EMPLOYEE") {
            throw AppError.forbidden("Employees can change task status only through the status endpoint");
        }

        const canWrite = actor.permissions.includes("tasks:write") ||
            ["ADMIN", "HR", "MANAGER"].includes(actor.role);
        if (!canWrite) {
      throw AppError.forbidden("Forbidden: You do not have permission to update this task");
    }

        const { blockerTaskIds } = req.body;
        if ("status" in req.body) {
            throw AppError.badRequest("Use the status endpoint to change task status");
        }
        if ("assigneeId" in req.body || "assignedTo" in req.body) {
            throw AppError.badRequest("Use the reassign endpoint to change the task assignee");
        }

        const updateInput = Object.fromEntries(
            ["title", "priority", "dueDate", "comments", "subtasks"]
                .filter((key) => key in req.body)
                .map((key) => [key, req.body[key]])
        );
        const hasBlockerUpdate = blockerTaskIds !== undefined;
        if (Object.keys(updateInput).length === 0 && !hasBlockerUpdate) {
            throw AppError.badRequest("No supported task fields were provided");
        }
        const updateData = Object.keys(updateInput).length > 0
            ? taskService.normalizeTaskUpdateInput(updateInput)
            : {};

        if (blockerTaskIds !== undefined) {
            await taskService.replaceTaskDependencies(String(id), blockerTaskIds, actor);
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.task.update({
                where: { id: String(id) },
                data: updateData,
            });
        }
        const updatedTask = await prisma.task.findUniqueOrThrow({
            where: { id: String(id) },
            include: taskService.TASK_INCLUDE,
        });

        await writeAuditLog({
            action: "UPDATE",
            entityType: "Task",
            entityId: updatedTask.id,
            actorUserId: actor.sub,
            oldValue: existingTask,
            newValue: updatedTask,
        });

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: taskService.serializeTask(updatedTask),
    });
  } catch (error) {
    next(error);
  }
};

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.auth) throw AppError.unauthorized("Unauthorized");
        const result = await taskService.updateTaskStatus(
            String(req.params.id),
            req.body.status,
            { force: req.body.force, reason: req.body.reason },
            req.auth
        );
        if (result.data.error === "blocked") {
            res.status(400).json(result.data);
            return;
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).auth || (req as any).user;

    if (!user) {
      throw AppError.unauthorized("Unauthorized");
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw AppError.notFound("Task not found");
    }

    await prisma.task.delete({
      where: { id },
    });

    try {
      await (writeAuditLog as any)({
        action: "DELETE",
        entityType: "Task",
        entityId: id,
        actorUserId: user.userId || user.id,
        oldValue: existingTask,
        newValue: null,
      });
    } catch (auditErr) {
      console.warn("[Audit] Failed to log task deletion:", auditErr);
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   REASSIGN
   ========================================================= */

export async function reassignTask(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const newAssigneeId =
            req.body.assigneeId;

        if (!newAssigneeId) {
            throw AppError.badRequest(
                "assigneeId is required"
            );
        }

        const result =
            await taskService.reassignTask(
                taskId,
                newAssigneeId
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   ORPHANED TASKS
   ========================================================= */

export async function getOrphanedTasks(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const result =
            await taskService.listOrphanedTasks();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   TASK HISTORY
   ========================================================= */

export async function getTaskHistory(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const result =
            await taskService.listTaskHistory(
                taskId,
                req.auth
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   TIME ENTRIES
   ========================================================= */

export async function getTimeEntries(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const result =
            await taskService.listTimeEntries(
                taskId,
                req.auth
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function createTimeEntry(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const result =
            await taskService.createTimeEntry(
                taskId,
                {
                    employeeId:
                        req.body.employeeId,

                    date:
                        req.body.date,

                    hours:
                        req.body.hours,

                    note:
                        req.body.note,
                },
                req.auth
            );

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function getTaskTotalHours(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const result =
            await taskService.getTaskTotalHours(
                taskId,
                req.auth
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

/* =========================================================
   TASK META
   ========================================================= */

export async function getTaskMeta(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.auth) {
            throw AppError.unauthorized();
        }

        const result =
            await taskService.getTaskMeta(
                req.auth.sub
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
