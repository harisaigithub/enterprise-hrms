import { Router } from "express";

import {
  getCourses,
  createCourseController,
  publishCourseController,
  createCourseVersionController,
  updateCourseVersionController,
  getMyEnrollments,
  getAllEnrollments,
  assignCourseController,
  getQuizController,
  submitQuizController,
  addCourseContentController,
  listCourseContentsController,
  uploadCourseContentFileController,
  startCourseContentController,
  completeCourseContentController,
  getEnrollmentContentController,
  uploadCourseThumbnailController,
} from "./lms.controller";

import { authenticate } from "../../middlewares/auth";
import {
  requirePermission,
  requireRole,
} from "../../middlewares/rbac";

import {
  lmsUpload,
  thumbnailUpload,
} from "../../middlewares/lmsUpload";

import certificateRoutes from "./certificate/certificate.routes";

const router = Router();


// =====================================================
// AUTHENTICATION
// =====================================================

router.use(authenticate);


// =====================================================
// CERTIFICATE MODULE
// =====================================================

router.use(
  "/certificate",
  certificateRoutes
);


// =====================================================
// COURSES
// =====================================================

// View courses
// Any user with LMS read permission
router.get(
  "/courses",
  requirePermission("lms:read"),
  getCourses
);


// Create course
// ADMIN / HR only
router.post(
  "/courses",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  createCourseController
);


// Publish course
// ADMIN / HR only
router.patch(
  "/courses/:courseId/publish",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  publishCourseController
);


// Add course content
// ADMIN / HR only
router.post(
  "/courses/:courseId/contents",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  addCourseContentController
);


// View course contents
// Any user with LMS read permission
router.get(
  "/courses/:courseId/contents",
  requirePermission("lms:read"),
  listCourseContentsController
);


// Upload course content file
// ADMIN / HR only
router.post(
  "/courses/:courseId/content-file",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  lmsUpload.single("file"),
  uploadCourseContentFileController
);


// Upload course thumbnail
// ADMIN / HR only
router.post(
  "/courses/:courseId/thumbnail",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  thumbnailUpload.single("file"),
  uploadCourseThumbnailController
);


// Create course version
// ADMIN / HR only
router.post(
  "/courses/:courseId/version",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  createCourseVersionController
);


// Update course
// ADMIN / HR only
router.put(
  "/courses/:courseId",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  updateCourseVersionController
);


// =====================================================
// ENROLLMENTS
// =====================================================


// Current employee's learning
// Employee / Manager / HR / Admin can access their own learning
// Ownership check should be handled inside controller/service
router.get(
  "/enrollments/me",
  requirePermission("lms:read"),
  getMyEnrollments
);


// All enrollments
router.get(
  "/enrollments/all",
  requirePermission("lms:read"),
  getAllEnrollments
);


// Assign course to employee
// ADMIN / HR only
router.post(
  "/courses/:courseId/enrollments",
  requirePermission("lms:write"),
  requireRole("ADMIN", "HR"),
  assignCourseController
);


// =====================================================
// COURSE CONTENT PROGRESS
// =====================================================


// Start content
// Self-service learning action
// Ownership check should be handled inside controller/service
router.post(
  "/enrollments/:enrollmentId/content/:contentId/start",
  requirePermission("lms:write"),
  startCourseContentController
);


// Complete content
// Self-service learning action
// Ownership check should be handled inside controller/service
router.post(
  "/enrollments/:enrollmentId/content/:contentId/complete",
  requirePermission("lms:write"),
  completeCourseContentController
);


// View enrollment content / progress
// Ownership check should be handled inside controller/service
router.get(
  "/enrollments/:enrollmentId/content",
  requirePermission("lms:read"),
  getEnrollmentContentController
);


// =====================================================
// QUIZ
// =====================================================


// Get quiz questions
// Ownership check should be handled inside controller/service
router.get(
  "/enrollments/:enrollmentId/quiz",
  requirePermission("lms:read"),
  getQuizController
);


// Submit quiz
// Self-service learning action
// Ownership check should be handled inside controller/service
router.post(
  "/enrollments/:enrollmentId/quiz",
  requirePermission("lms:write"),
  submitQuizController
);


export default router;