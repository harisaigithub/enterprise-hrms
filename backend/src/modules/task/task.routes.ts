import { Router } from "express";

import {
    getProjects,
    createProject,
    createMilestone,

    getTasks,
    createTask,
    updateTaskStatus,
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

// Everyone with task read permission can view projects
router.get(
    "/projects",
    requirePermission("tasks:read"),
    getProjects
);

// Only ADMIN / HR / MANAGER can create projects
router.post(
    "/projects",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createProject
);

// Only ADMIN / HR / MANAGER can add milestones
router.post(
    "/projects/:projectId/milestones",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createMilestone
);

/* =========================================================
   ORPHANED TASKS
========================================================= */

// Employee should not manage/view orphaned tasks
router.get(
    "/orphaned",
    requirePermission("tasks:read"),
    requireRole("ADMIN", "HR", "MANAGER"),
    getOrphanedTasks
);

/* =========================================================
   TASKS
========================================================= */

// Everyone can view tasks
router.get(
    "/",
    requirePermission("tasks:read"),
    getTasks
);

// Only ADMIN / HR / MANAGER can create tasks
router.post(
    "/",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    createTask
);

/* =========================================================
   TASK STATUS
========================================================= */

// Employee CAN change status,
// but backend service must verify that it is his assigned task.
//
// ADMIN / HR / MANAGER → status change allowed
// EMPLOYEE             → own assigned task only
//
// Force-close is additionally blocked for EMPLOYEE.
router.patch(
    "/:id/status",
    requirePermission("tasks:write"),
    (req, _res, next) => {
        const role = req.auth?.role?.toUpperCase();

        if (role === "EMPLOYEE" && req.body?.force === true) {
            return next(
                AppError.forbidden(
                    "Employees cannot force-close tasks"
                )
            );
        }

        next();
    },
    updateTaskStatus
);

/* =========================================================
   REASSIGN TASK
========================================================= */

// Only ADMIN / HR / MANAGER can reassign
router.patch(
    "/:id/reassign",
    requirePermission("tasks:write"),
    requireRole("ADMIN", "HR", "MANAGER"),
    reassignTask
);

/* =========================================================
   TASK HISTORY
========================================================= */

// Everyone with read permission can view history
router.get(
    "/:id/history",
    requirePermission("tasks:read"),
    getTaskHistory
);

/* =========================================================
   TIME ENTRIES
========================================================= */

// Everyone with read permission can view time entries
router.get(
    "/:id/time-entries",
    requirePermission("tasks:read"),
    getTimeEntries
);

// Employee can log time,
// BUT service must verify that employeeId belongs to logged-in employee.
//
// ADMIN / HR / MANAGER → allowed according to service rules
// EMPLOYEE             → own task/time only
router.post(
    "/:id/time-entries",
    requirePermission("tasks:write"),
    createTimeEntry
);

/* =========================================================
   TOTAL HOURS
========================================================= */

router.get(
    "/:id/total-hours",
    requirePermission("tasks:read"),
    getTaskTotalHours
);

export default router;