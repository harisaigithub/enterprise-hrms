import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as performanceController from "./performance.controller";

const router = Router();

const createGoalSchema = z.object({
  employeeId: z.string().optional(),
  title: z.string().min(1, "Goal title is required"),
  category: z.string().min(1, "Category is required"),
  cycleCode: z.string().optional(),
  keyResults: z
    .array(
      z.object({
        text: z.string().min(1, "Key result text is required"),
        progress: z.number().int().min(0).max(100).optional(),
      })
    )
    .min(1, "At least one key result is required"),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  status: z.enum(["Draft", "Pending Approval", "Locked", "Revision Requested"]).optional(),
  keyResults: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().min(1),
        progress: z.number().int().min(0).max(100),
      })
    )
    .optional(),
});

const selfAssessmentSchema = z.object({
  employeeId: z.string().optional(),
  responses: z.array(
    z.object({
      goalId: z.string().min(1, "goalId is required"),
      rating: z.number().int().min(1).max(5),
      comments: z.string().optional(),
    })
  ),
});

const managerReviewSchema = z.object({
  employeeId: z.string().min(1, "employeeId is required"),
  responses: z.array(
    z.object({
      goalId: z.string().min(1, "goalId is required"),
      rating: z.number().int().min(1).max(5),
      comments: z.string().optional(),
    })
  ),
});

const createFeedbackSchema = z.object({
  toEmployeeCode: z.string().min(1, "Recipient is required"),
  type: z.enum(["Praise", "Constructive", "General"]),
  goalTag: z.string().nullable().optional(),
  message: z.string().min(1, "Message is required"),
  private: z.boolean().optional(),
});

const createOneOnOneSchema = z.object({
  withEmployeeCode: z.string().min(1, "Colleague is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  agenda: z.array(z.string()).min(1, "At least one agenda item is required"),
  actionItems: z
    .array(
      z.object({
        text: z.string().min(1),
        done: z.boolean().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

const readAccess = requirePermission("performance:read");
const writeAccess = requirePermission("performance:write");

// Review Cycle
router.get("/cycle", authenticate, readAccess, performanceController.getActiveCycle);

// Goals
router.get("/goals", authenticate, readAccess, performanceController.getGoals);
router.post("/goals", authenticate, writeAccess, validate({ body: createGoalSchema }), performanceController.createGoal);
router.put("/goals/:id", authenticate, writeAccess, validate({ body: updateGoalSchema }), performanceController.updateGoal);

// Manager Goal Approval
router.get(
  "/manager/goals",
  authenticate,
  readAccess,
  performanceController.getManagerGoals
);

router.patch(
  "/manager/goals/:id/approve",
  authenticate,
  writeAccess,
  performanceController.approveGoal
);

router.patch(
  "/manager/goals/:id/reject",
  authenticate,
  writeAccess,
  performanceController.rejectGoal
);


// Self-assessment & Manager Review
router.get("/reviews/self", authenticate, readAccess, performanceController.getSelfAssessment);
router.post("/reviews/self", authenticate, writeAccess, validate({ body: selfAssessmentSchema }), performanceController.submitSelfAssessment);
router.get("/reviews/manager", authenticate, readAccess, performanceController.getManagerReview);
router.post("/reviews/manager", authenticate, writeAccess, validate({ body: managerReviewSchema }), performanceController.submitManagerReview);

// Continuous Feedback
router.get("/feedback", authenticate, readAccess, performanceController.getFeedback);
router.post("/feedback", authenticate, writeAccess, validate({ body: createFeedbackSchema }), performanceController.createFeedback);

// 1-on-1s
router.get("/one-on-ones", authenticate, readAccess, performanceController.getOneOnOnes);
router.post("/one-on-ones", authenticate, writeAccess, validate({ body: createOneOnOneSchema }), performanceController.createOneOnOne);
router.patch("/one-on-ones/:id/actions/:actionId", authenticate, writeAccess, performanceController.toggleOneOnOneAction);

// Ratings History
router.get("/ratings-history", authenticate, readAccess, performanceController.getRatingsHistory);

export default router;
