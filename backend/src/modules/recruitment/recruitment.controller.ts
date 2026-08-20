import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as recruitmentService from "./recruitment.service";


/* =========================================================
   REQUISITIONS
   ========================================================= */

export const listRequisitions = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;

    const result = await recruitmentService.listRequisitions({
      search: q.search,
      departmentId: q.departmentId,
      status: q.status,
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
    });

    res.json({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }
);

export const getRequisition = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await recruitmentService.getRequisitionById(
      req.params.id
    );

    sendSuccess(res, result.data);
  }
);

export const createRequisition = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await recruitmentService.createRequisition(
      req.body,
      req.auth!.sub
    );

    sendSuccess(res, result.data, undefined, 201);
  }
);

export const updateRequisition = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await recruitmentService.updateRequisition(
      req.params.id,
      req.body
    );

    sendSuccess(res, result.data);
  }
);

/* =========================================================
   CANDIDATES
   ========================================================= */

export const listCandidates = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;

    const result = await recruitmentService.listCandidates({
      search: q.search,
      stage: q.stage,
      requisitionId: q.requisitionId,
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
    });

    res.json({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }
);

export const createCandidate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await recruitmentService.createCandidate(
      req.body
    );

    sendSuccess(res, result.data, undefined, 201);
  }
);

export const moveCandidateStage = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stage } = req.body;

    const result =
      await recruitmentService.moveCandidateStage(
        id,
        stage
      );

    sendSuccess(res, result.data);
  }
);

export const rateCandidate = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, notes } = req.body;

    const result =
      await recruitmentService.rateCandidate(
        id,
        Number(rating),
        notes
      );

    sendSuccess(res, result.data);
  }
);

/* =========================================================
   INTERVIEWS
   ========================================================= */

export const listInterviews = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;

    const result = await recruitmentService.listInterviews({
      status: q.status,
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
    });

    res.json({
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }
);

export const scheduleInterview = asyncHandler(
  async (req: Request, res: Response) => {
    const result =
      await recruitmentService.scheduleInterview(
        req.body
      );

    sendSuccess(res, result.data, undefined, 201);
  }
);

export const submitScorecard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const {
      interviewerId,
      rating,
      notes,
    } = req.body;

    const result =
      await recruitmentService.submitScorecard(
        id,
        interviewerId,
        Number(rating),
        notes
      );

    sendSuccess(res, result.data);
  }
);

/* =========================================================
   OFFERS
   ========================================================= */

export const listOffers = asyncHandler(
  async (_req: Request, res: Response) => {
    const result =
      await recruitmentService.listOffers();

    sendSuccess(res, result.data);
  }
);

export const createOffer = asyncHandler(
  async (req: Request, res: Response) => {
    const result =
      await recruitmentService.createOffer(
        req.body
      );

    sendSuccess(res, result.data, undefined, 201);
  }
);

export const updateOfferStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const {
      status,
      ...patch
    } = req.body;

    const result =
      await recruitmentService.updateOfferStatus(
        id,
        status,
        patch
      );

    sendSuccess(res, result.data);
  }
);