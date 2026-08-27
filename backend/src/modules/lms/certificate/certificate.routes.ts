import { Router } from "express";

import {
  getCertificate,
  downloadCertificate,
  verifyCertificate,
  revokeCertificate,
  getAllCertificates,
  verifyCertificateById,
} from "./certificate.controller";

import {
  requirePermission,
  requireRole,
} from "../../../middlewares/rbac";

const router = Router();


// =====================================================
// PUBLIC VERIFICATION
// =====================================================


// Public certificate verification
// No authentication
// No LMS permission
router.get(
  "/learning-certificates/verify/:token",
  verifyCertificate
);


// =====================================================
// CERTIFICATE MANAGEMENT
// =====================================================


// Verify certificate from Certificate Management
// ADMIN / HR only
router.get(
  "/learning-certificates/:certificateId/verify",
  requirePermission("lms:read"),
  requireRole("ADMIN", "HR"),
  verifyCertificateById
);


// View all certificates
// ADMIN / HR only
router.get(
  "/learning-certificates",
  requirePermission("lms:read"),
  requireRole("ADMIN", "HR"),
  getAllCertificates
);


// View certificate details
// ADMIN / HR only
router.get(
  "/learning-certificates/:certificateId",
  requirePermission("lms:read"),
  requireRole("ADMIN", "HR"),
  getCertificate
);


// Download certificate from Certificate Management
// ADMIN / HR only
router.get(
  "/learning-certificates/:certificateId/download",
  requirePermission("lms:read"),
  requireRole("ADMIN", "HR"),
  downloadCertificate
);


// Revoke certificate
// ADMIN / HR only
router.patch(
  "/learning-certificates/:certificateId/revoke",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  revokeCertificate
);


export default router;