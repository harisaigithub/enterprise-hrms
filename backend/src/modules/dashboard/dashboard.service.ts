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

export async function adminDashboard() {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const [headcount, openPositionsAgg, appStages, departments, recentRuns, tasksTotal, tasksDone, overdueTasks, exitsYtd, pendingLeave, pendingExpenses] = await Promise.all([
    prisma.employee.count({ where: { status: "Active", isSoftDeleted: false } }),
    prisma.jobRequisition.aggregate({
      where: { status: { in: ["Open", "Approved"] } },
      _sum: { openings: true },
    }),
    prisma.application.groupBy({
      by: ["stage"],
      _count: { id: true },
    }),
    prisma.employee.groupBy({
      by: ["departmentId"],
      where: { status: "Active", isSoftDeleted: false, departmentId: { not: null } },
      _count: { id: true },
    }).catch(() => []),
    prisma.payrollRun.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "Done" } }),
    prisma.task.count({ where: { status: { not: "Done" }, dueDate: { lt: now } } }),
    prisma.separation.count({ where: { lastWorkingDay: { gte: yearStart, lte: now } } }),
    prisma.leaveRequest.count({ where: { status: "Pending" } }),
    prisma.expenseClaim.count({ where: { status: { in: ["Submitted", "Manager Pending", "Finance Pending"] } } }),
  ]);

  const departmentNames = await prisma.department.findMany({ select: { id: true, name: true } });
  const nameById = new Map(departmentNames.map((d) => [d.id, d.name]));
  const departmentHeadcount = departments
    .map((row) => ({ department: nameById.get(row.departmentId as string) || "Unassigned", headcount: row._count.id }))
    .filter((row) => row.department !== "Unassigned")
    .sort((a, b) => b.headcount - a.headcount);

  const stageCounts: Record<string, number> = {};
  for (const item of appStages) {
    stageCounts[item.stage.toLowerCase()] = item._count.id;
  }

  const hiringFunnel = {
    applied: stageCounts["applied"] || 0,
    screening: stageCounts["screening"] || 0,
    interview: stageCounts["interview"] || 0,
    offer: stageCounts["offer"] || 0,
    hired: stageCounts["hired"] || 0,
  };

  const openPositions = openPositionsAgg._sum.openings ?? 0;
  const attritionYtdPct = headcount > 0 ? Math.round((exitsYtd / headcount) * 1000) / 10 : 0;

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const payrollCostTrend = [...recentRuns].reverse().map((run) => ({
    month: MONTH_NAMES[(run.month - 1) % 12] || `M${run.month}`,
    cost: Math.round((Number(run.grossPayroll) / 10000000) * 100) / 100,
  }));

  const taskCompletionPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const insights: Array<{ id: string; severity: "info" | "warning"; message: string; link: string }> = [];
  if (pendingLeave > 0) insights.push({ id: "leave-backlog", severity: pendingLeave >= 5 ? "warning" : "info", message: `${pendingLeave} leave request${pendingLeave === 1 ? "" : "s"} pending approval`, link: "/leave" });
  if (pendingExpenses > 0) insights.push({ id: "expense-backlog", severity: "info", message: `${pendingExpenses} expense claim${pendingExpenses === 1 ? "" : "s"} awaiting approval`, link: "/expenses" });
  if (overdueTasks > 0) insights.push({ id: "overdue-tasks", severity: "warning", message: `${overdueTasks} task${overdueTasks === 1 ? "" : "s"} past their due date`, link: "/tasks" });
  if (openPositions > 0) insights.push({ id: "open-positions", severity: "info", message: `${openPositions} open position${openPositions === 1 ? "" : "s"} across active requisitions`, link: "/recruitment" });

  return {
    asOf: new Date().toISOString(),
    orgKpis: {
      headcount,
      openPositions,
      attritionYtdPct,
      exitsYtd,
    },
    departmentHeadcount,
    hiringFunnel,
    payrollCostTrend,
    taskProgress: { total: tasksTotal, done: tasksDone, overdue: overdueTasks, completionPct: taskCompletionPct },
    insights,
  };
}

