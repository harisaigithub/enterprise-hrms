/**
 * LMS service — Module 11
 * Mirrors leaveService/attendanceService: async functions resolving to { data }.
 */

import api from "./api";

export const getCourses = async () => {
  const res = await api.get("/lms/courses");
  return res.data;
};

export const addCourse = async (course) => {
  const res = await api.post("/lms/courses", course);
  return res.data;
};

export const publishCourse = async (id) => {
  const res = await api.patch(`/lms/courses/${id}/publish`);
  return res.data;
};

export const addCourseContent = async (
  courseId,
  content
) => {
  const res = await api.post(
    `/lms/courses/${courseId}/contents`,
    content
  );

  return res.data;
};

export const getCourseContents = async (
  courseId
) => {
  const res = await api.get(
    `/lms/courses/${courseId}/contents`
  );

  return res.data;
};

export const uploadCourseContentFile = async (
  courseId,
  file
) => {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post(
    `/lms/courses/${courseId}/content-file`,
    formData
  );

  return res.data;
};

export const createCourseVersion = async (courseId) => {
  const res = await api.post(
    `/lms/courses/${courseId}/version`
  );

  return res.data;
};

export const updateCourseVersion = async (
  courseId,
  course
) => {
  const res = await api.put(
    `/lms/courses/${courseId}`,
    course
  );

  return res.data;
};

export const getMyEnrollments = async () => {
  const res = await api.get(
    "/lms/enrollments/me"
  );

  return res.data;
};

export const getAllEnrollments = async () => {
  const res = await api.get("/lms/enrollments/all");
  return res.data;
};

export const assignCourse = async (courseId, employeeId) => {
  const res = await api.post(
    `/lms/courses/${courseId}/enrollments`,
    {
      employeeId,
    }
  );

  return res.data;
};

export const getQuizQuestions = async (enrollmentId) => {
  const res = await api.get(
    `/lms/enrollments/${enrollmentId}/quiz`
  );

  return res.data;
};

export const submitQuiz = async (enrollmentId, answers) => {
  const res = await api.post(
    `/lms/enrollments/${enrollmentId}/quiz`,
    {
      answers,
    }
  );

  return res.data;
};

export const getEnrollmentContent = async (enrollmentId) => {
  const res = await api.get(
    `/lms/enrollments/${enrollmentId}/content`
  );

  return res.data;
};


export const startCourseContent = async (
  enrollmentId,
  contentId
) => {
  const res = await api.post(
    `/lms/enrollments/${enrollmentId}/content/${contentId}/start`
  );

  return res.data;
};

export const completeCourseContent = async (
  enrollmentId,
  contentId
) => {
  const res = await api.post(
    `/lms/enrollments/${enrollmentId}/content/${contentId}/complete`
  );

  return res.data;
};


export async function uploadCourseThumbnail(
  courseId,
  file
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    `/lms/courses/${courseId}/thumbnail`,
    formData
  );

  return response.data;
}

export const getAllCertificates = async () => {
  const res = await api.get(
    "/lms/certificate/learning-certificates"
  );

  return res.data;
};

// Get certificate details
export const getCertificate = async (certificateId) => {
  const res = await api.get(
    `/lms/certificate/learning-certificates/${certificateId}`
  );

  return res.data;
};

export const verifyCertificateById = async (
  certificateId
) => {
  const res = await api.get(
    `/lms/certificate/learning-certificates/${certificateId}/verify`
  );

  return res.data;
};

// Download certificate PDF
export const downloadCertificate = async (certificateId) => {
  const res = await api.get(
    `/lms/certificate/learning-certificates/${certificateId}/download`,
    {
      responseType: "blob",
    }
  );

  return res;
};


// Verify certificate
export const verifyCertificate = async (token) => {
  const res = await api.get(
    `/lms/certificate/learning-certificates/verify/${token}`
  );

  return res.data;
};

export async function revokeCertificate(
  certificateId,
  reason
) {
  const res = await api.patch(
    `/lms/certificate/learning-certificates/${certificateId}/revoke`,
    {
      reason,
    }
  );

  return res.data;
}