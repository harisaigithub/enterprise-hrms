import { Router } from "express";

import {
    getProjects,
    createProject,
    createMilestone,
    getTasks,
    createTask,
    updateTask,       // Replaced updateTaskStatus with full updateTask
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

/* =========================================================
   TASK META
   ADMIN / HR / MANAGER / EMPLOYEE → READ
========================================================= */
router.get(
    "/meta",
    requirePermission("tasks:read"),
    getTaskMeta
);

/* =========================================================
   PROJECTS
========================================================= */
router.get(
    "/projects",
    requirePermission("tasks:read"),
    getProjects
);

router.post(
    "/projects",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createProject
);

router.post(
    "/projects/:projectId/milestones",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createMilestone
);

/* =========================================================
   ORPHANED TASKS
========================================================= */
router.get(
    "/orphaned",
    requirePermission("tasks:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getOrphanedTasks
);

/* =========================================================
   TASKS (CRUD & General)
========================================================= */
router.get(
    "/",
    requirePermission("tasks:read"),
    getTasks
);

router.post(
    "/",
    requirePermission("tasks:write"),
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
    requirePermission("tasks:write"), // or tasks:delete if you use a separate permission string
    requireRole("ADMIN", "HR", "MANAGER"),
    deleteTask
);

/* =========================================================
   TASK SUB-RESOURCES & ACTIONS
   (Keep these below /:id to prevent route shadowing issues)
========================================================= */

router.patch(
    "/:id/status",
    requirePermission("tasks:write"),
    (req, _res, next) => {
        const role = req.auth?.role?.toUpperCase();
        if (role === "EMPLOYEE" && req.body?.force === true) {
            return next(
                AppError.forbidden("Employees cannot force-close tasks")
            );
        }
        next();
    },
    updateTask // Points to updated full/partial controller function if needed, or keep your status flow
);

router.patch(
    "/:id/reassign",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    reassignTask
);

router.get(
    "/:id/history",
    requirePermission("tasks:read"),
    getTaskHistory
);

router.get(
    "/:id/time-entries",
    requirePermission("tasks:read"),
    getTimeEntries
);

router.post(
    "/:id/time-entries",
    requirePermission("tasks:write"),
    createTimeEntry
);

router.get(
    "/:id/total-hours",
    requirePermission("tasks:read"),
    getTaskTotalHours
);

export default router;