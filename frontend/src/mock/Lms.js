/**
 * Mock data — Learning Management / LMS (Module 11)
 */

export const courseStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  Published: { color: "#16a34a", bg: "#f0fdf4" },
};

export const enrollmentStatusMeta = {
  "Not Started": { color: "#64748b", bg: "#f1f5f9" },
  "In Progress": { color: "#0284c7", bg: "#f0f9ff" },
  Passed: { color: "#16a34a", bg: "#f0fdf4" },
  Failed: { color: "#dc2626", bg: "#fef2f2" },
  Locked: { color: "#dc2626", bg: "#fef2f2" },
};

export const MAX_ATTEMPTS = 3;
const ME_ID = "EMP001";

let courses = [
  {
    id: "co1",
    title: "POSH — Prevention of Sexual Harassment",
    description: "Mandatory annual compliance training for all employees.",
    contentModules: ["What is POSH", "Reporting a complaint", "Manager responsibilities"],
    isCompliance: true,
    expiryMonths: 12,
    passThreshold: 80,
    status: "Published",
    createdAt: "2026-01-05",
  },
  {
    id: "co2",
    title: "Information Security Awareness",
    description: "Phishing, password hygiene, and data handling basics.",
    contentModules: ["Phishing recognition", "Password hygiene", "Data classification"],
    isCompliance: true,
    expiryMonths: 12,
    passThreshold: 70,
    status: "Published",
    createdAt: "2026-01-10",
  },
  {
    id: "co3",
    title: "Effective Code Reviews",
    description: "Best practices for giving and receiving code review feedback.",
    contentModules: ["Review etiquette", "What to look for", "Common anti-patterns"],
    isCompliance: false,
    expiryMonths: null,
    passThreshold: 60,
    status: "Published",
    createdAt: "2026-03-12",
  },
  {
    id: "co4",
    title: "Advanced System Design",
    description: "Draft — still being storyboarded.",
    contentModules: [],
    isCompliance: false,
    expiryMonths: null,
    passThreshold: 70,
    status: "Draft",
    createdAt: "2026-07-20",
  },
];

let enrollments = [
  { id: "en1", courseId: "co1", employeeId: ME_ID, employeeName: "Matsya Singh", status: "Passed", score: 92, attempts: 1, lastAttemptAt: "2026-02-01", certifiedAt: "2026-02-01", expiresAt: "2027-02-01" },
  { id: "en2", courseId: "co2", employeeId: ME_ID, employeeName: "Matsya Singh", status: "In Progress", score: null, attempts: 0, lastAttemptAt: null, certifiedAt: null, expiresAt: null },
  { id: "en3", courseId: "co3", employeeId: ME_ID, employeeName: "Matsya Singh", status: "Not Started", score: null, attempts: 0, lastAttemptAt: null, certifiedAt: null, expiresAt: null },

  { id: "en4", courseId: "co1", employeeId: "EMP004", employeeName: "Gary Chen", status: "Passed", score: 88, attempts: 1, lastAttemptAt: "2026-01-20", certifiedAt: "2026-01-20", expiresAt: "2027-01-20" },
  { id: "en5", courseId: "co1", employeeId: "EMP006", employeeName: "James Sullivan", status: "Not Started", score: null, attempts: 0, lastAttemptAt: null, certifiedAt: null, expiresAt: null },
  { id: "en6", courseId: "co2", employeeId: "EMP004", employeeName: "Gary Chen", status: "Failed", score: 55, attempts: 2, lastAttemptAt: "2026-07-10", certifiedAt: null, expiresAt: null },
  { id: "en7", courseId: "co2", employeeId: "EMP006", employeeName: "James Sullivan", status: "Not Started", score: null, attempts: 0, lastAttemptAt: null, certifiedAt: null, expiresAt: null },
];

export function _getCourses() { return courses; }
export function _addCourse(course) { courses = [course, ...courses]; return course; }
export function _publishCourse(id) {
  const course = courses.find((c) => c.id === id);
  if (!course) return null;
  const hasContent = course.title && course.contentModules.length > 0;
  const complianceOk = !course.isCompliance || !!course.expiryMonths;
  if (!hasContent || !complianceOk) {
    return { error: !hasContent ? "Course needs a title and at least one content module before publishing." : "Compliance courses need a renewal/expiry rule before publishing." };
  }
  courses = courses.map((c) => (c.id === id ? { ...c, status: "Published" } : c));
  return { course: courses.find((c) => c.id === id) };
}

export function _getEnrollments(employeeId) {
  return employeeId ? enrollments.filter((e) => e.employeeId === employeeId) : enrollments;
}
export function _assignCourse(courseId, employeeId, employeeName) {
  const enrollment = {
    id: `en-${Date.now()}`,
    courseId,
    employeeId,
    employeeName,
    status: "Not Started",
    score: null,
    attempts: 0,
    lastAttemptAt: null,
    certifiedAt: null,
    expiresAt: null,
  };
  enrollments = [enrollment, ...enrollments];
  return enrollment;
}

// Server-authoritative scoring: client only ever sends the raw answers/count,
// never a pass/fail verdict — this function is the single source of truth.
export function _submitQuiz(enrollmentId, correctCount, totalQuestions) {
  const enrollment = enrollments.find((e) => e.id === enrollmentId);
  if (!enrollment) return null;
  const course = courses.find((c) => c.id === enrollment.courseId);
  const score = Math.round((correctCount / totalQuestions) * 100);
  const attempts = enrollment.attempts + 1;
  const passed = score >= course.passThreshold;
  const locked = !passed && attempts >= MAX_ATTEMPTS;
  const today = new Date().toISOString().slice(0, 10);
  const expiresAt = passed && course.expiryMonths
    ? new Date(new Date().setMonth(new Date().getMonth() + course.expiryMonths)).toISOString().slice(0, 10)
    : null;

  enrollments = enrollments.map((e) =>
    e.id === enrollmentId
      ? {
          ...e,
          score,
          attempts,
          lastAttemptAt: today,
          status: passed ? "Passed" : locked ? "Locked" : "Failed",
          certifiedAt: passed ? today : e.certifiedAt,
          expiresAt: passed ? expiresAt : e.expiresAt,
        }
      : e
  );
  return enrollments.find((e) => e.id === enrollmentId);
}