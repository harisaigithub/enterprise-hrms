import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/utils";
import { sendSuccess } from "../../lib/response";
import { globalSearch } from "./search.service";

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
});

// GET /api/search?q= — global search across employees, leave, payroll
router.get(
  "/",
  authenticate,
  validate({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = (req.query as { q: string }).q;
    const results = await globalSearch(q);
    sendSuccess(res, results);
  })
);

export default router;
