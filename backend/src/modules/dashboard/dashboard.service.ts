import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nextBirthday(dateOfBirth: Date, today: Date) {
  let date = new Date(Date.UTC(today.getUTCFullYear(), dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
  if (date < today) date = new Date(Date.UTC(today.getUTCFullYear() + 1, dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()));
  return date;
}

export async function employeeDashboard(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employeeCode: true, department: { select: { name: true } }, location: { select: { name: true } } },
  });
  if (!employee) throw AppError.forbidden("Account is not linked to an employee record");

  const today = startOfToday();
  const nextWeek = new Date(today);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const year = today.getUTCFullYear();

  const [attendance, balances, pendingLeave, latestPayslip, cycle, enrollments, employees, policies, acknowledgements, notifications, unreadNotifications] = await Promise.all([
    prisma.attendancePunch.findUnique({ where: { employeeId_punchDate: { employeeId: employee.id, punchDate: today } } }),
    prisma.leaveBalance.findMany({ where: { employeeId: employee.id, year }, include: { leaveType: true }, orderBy: { leaveType: { name: "asc" } } }),
    prisma.leaveRequest.count({ where: { employeeId: employee.id, status: "Pending" } }),
    prisma.payslip.findFirst({ where: { employeeId: employee.id }, include: { payrollRun: true }, orderBy: { createdAt: "desc" } }),
    prisma.performanceReviewCycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.courseEnrollment.findMany({ where: { employeeId: employee.id, status: { not: "PASSED" }, course: { isCompliance: true, status: "PUBLISHED" } }, include: { course: true }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.employee.findMany({ where: { status: { not: "Inactive" }, dateOfBirth: { not: null } }, select: { firstName: true, lastName: true, dateOfBirth: true } }),
    prisma.policy.findMany({ where: { status: "Published" }, include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
    prisma.policyAcknowledgement.findMany({ where: { employeeId: employee.id }, select: { versionId: true } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  const selfAssessment = cycle
    ? await prisma.performanceReview.findUnique({
        where: { employeeId_reviewerId_reviewCycleId_reviewType: { employeeId: employee.id, reviewerId: employee.id, reviewCycleId: cycle.id, reviewType: "Self" } },
        select: { status: true, submittedAt: true },
      })
    : null;

  const acknowledgedVersions = new Set(acknowledgements.map((item) => item.versionId));
  const employeeScopes = new Set([
    "company-wide",
    ...(employee.department?.name ? [`department: ${employee.department.name.toLowerCase()}`] : []),
    ...(employee.location?.name ? [`location: ${employee.location.name.toLowerCase()}`] : []),
  ]);
  const pendingPolicies = policies.flatMap((policy) => {
    const current = policy.versions[0];
    if (!current?.effectiveDate || !policy.mandatoryAcknowledgement || !employeeScopes.has(policy.scope.toLowerCase()) || acknowledgedVersions.has(current.id)) return [];
    const due = new Date(current.effectiveDate);
    due.setUTCDate(due.getUTCDate() + (current.acknowledgementDeadlineDays ?? 0));
    return [{ id: policy.id, title: policy.title, dueDate: due.toISOString().slice(0, 10) }];
  }).slice(0, 4);

  const birthdays = employees
    .flatMap((item) => item.dateOfBirth ? [{ name: `${item.firstName} ${item.lastName}`, date: nextBirthday(item.dateOfBirth, today) }] : [])
    .filter((item) => item.date >= today && item.date <= nextWeek)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4)
    .map((item) => ({ name: item.name, date: item.date.toISOString().slice(0, 10) }));

  return {
    attendance: attendance ? { checkedIn: Boolean(attendance.punchIn), checkInTime: attendance.punchIn?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), checkOutTime: attendance.punchOut?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), status: attendance.status } : { checkedIn: false },
    leaveBalances: balances.map((balance) => ({ leaveType: balance.leaveType.name, available: Number(balance.totalDays) - Number(balance.usedDays) })),
    pendingLeaveRequests: pendingLeave,
    payslip: latestPayslip ? { generated: true, month: latestPayslip.payrollRun.period, status: latestPayslip.status } : { generated: false, month: "Latest" },
    selfAssessment: cycle ? { pending: cycle.phase === "Self-Assessment" && selfAssessment?.status !== "Submitted", cycleName: cycle.name, dueDate: cycle.selfAssessmentEnd.toISOString().slice(0, 10), status: selfAssessment?.status ?? "Not Started" } : { pending: false },
    complianceCourses: enrollments.map((enrollment) => ({ id: enrollment.id, name: enrollment.course.title, status: enrollment.status, dueDate: enrollment.expiresAt?.toISOString().slice(0, 10) ?? null })),
    birthdays,
    pendingPolicies,
    notifications: notifications.map((notification) => ({ id: notification.id, title: notification.title, body: notification.body, link: notification.link, read: notification.isRead, timestamp: notification.createdAt })),
    unreadNotifications,
  };
}
