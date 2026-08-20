import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { loginRateLimiter } from "../../middlewares/rateLimiter";
import * as authController from "./auth.controller";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Public
router.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", validate({ body: refreshSchema }), authController.refresh);

// Authenticated
router.post("/logout", authenticate, validate({ body: refreshSchema.partial() }), authController.logout);
router.post("/change-password", authenticate, validate({ body: changePasswordSchema }), authController.changePassword);
router.get("/me", authenticate, authController.me);

export default router;
