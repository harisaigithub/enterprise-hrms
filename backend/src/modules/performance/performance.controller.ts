import type { Request, Response } from "express";

import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { AppError } from "../../lib/errors";

import * as performanceService from "./performance.service";

/* -------------------------------------------------------------------------- */
/*                              Review Cycle                                  */
/* -------------------------------------------------------------------------- */

export const getActiveCycle = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await performanceService.getActiveCycle();

    sendSuccess(res, result.data);
  }
);

/* -------------------------------------------------------------------------- */
/*                              Employee Goals                                */
/* -------------------------------------------------------------------------- */

export const getGoals = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      (req.query.employeeId as string) ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const cycleCode =
      req.query.cycle as string | undefined;

    const result = await performanceService.getGoals(
      employeeCode,
      cycleCode
    );

    sendSuccess(res, result.data);
  }
);

export const createGoal = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      req.body.employeeId ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const result =
      await performanceService.createGoal(
        employeeCode,
        req.body,
        req.auth?.sub
      );

    sendSuccess(
      res,
      result.data,
      undefined,
      201
    );
  }
);

export const updateGoal = asyncHandler(
  async (req: Request, res: Response) => {
    const result =
      await performanceService.updateGoal(
        req.params.id,
        req.body,
        req.auth?.sub
      );

    sendSuccess(res, result.data);
  }
);

/* -------------------------------------------------------------------------- */
/*                              Manager Goals                                 */
/* -------------------------------------------------------------------------- */

export const getManagerGoals = asyncHandler(
  async (req: Request, res: Response) => {
    const managerCode =
      req.auth?.employeeCode;

    if (!managerCode) {
      throw AppError.unauthorized(
        "Authenticated manager is not linked to an employee"
      );
    }

    const cycleCode =
      req.query.cycle as string | undefined;

    const result =
      await performanceService.getManagerGoals(
        managerCode,
        cycleCode
      );

    sendSuccess(res, result.data);
  }
);

export const approveGoal = asyncHandler(
  async (req: Request, res: Response) => {
    const managerCode =
      req.auth?.employeeCode;

    if (!managerCode) {
      throw AppError.unauthorized(
        "Authenticated manager is not linked to an employee"
      );
    }

    const result =
      await performanceService.approveGoal(
        req.params.id,
        managerCode,
        req.auth?.sub
      );

    sendSuccess(res, result.data);
  }
);

export const rejectGoal = asyncHandler(
  async (req: Request, res: Response) => {
    const managerCode =
      req.auth?.employeeCode;

    if (!managerCode) {
      throw AppError.unauthorized(
        "Authenticated manager is not linked to an employee"
      );
    }

    const result =
      await performanceService.rejectGoal(
        req.params.id,
        managerCode,
        req.auth?.sub
      );

    sendSuccess(res, result.data);
  }
);

/* -------------------------------------------------------------------------- */
/*                            Self Assessment                                 */
/* -------------------------------------------------------------------------- */

export const getSelfAssessment = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      (req.query.employeeId as string) ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const cycleCode =
      req.query.cycle as string | undefined;

    const result =
      await performanceService.getSelfAssessment(
        employeeCode,
        cycleCode
      );

    sendSuccess(res, result.data);
  }
);

export const submitSelfAssessment = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      req.body.employeeId ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const responses = Array.isArray(req.body)
      ? req.body
      : req.body.responses;

    const result =
      await performanceService.submitSelfAssessment(
        employeeCode,
        responses,
        req.auth?.sub
      );

    sendSuccess(res, result.data);
  }
);

/* -------------------------------------------------------------------------- */
/*                              Manager Review                                */
/* -------------------------------------------------------------------------- */

export const getManagerReview = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      req.query.employeeId as string;

    if (!employeeCode) {
      throw AppError.badRequest(
        "employeeId is required"
      );
    }

    const cycleCode =
      req.query.cycle as string | undefined;

    const result =
      await performanceService.getManagerReview(
        employeeCode,
        cycleCode
      );

    sendSuccess(res, result.data);
  }
);

export const submitManagerReview = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      req.body.employeeId;

    if (!employeeCode) {
      throw AppError.badRequest(
        "employeeId is required"
      );
    }

    const reviewerCode =
      req.auth?.employeeCode;

    if (!reviewerCode) {
      throw AppError.unauthorized(
        "Authenticated manager is not linked to an employee"
      );
    }

    const responses =
      Array.isArray(req.body.responses)
        ? req.body.responses
        : req.body;

    const result =
      await performanceService.submitManagerReview(
        employeeCode,
        reviewerCode,
        responses,
        req.auth?.sub
      );

    sendSuccess(res, result.data);
  }
);

/* -------------------------------------------------------------------------- */
/*                         Continuous Feedback                                */
/* -------------------------------------------------------------------------- */

export const getFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      (req.query.employeeId as string) ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const filter =
      (req.query.filter as string) ||
      "all";

    const result =
      await performanceService.getFeedback(
        employeeCode,
        filter
      );

    sendSuccess(res, result.data);
  }
);

export const createFeedback = asyncHandler(
  async (req: Request, res: Response) => {
    const fromEmployeeCode =
      req.auth?.employeeCode;

    if (!fromEmployeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const result =
      await performanceService.createFeedback(
        fromEmployeeCode,
        req.body,
        req.auth?.sub
      );

    sendSuccess(
      res,
      result.data,
      undefined,
      201
    );
  }
);

/* -------------------------------------------------------------------------- */
/*                                 1-on-1s                                    */
/* -------------------------------------------------------------------------- */

export const getOneOnOnes = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      (req.query.employeeId as string) ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const result =
      await performanceService.getOneOnOnes(
        employeeCode
      );

    sendSuccess(res, result.data);
  }
);

export const createOneOnOne = asyncHandler(
  async (req: Request, res: Response) => {
    const creatorEmployeeCode =
      req.auth?.employeeCode;

    if (!creatorEmployeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const result =
      await performanceService.createOneOnOne(
        creatorEmployeeCode,
        req.body,
        req.auth?.sub
      );

    sendSuccess(
      res,
      result.data,
      undefined,
      201
    );
  }
);

export const toggleOneOnOneAction =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await performanceService.toggleOneOnOneAction(
          req.params.id,
          req.params.actionId,
          req.auth?.sub
        );

      sendSuccess(res, result.data);
    }
  );

/* -------------------------------------------------------------------------- */
/*                            Ratings History                                 */
/* -------------------------------------------------------------------------- */

export const getRatingsHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const employeeCode =
      (req.query.employeeId as string) ||
      req.auth?.employeeCode;

    if (!employeeCode) {
      throw AppError.unauthorized(
        "Authenticated user is not linked to an employee"
      );
    }

    const result =
      await performanceService.getRatingsHistory(
        employeeCode
      );

    sendSuccess(res, result.data);
  }
);