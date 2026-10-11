import type { Request, Response, NextFunction } from "express";
import { updateBgvCandidateProfile } from "./bgv.candidate-profile.service";

export async function updateBgvCandidateProfileController(req: Request, res: Response, next: NextFunction) {
  try { return res.json(await updateBgvCandidateProfile(req.params.id, req.body)); }
  catch (error) { return next(error); }
}
