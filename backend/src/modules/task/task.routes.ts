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

const router = Router();

router.use(authenticate);

/* =========================================================
   TASK META
   ========================================================= */

router.get("/meta", getTaskMeta);

/* =========================================================
   PROJECTS
   ========================================================= */

router.get("/projects", getProjects);

router.post("/projects", createProject);

router.post(
    "/projects/:projectId/milestones",
    createMilestone
);

/* =========================================================
   ORPHANED TASKS
   ========================================================= */

router.get(
    "/orphaned",
    getOrphanedTasks
);

/* =========================================================
   TASKS
   ========================================================= */

router.get("/", getTasks);

router.post("/", createTask);

router.patch(
    "/:id/status",
    updateTaskStatus
);

router.patch(
    "/:id/reassign",
    reassignTask
);

/* =========================================================
   TASK HISTORY
   ========================================================= */

router.get(
    "/:id/history",
    getTaskHistory
);

/* =========================================================
   TIME ENTRIES
   ========================================================= */

router.get(
    "/:id/time-entries",
    getTimeEntries
);

router.post(
    "/:id/time-entries",
    createTimeEntry
);

router.get(
    "/:id/total-hours",
    getTaskTotalHours
);

export default router;