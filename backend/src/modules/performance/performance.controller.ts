import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import * as performanceService from "./performance.service";

export const getActiveCycle = asyncHandler(async (_req: Request, res: Response) => {
  const result = await performanceService.getActiveCycle();
  sendSuccess(res, result.data);
});

export const getGoals = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const cycleCode = req.query.cycle as string | undefined;
  const result = await performanceService.getGoals(employeeCode, cycleCode);
  sendSuccess(res, result.data);
});

export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = req.body.employeeId || req.auth!.employeeCode || "EMP001";
  const result = await performanceService.createGoal(employeeCode, req.body, req.auth?.sub);
  sendSuccess(res, result.data, undefined, 201);
});

export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const result = await performanceService.updateGoal(req.params.id, req.body, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const getSelfAssessment = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const cycleCode = req.query.cycle as string | undefined;
  const result = await performanceService.getSelfAssessment(employeeCode, cycleCode);
  sendSuccess(res, result.data);
});

export const submitSelfAssessment = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = req.body.employeeId || req.auth!.employeeCode || "EMP001";
  const responses = Array.isArray(req.body) ? req.body : req.body.responses;
  const result = await performanceService.submitSelfAssessment(employeeCode, responses, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const getManagerReview = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const cycleCode = req.query.cycle as string | undefined;
  const result = await performanceService.getManagerReview(employeeCode, cycleCode);
  sendSuccess(res, result.data);
});

export const submitManagerReview = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = req.body.employeeId;
  const reviewerCode = req.auth!.employeeCode || "EMP005";
  const responses = Array.isArray(req.body.responses) ? req.body.responses : req.body;
  const result = await performanceService.submitManagerReview(employeeCode, reviewerCode, responses, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const filter = (req.query.filter as string) || "all";
  const result = await performanceService.getFeedback(employeeCode, filter);
  sendSuccess(res, result.data);
});

export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const fromEmployeeCode = req.auth!.employeeCode || "EMP001";
  const result = await performanceService.createFeedback(fromEmployeeCode, req.body, req.auth?.sub);
  sendSuccess(res, result.data, undefined, 201);
});

export const getOneOnOnes = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const result = await performanceService.getOneOnOnes(employeeCode);
  sendSuccess(res, result.data);
});

export const createOneOnOne = asyncHandler(async (req: Request, res: Response) => {
  const creatorEmployeeCode = req.auth!.employeeCode || "EMP001";
  const result = await performanceService.createOneOnOne(creatorEmployeeCode, req.body, req.auth?.sub);
  sendSuccess(res, result.data, undefined, 201);
});

export const toggleOneOnOneAction = asyncHandler(async (req: Request, res: Response) => {
  const result = await performanceService.toggleOneOnOneAction(req.params.id, req.params.actionId, req.auth?.sub);
  sendSuccess(res, result.data);
});

export const getRatingsHistory = asyncHandler(async (req: Request, res: Response) => {
  const employeeCode = (req.query.employeeId as string) || req.auth!.employeeCode || "EMP001";
  const result = await performanceService.getRatingsHistory(employeeCode);
  sendSuccess(res, result.data);
});