export async function hrDashboard() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const [stageGroups, people, activeCount, currentPayroll, previousPayroll, policies, pendingLeave, pendingExpenses, pendingOnboarding] = await Promise.all([
    prisma.application.groupBy({ by: ["stage"], _count: { id: true } }),
    prisma.employee.findMany({ where: { status: "Active", isSoftDeleted: false }, orderBy: { createdAt: "desc" }, take: 8, select: { firstName: true, lastName: true, avatarUrl: true } }),
    prisma.employee.count({ where: { status: "Active", isSoftDeleted: false } }),
    prisma.payrollRun.findFirst({ where: { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }, orderBy: { createdAt: "desc" } }),
    prisma.payrollRun.findFirst({ where: { year: previousMonthStart.getUTCFullYear(), month: previousMonthStart.getUTCMonth() + 1 }, orderBy: { createdAt: "desc" } }),
    prisma.policy.findMany({ where: { status: "Published" }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true, updatedAt: true } }),
    prisma.leaveRequest.count({ where: { status: "Pending" } }),
    prisma.expenseClaim.count({ where: { status: { in: ["Submitted", "Manager Pending", "Finance Pending"] } } }),
    prisma.onboarding.count({ where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } }),
  ]);

  const stageCount = (names: string[]) => stageGroups.filter((row) => names.includes(row.stage.toLowerCase())).reduce((sum, row) => sum + row._count.id, 0);
  const payroll = Number(currentPayroll?.grossPayroll ?? 0);
  const previous = Number(previousPayroll?.grossPayroll ?? 0);
  const payrollChange = previous > 0 ? ((payroll - previous) / previous) * 100 : 0;
  const formatLakhs = (value: number) => `₹${(value / 100000).toFixed(2)}L`;

  return {
    hiringInsights: { stats: [
      { title: "Applicants", value: String(stageCount(["applied"])), growth: "Live", color: "#4f46e5" },
      { title: "Interviewing", value: String(stageCount(["screening", "interview"])), growth: "Live", color: "#7c3aed" },
      { title: "Offer Extended", value: String(stageCount(["offer"])), growth: "Live", color: "#059669" },
      { title: "Onboarded", value: String(stageCount(["hired"])), growth: "Live", color: "#0284c7" },
    ] },
    hiringFunnel: {
      applied: stageCount(["applied"]),
      screening: stageCount(["screening"]),
      interview: stageCount(["interview"]),
      offer: stageCount(["offer"]),
      hired: stageCount(["hired"]),
    },
    payroll: { title: "Payroll", totalPayroll: formatLakhs(payroll), description: "Total Payroll This Month", changePct: `${payrollChange >= 0 ? "+" : ""}${payrollChange.toFixed(1)}%`, changeLabel: "vs last month", buttonText: "Run Payroll" },
    people: { total: activeCount, list: people.map((person) => ({ name: `${person.firstName} ${person.lastName}`.trim(), img: person.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${person.firstName} ${person.lastName}`)}` })) },
    quickActions: { actions: [
      { id: "add-employee", label: "Add Employee", iconName: "UserPlus", path: "/employees" },
      { id: "post-job", label: "Post a Job", iconName: "Briefcase", path: "/recruitment" },
      { id: "run-payroll", label: "Run Payroll", iconName: "Wallet", path: "/payroll" },
      { id: "approve-leave", label: "Approve Leave", iconName: "CalendarCheck", path: "/leave" },
      { id: "onboarding", label: "Onboarding", iconName: "ClipboardList", path: "/onboarding" },
      { id: "reports", label: "Reports", iconName: "BarChart3", path: "/reports" },
    ] },
    resources: { list: policies.map((policy) => ({ name: policy.title, note: `Updated ${policy.updatedAt.toISOString().slice(0, 10)}`, link: "/policies" })) },
    alerts: { list: [
      ...(pendingExpenses ? [{ id: "expenses", severity: "warning", message: `${pendingExpenses} expense report(s) pending approval`, buttonText: "View Expense Reports", buttonPath: "/expenses" }] : []),
      ...(pendingLeave ? [{ id: "leave", severity: "info", message: `${pendingLeave} leave request(s) pending approval`, buttonText: "View Requests", buttonPath: "/leave" }] : []),
      ...(pendingOnboarding ? [{ id: "onboarding", severity: "warning", message: `${pendingOnboarding} onboarding record(s) need attention`, buttonText: "Open Onboarding", buttonPath: "/onboarding" }] : []),
    ] },
    asOf: monthStart.toISOString(),
  };
}

