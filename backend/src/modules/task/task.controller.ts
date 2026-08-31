import { Request, Response, NextFunction } from "express";
import * as taskService from "./task.service";
import { AppError } from "../../lib/errors";

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
            await taskService.listTasks();

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

export async function updateTaskStatus(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const taskId =
            String(req.params.id);

        const result =
            await taskService.updateTaskStatus(
                taskId,

                req.body.status,

                {
                    force:
                        req.body.force === true,

                    reason:
                        req.body.reason,
                }
            );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

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
                taskId
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
                taskId
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
                }
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
                taskId
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