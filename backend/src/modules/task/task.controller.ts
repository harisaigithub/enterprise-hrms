import { Request, Response, NextFunction } from "express";
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
            await taskService.listProjects();

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
                memberIds: req.body.memberIds,
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
    // Auth context (supporting both req.auth and req.user conventions)
    const user = (req as any).auth || (req as any).user;

    if (!user) {
      throw AppError.unauthorized("Unauthorized");
    }

    // 1. Fetch the existing task to verify existence and capture old values
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw AppError.notFound("Task not found");
    }

    // 2. Determine permissions
    const permissions: string[] = user.permissions || [];
    const hasGlobalWritePermission =
      permissions.includes("tasks:write") ||
      user.role === "ADMIN" ||
      user.role === "HR" ||
      user.role === "MANAGER";

    const employeeId = user.employeeId || user.id;

    const isAssignedEmployee = existingTask.assigneeId && existingTask.assigneeId === employeeId;
    if (!hasGlobalWritePermission && !isAssignedEmployee) {
      throw AppError.forbidden("Forbidden: You do not have permission to update this task");
    }

const { title, description, status, priority, dueDate, assigneeId, assignedTo } = req.body;
const targetAssigneeId = assigneeId || assignedTo;
    // 3. Restrict field updates if the user is only the assigned employee
    let updateData: any = {};
  if (hasGlobalWritePermission) {
    updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(targetAssigneeId !== undefined && { assigneeId: targetAssigneeId }),
    };
  } else if (isAssignedEmployee) {
    if (status === undefined) {
      throw AppError.forbidden("Forbidden: Assigned employees can only update task status");
    }
    updateData = { status };
  }

    // 4. Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // 5. Audit Log
    try {
      await (writeAuditLog as any)({
        action: "UPDATE",
        entityType: "Task",
        entityId: updatedTask.id,
        actorUserId: user.userId || user.id,
        oldValue: existingTask,
        newValue: updatedTask,
      });
    } catch (auditErr) {
      // Non-blocking audit error
      console.warn("[Audit] Failed to log task update:", auditErr);
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};
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