export async function managerDashboard(userId: string, employeeId?: string, _role?: string) {
  const manager = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(employeeId ? [{ id: employeeId }] : []),
        { userId },
      ],
      status: "Active",
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      department: { select: { id: true, name: true } },
      designation: { select: { title: true } },
    },
  });

  if (!manager) {
    throw AppError.forbidden("Account is not linked to an active employee record");
  }

  const today = startOfToday();

  // Query direct reports (Active employees where reportingManagerId == manager.id)
  const directReports = await prisma.employee.findMany({
    where: {
      reportingManagerId: manager.id,
      status: "Active",
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: { select: { title: true } },
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const reportIds = directReports.map((r) => r.id);

  // Today's punches for direct reports
  const punches = await prisma.attendancePunch.findMany({
    where: {
      employeeId: { in: reportIds },
      punchDate: today,
    },
    select: {
      employeeId: true,
      punchIn: true,
      punchOut: true,
      status: true,
    },
  });

  const punchByEmp: Record<string, (typeof punches)[number]> = {};
  for (const p of punches) {
    punchByEmp[p.employeeId] = p;
  }

  // Approved leaves covering today for direct reports
  const activeLeavesToday = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: reportIds },
      status: "Approved",
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: {
      leaveType: { select: { name: true } },
    },
  });

  const leaveByEmp: Record<string, (typeof activeLeavesToday)[number]> = {};
  for (const l of activeLeavesToday) {
    leaveByEmp[l.employeeId] = l;
  }

  // Pending leave requests submitted by direct reports awaiting this manager's approval
  const pendingLeaveRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: reportIds },
      status: "Pending",
    },
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // 14-day attendance trend for direct reports (real punches + approved leaves).
  const trendStart = new Date(today);
  trendStart.setUTCDate(trendStart.getUTCDate() - 13);
  const [trendPunches, trendLeaves, pendingTeamExpenses] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: { employeeId: { in: reportIds }, punchDate: { gte: trendStart, lte: today } },
      select: { employeeId: true, punchDate: true, punchIn: true, status: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: reportIds },
        status: "Approved",
        startDate: { lte: today },
        endDate: { gte: trendStart },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
    prisma.expenseClaim.count({
      where: { employeeId: { in: reportIds }, status: { in: ["Submitted", "Manager Pending"] } },
    }),
  ]);

  const presentByDate = new Map<string, Set<string>>();
  for (const punch of trendPunches) {
    if (!punch.punchIn) continue;
    const key = punch.punchDate.toISOString().slice(0, 10);
    if (!presentByDate.has(key)) presentByDate.set(key, new Set());
    presentByDate.get(key)!.add(punch.employeeId);
  }
  const leaveByDate = new Map<string, Set<string>>();
  for (const leave of trendLeaves) {
    const cursor = new Date(Math.max(leave.startDate.getTime(), trendStart.getTime()));
    while (cursor <= leave.endDate && cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      if (!leaveByDate.has(key)) leaveByDate.set(key, new Set());
      leaveByDate.get(key)!.add(leave.employeeId);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const attendanceTrend: Array<{ date: string; present: number; onLeave: number; notCheckedIn: number }> = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const present = presentByDate.get(key)?.size ?? 0;
    const onLeave = leaveByDate.get(key)?.size ?? 0;
    attendanceTrend.push({
      date: key,
      present,
      onLeave,
      notCheckedIn: Math.max(0, directReports.length - present - onLeave),
    });
  }

  let presentCount = 0;
  let onLeaveCount = 0;

  const directReportsWithStatus = directReports.map((emp) => {
    const punch = punchByEmp[emp.id];
    const leave = leaveByEmp[emp.id];

    let statusToday: "Present" | "On Leave" | "Not Checked In" = "Not Checked In";
    let punchInTime: string | null = null;
    let details: string | null = null;

    if (punch?.punchIn) {
      statusToday = "Present";
      presentCount++;
      punchInTime = punch.punchIn.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else if (leave) {
      statusToday = "On Leave";
      onLeaveCount++;
      details = leave.leaveType.name;
    }

    return {
      id: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designation?.title || "Team Member",
      department: emp.department?.name || "",
      statusToday,
      punchInTime,
      details,
    };
  });

  const teamSize = directReports.length;
  const notCheckedInCount = Math.max(0, teamSize - presentCount - onLeaveCount);
  const pendingCount = pendingLeaveRequests.length;

  const breakdown = [
    { type: "Leave", count: pendingCount },
    { type: "Expense", count: pendingTeamExpenses },
  ];

  return {
    manager: {
      id: manager.id,
      code: manager.employeeCode,
      name: `${manager.firstName} ${manager.lastName}`,
      department: manager.department?.name || "",
      designation: manager.designation?.title || "Manager",
    },
    teamSize,
    presentToday: presentCount,
    onLeaveToday: onLeaveCount,
    notCheckedInToday: notCheckedInCount,
    attendanceRate: teamSize > 0 ? Math.round((presentCount / teamSize) * 100) : 0,
    attendanceTrend,
    pendingApprovals: {
      pendingCount: pendingCount + pendingTeamExpenses,
      breakdown,
      recentRequests: pendingLeaveRequests.map((req) => ({
        id: req.id,
        employeeCode: req.employee.employeeCode,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        leaveType: req.leaveType.name,
        startDate: req.startDate.toISOString().slice(0, 10),
        endDate: req.endDate.toISOString().slice(0, 10),
        reason: req.reason || "No reason specified",
        createdAt: req.createdAt.toISOString(),
      })),
    },
    directReports: directReportsWithStatus,
  };
}

/** Finance workspace — organization-wide expense approval backlog (real data). */
export async function financeDashboard() {
  const pendingStatuses = ["Submitted", "Manager Pending", "Finance Pending"];
  const [backlog, byCategory, recentClaims] = await Promise.all([
    prisma.expenseClaim.aggregate({
      where: { status: { in: pendingStatuses } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.expenseClaim.groupBy({
      by: ["category"],
      where: { status: { in: pendingStatuses } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.expenseClaim.findMany({
      where: { status: { in: pendingStatuses } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        claimNumber: true,
        category: true,
        amount: true,
        status: true,
        submittedAt: true,
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    }),
  ]);

  return {
    asOf: new Date().toISOString(),
    backlog: {
      pendingCount: backlog._count.id,
      totalAmount: Number(backlog._sum.amount ?? 0),
    },
    byCategory: byCategory
      .map((row) => ({
        category: row.category,
        count: row._count.id,
        amount: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount),
    recentClaims: recentClaims.map((claim) => ({
      id: claim.id,
      claimNumber: claim.claimNumber,
      category: claim.category,
      amount: Number(claim.amount),
      status: claim.status,
      submittedAt: claim.submittedAt?.toISOString() ?? null,
      employeeName: `${claim.employee.firstName} ${claim.employee.lastName}`.trim(),
      employeeCode: claim.employee.employeeCode,
    })),
  };
}

