import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";
import * as employeeController from "./employee.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

const optionalUuid = z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined);

const listQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createBodySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required").optional().or(z.literal("")),
  phone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  avatarUrl: z.string().optional(),
  designationId: optionalUuid,
  departmentId: optionalUuid,
  locationId: optionalUuid,
  designation: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  managerId: z.string().optional(),
  employmentType: z.string().optional(),
  dateOfJoining: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  status: z.string().optional(),
  password: z.string().min(8).optional(),
});

const updateBodySchema = createBodySchema.partial();

// GET /api/employees — employees:read
router.get(
  "/",
  authenticate,
  requirePermission("employees:read|dashboard:read"),
  validate({ query: listQuerySchema }),
  employeeController.list
);

// POST /api/employees/bulk — Bulk employee creation
router.post(
  "/bulk",
  authenticate,
  requirePermission("employees:write"),
  employeeController.bulkCreate
);

// GET /api/employees/:id — employees:read
router.get("/:id", authenticate, requirePermission("employees:read|dashboard:read"), employeeController.getOne);

// POST /api/employees — employees:write
router.post("/", authenticate, requirePermission("employees:write"), validate({ body: createBodySchema }), employeeController.create);

// PUT /api/employees/:id — employees:write
router.put("/:id", authenticate, requirePermission("employees:write"), validate({ body: updateBodySchema }), employeeController.update);

// DELETE /api/employees/:id — employees:delete (Admin only in frontend matrix)
router.delete("/:id", authenticate, requirePermission("employees:delete"), employeeController.remove);

// GET /api/employees/:id/salary — employees:read (HR can view salary structure)
router.get("/:id/salary", authenticate, requirePermission("employees:read"), employeeController.getSalary);

// GET /api/employees/:id/salary/history — employees:read (HR can view salary structure history)
router.get("/:id/salary/history", authenticate, requirePermission("employees:read"), employeeController.getSalaryHistory);

// PUT /api/employees/:id/salary — employees:write (HR can set/update salary structure)
router.put("/:id/salary", authenticate, requirePermission("employees:write"), employeeController.upsertSalary);

// POST /api/employees/:id/avatar — Upload avatar
router.post("/:id/avatar", authenticate, upload.single("avatar"), employeeController.uploadAvatar);

// DELETE /api/employees/:id/avatar — Remove avatar
router.delete("/:id/avatar", authenticate, employeeController.removeAvatar);

// GET /api/employees/:id/documents — List employee documents
router.get("/:id/documents", authenticate, employeeController.listDocuments);

// POST /api/employees/:id/documents — Upload an employee document
router.post("/:id/documents", authenticate, upload.single("file"), employeeController.uploadDocument);

// PATCH /api/employees/:id/documents/:docId/verify — Verify or reject document (HR/Admin)
router.patch("/:id/documents/:docId/verify", authenticate, requirePermission("employees:write"), employeeController.verifyDocument);

// DELETE /api/employees/:id/documents/:docId — Delete an employee document
router.delete("/:id/documents/:docId", authenticate, employeeController.deleteDocument);

// GET /api/employees/:id/emergency-contacts
router.get("/:id/emergency-contacts", authenticate, employeeController.listEmergencyContacts);

// POST /api/employees/:id/emergency-contacts
router.post("/:id/emergency-contacts", authenticate, employeeController.addEmergencyContact);

// PUT /api/employees/:id/emergency-contacts/:contactId
router.put("/:id/emergency-contacts/:contactId", authenticate, employeeController.updateEmergencyContact);

// DELETE /api/employees/:id/emergency-contacts/:contactId
router.delete("/:id/emergency-contacts/:contactId", authenticate, employeeController.deleteEmergencyContact);

// GET /api/employees/:id/movements — Movement and lifecycle history
router.get("/:id/movements", authenticate, employeeController.listMovements);

// POST /api/employees/:id/transfer — Transfer department
router.post("/:id/transfer", authenticate, requirePermission("employees:write"), employeeController.transfer);

// POST /api/employees/:id/promote — Promote employee
router.post("/:id/promote", authenticate, requirePermission("employees:write"), employeeController.promote);

export default router;
