import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as recruitmentController from "./recruitment.controller";

const router = Router();

router.use(authenticate);

/* -------------------------------------------------------------------------- */
/* Common validation                                                         */
/* -------------------------------------------------------------------------- */

const uuid = z.string().uuid();

/* -------------------------------------------------------------------------- */
/* Requisition schemas                                                       */
/* -------------------------------------------------------------------------- */

const listRequisitionQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: uuid.optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createRequisitionSchema = z.object({
  title: z.string().min(1, "Job title is required"),

  departmentId: uuid.optional(),
  designationId: uuid.optional(),
  locationId: uuid.optional(),

  grade: z.string().optional(),

  openings: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  salaryMin: z.coerce
    .number()
    .nonnegative(),

  salaryMax: z.coerce
    .number()
    .nonnegative(),

  justification: z.string().optional()
});

const updateRequisitionSchema =
  createRequisitionSchema.partial();

/* -------------------------------------------------------------------------- */
/* Candidate schemas                                                         */
/* -------------------------------------------------------------------------- */

const listCandidateQuerySchema = z.object({
  search: z.string().optional(),
  stage: z.string().optional(),
  requisitionId: uuid.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createCandidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),

  lastName: z.string().optional(),

  email: z.string().email("A valid email is required"),

  phone: z.string().optional(),

  resumeSummary: z.string().optional(),

  requisitionId: uuid,

  stage: z
    .enum([
      "Applied",
      "Screening",
      "Interview",
      "Offer",
      "Hired",
      "Rejected",
    ])
    .optional(),

  rating: z.coerce
    .number()
    .int()
    .min(0)
    .max(5)
    .optional(),

  notes: z.string().optional(),
});

const moveStageSchema = z.object({
  stage: z.enum([
    "Applied",
    "Screening",
    "Interview",
    "Offer",
    "Hired",
    "Rejected",
  ]),
});

const rateCandidateSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(0)
    .max(5),

  notes: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/* Interview schemas                                                         */
/* -------------------------------------------------------------------------- */

const listInterviewQuerySchema = z.object({
  status: z.string().optional(),

  page: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

const scheduleInterviewSchema = z.object({
  applicationId: uuid,

  round: z
    .string()
    .min(1, "Interview round is required"),

  scheduledAt: z.coerce.date(),

  interviewers: z
    .array(z.string().min(1))
    .min(1, "At least one interviewer is required"),
});

const submitScorecardSchema = z.object({
  interviewerId: uuid,

  rating: z.coerce
    .number()
    .int()
    .min(1)
    .max(5),

  notes: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/* Offer schemas                                                             */
/* -------------------------------------------------------------------------- */

const createOfferSchema = z.object({
  applicationId: uuid,

  proposedSalary: z.coerce
    .number()
    .positive("Proposed salary must be greater than zero"),
});

const updateOfferStatusSchema = z.object({
  status: z.enum([
    "Draft",
    "Salary Approval Pending",
    "Approved",
    "Background Verification",
    "Sent — Awaiting Signature",
    "Accepted",
    "Declined",
    "Expired",
  ]),

  consentOnFile: z.boolean().optional(),

  financeOverride: z.boolean().optional(),

  overrideReason: z.string().optional(),

  sentAt: z.coerce.date().optional(),
});

/* ========================================================================= */
/* REQUISITIONS                                                              */
/* ========================================================================= */

// GET /api/recruitment/requisitions
router.get(
  "/requisitions",
  authenticate,
  requirePermission("recruitment:read"),
  validate({
    query: listRequisitionQuerySchema,
  }),
  recruitmentController.listRequisitions
);

// GET /api/recruitment/requisitions/:id
router.get(
  "/requisitions/:id",
  authenticate,
  requirePermission("recruitment:read"),
  recruitmentController.getRequisition
);

// POST /api/recruitment/requisitions
router.post(
  "/requisitions",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: createRequisitionSchema,
  }),
  recruitmentController.createRequisition
);

// PUT /api/recruitment/requisitions/:id
router.put(
  "/requisitions/:id",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: updateRequisitionSchema,
  }),
  recruitmentController.updateRequisition
);

/* ========================================================================= */
/* CANDIDATES                                                                */
/* ========================================================================= */

// GET /api/recruitment/candidates
router.get(
  "/candidates",
  authenticate,
  requirePermission("recruitment:read"),
  validate({
    query: listCandidateQuerySchema,
  }),
  recruitmentController.listCandidates
);

// POST /api/recruitment/candidates
router.post(
  "/candidates",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: createCandidateSchema,
  }),
  recruitmentController.createCandidate
);

// PATCH /api/recruitment/candidates/:id/stage
router.patch(
  "/candidates/:id/stage",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: moveStageSchema,
  }),
  recruitmentController.moveCandidateStage
);

// PATCH /api/recruitment/candidates/:id/rating
router.patch(
  "/candidates/:id/rating",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: rateCandidateSchema,
  }),
  recruitmentController.rateCandidate
);

/* ========================================================================= */
/* INTERVIEWS                                                                */
/* ========================================================================= */

// GET /api/recruitment/interviews
router.get(
  "/interviews",
  authenticate,
  requirePermission("recruitment:read"),
  validate({
    query: listInterviewQuerySchema,
  }),
  recruitmentController.listInterviews
);

// POST /api/recruitment/interviews
router.post(
  "/interviews",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: scheduleInterviewSchema,
  }),
  recruitmentController.scheduleInterview
);

// POST /api/recruitment/interviews/:id/scorecard
router.post(
  "/interviews/:id/scorecard",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: submitScorecardSchema,
  }),
  recruitmentController.submitScorecard
);

/* ========================================================================= */
/* OFFERS                                                                    */
/* ========================================================================= */

// GET /api/recruitment/offers
router.get(
  "/offers",
  authenticate,
  requirePermission("recruitment:read"),
  recruitmentController.listOffers
);

// POST /api/recruitment/offers
router.post(
  "/offers",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: createOfferSchema,
  }),
  recruitmentController.createOffer
);

// PATCH /api/recruitment/offers/:id/status
router.patch(
  "/offers/:id/status",
  authenticate,
  requirePermission("recruitment:write"),
  validate({
    body: updateOfferStatusSchema,
  }),
  recruitmentController.updateOfferStatus
);

export default router;