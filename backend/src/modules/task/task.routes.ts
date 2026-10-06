import { Router } from "express";

import {
    getProjects,
    createProject,
    createMilestone,
    getTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,       // Added deleteTask
    reassignTask,
    getOrphanedTasks,
    getTaskHistory,
    getTimeEntries,
    createTimeEntry,
    getTaskTotalHours,
    getTaskMeta,
} from "./task.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission, requireRole } from "../../middlewares/rbac";
import { AppError } from "../../lib/errors";

const router = Router();

// Apply authentication middleware globally to all sub-routes
router.use(authenticate);

function requireTaskPermission(permission: string) {
    return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
        if (req.auth?.role?.toUpperCase() === "ADMIN") {
            next();
            return;
        }
        return requirePermission(permission)(req, res, next);
    };
}

/* =========================================================
   TASK META
   ADMIN / HR / MANAGER / EMPLOYEE → READ
========================================================= */
router.get(
    "/meta",
    requireTaskPermission("tasks:read"),
    getTaskMeta
);

/* =========================================================
   PROJECTS
========================================================= */
router.get(
    "/projects",
    requireTaskPermission("tasks:read"),
    getProjects
);

router.post(
    "/projects",
    requireTaskPermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createProject
);

router.post(
    "/projects/:projectId/milestones",
    requireTaskPermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createMilestone
);

/* =========================================================
   ORPHANED TASKS
========================================================= */
router.get(
    "/orphaned",
    requireTaskPermission("tasks:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getOrphanedTasks
);

/* =========================================================
   TASKS (CRUD & General)
========================================================= */
router.get(
    "/",
    requireTaskPermission("tasks:read"),
    getTasks
);

router.post(
    "/",
    requireTaskPermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createTask
);

// 🔹 FULL TASK UPDATE (PUT /api/tasks/:id)
// RBAC: Handled inside controller (Global write or Assigned Employee check)
router.put("/:id", updateTask);

// 🔹 TASK DELETE (DELETE /api/tasks/:id)
// RBAC: Restricted strictly to ADMIN, HR, MANAGER with tasks:write/delete permission
router.delete(
    "/:id",
    requireTaskPermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    deleteTask
);

/* =========================================================
   TASK SUB-RESOURCES & ACTIONS
   (Keep these below /:id to prevent route shadowing issues)
========================================================= */

router.patch(
    "/:id/status",
    requireTaskPermission("tasks:write"),
    (req, _res, next) => {
        const role = req.auth?.role?.toUpperCase();
        if (role === "EMPLOYEE" && req.body?.force === true) {
            return next(
                AppError.forbidden("Employees cannot force-close tasks")
            );
        }
        next();
    },
    updateTaskStatus
);

router.patch(
    "/:id/reassign",
    requireTaskPermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    reassignTask
);

router.get(
    "/:id/history",
    requireTaskPermission("tasks:read"),
    getTaskHistory
);

router.get(
    "/:id/time-entries",
    requireTaskPermission("tasks:read"),
    getTimeEntries
);

router.post(
    "/:id/time-entries",
    requireTaskPermission("tasks:write"),
    createTimeEntry
);

router.get(
    "/:id/total-hours",
    requireTaskPermission("tasks:read"),
    getTaskTotalHours
);

export default router;