import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { sendSuccess } from "../../lib/response";

import {
  listCourses,
  createCourse,
  publishCourse,
  createCourseVersion,
  updateCourseVersion,
  listEmployeeEnrollments,
  listAllEnrollments,
  assignCourse,
  submitQuiz,
  getQuiz,
  addCourseContent,
  listCourseContents,
  startCourseContent,
  completeCourseContent,
  getEnrollmentContent,
  uploadCourseContentFile,
  uploadCourseThumbnail,
} from "./lms.service";

export async function getCourses(
  req: Request,
  res: Response
) {
  const result = await listCourses();

  res.json(result);
}

export async function createCourseController(
  req: Request,
  res: Response
) {
  const result = await createCourse(req.body);

  res.status(201).json(result);
}

export async function publishCourseController(
  req: Request,
  res: Response
) {
  const result = await publishCourse(
    req.params.courseId
  );

  res.json(result);
}

export async function createCourseVersionController(
  req: Request,
  res: Response
) {
  const result = await createCourseVersion(
    req.params.courseId
  );

  res.status(201).json(result);
}

export async function updateCourseVersionController(
  req: Request,
  res: Response
) {
  const result = await updateCourseVersion(
    req.params.courseId,
    req.body
  );

  res.json(result);
}

export async function getMyEnrollments(
  req: Request,
  res: Response
) {
  if (!req.auth?.sub) {
    throw AppError.unauthorized(
      "Authentication required"
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.auth.sub,
    },
    select: {
      employee: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user?.employee) {
    throw AppError.notFound(
      "Employee profile not found"
    );
  }

  const result = await listEmployeeEnrollments(
    user.employee.id
  );

  res.json(result);
}

export async function getEnrollmentContentController(
  req: Request,
  res: Response
) {
  const result = await getEnrollmentContent(
    req.params.enrollmentId
  );

  res.json(result);
}


export async function getAllEnrollments(
  req: Request,
  res: Response
) {
  const result =
    await listAllEnrollments();

  res.json(result);
}

export async function assignCourseController(
  req: Request,
  res: Response
) {
  const result = await assignCourse(
    req.params.courseId,
    req.body.employeeId
  );

  res.status(201).json(result);
}

export async function submitQuizController(
  req: Request,
  res: Response
) {
  const result = await submitQuiz(
    req.params.enrollmentId,
    req.body.answers
  );

  res.json(result);
}

export async function getQuizController(
  req: Request,
  res: Response
) {
  const result = await getQuiz(
    req.params.enrollmentId
  );

  res.json(result);
}

export async function addCourseContentController(
  req: Request,
  res: Response
) {
  const result = await addCourseContent(
    req.params.courseId,
    req.body
  );

  res.status(201).json(result);
}

export async function listCourseContentsController(
  req: Request,
  res: Response
) {
  const result = await listCourseContents(
    req.params.courseId
  );

  res.json(result);
}

export async function uploadCourseContentFileController(
  req: Request,
  res: Response
) {
  if (!req.file) {
    throw AppError.badRequest(
      "File is required"
    );
  }

  const result =
    await uploadCourseContentFile(req.file);

  res.status(201).json({
    data: result,
  });
}

export async function startCourseContentController(
  req: Request,
  res: Response
) {
  const result = await startCourseContent(
    req.params.enrollmentId,
    req.params.contentId
  );

  res.json(result);
}

export async function completeCourseContentController(
  req: Request,
  res: Response
) {
  const result = await completeCourseContent(
    req.params.enrollmentId,
    req.params.contentId
  );

  res.json(result);
}

export async function uploadCourseThumbnailController(
  req: Request,
  res: Response
) {
  const { courseId } = req.params;

  const result =
    await uploadCourseThumbnail(
      courseId,
      req.file!
    );

  return sendSuccess(res, result.data);
}