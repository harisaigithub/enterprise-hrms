import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import { createInAppForEmployee } from "../notifications/notifications.service";
import * as workflowService from "../workflow/workflow.service";
import { serializeAttendanceList, serializeTeamSummary } from "../../serializers/attendance.serializer";
import { formatDate } from "../../serializers/helpers";
import { startOfDay } from "../../serializers/helpers";

function formatTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(11, 16);
}

function toNumber(val: any): number {
  return val != null ? Number(val) : 0;
}

const PUNCH_INCLUDE = {
  employee: { select: { employeeCode: true } },
} satisfies Prisma.AttendancePunchInclude;

/** Resolve an employee code (EMP001) to the DB PK, with scope guard.
 *  If actorEmployeeId is given, the resolved employee must match the actor
 *  (employees can only check-in/out for themselves). HR/Admin callers
 *  pass undefined to bypass. */
export async function resolveEmployeeId(employeeCode: string, actorEmployeeId?: string): Promise<string> {
  const emp = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!emp) throw AppError.notFound("Employee not found");
  if (actorEmployeeId && emp.id !== actorEmployeeId) {
    throw AppError.forbidden("You can only manage your own attendance");
  }
  return emp.id;
}

export interface AttendanceFilters {
  employeeId?: string;
  month?: number;
  year?: number;
}

export async function listAttendance(filters: AttendanceFilters, actorEmployeeId?: string) {
  const where: Prisma.AttendancePunchWhereInput = {};

  if (filters.employeeId) {
    where.employee = { employeeCode: filters.employeeId };
  } else if (actorEmployeeId) {
    // Default to the authenticated employee's own records.
    where.employee = { id: actorEmployeeId };
  }

  if (filters.month && filters.year) {
    const month = filters.month;
    const year = filters.year;
    where.punchDate = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    };
  }

  const rows = await prisma.attendancePunch.findMany({
    where,
    include: PUNCH_INCLUDE,
    orderBy: { punchDate: "desc" },
  });

  return { data: serializeAttendanceList(rows) };
}

export async function getTeamSummary() {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [punches, onLeaveToday] = await Promise.all([
    prisma.attendancePunch.findMany({
      where: { punchDate: { gte: today, lt: tomorrow } },
      include: { employee: { select: { employeeCode: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "Approved",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { id: true },
    }),
  ]);

  const present = punches.filter((p) => p.status === "Present").length;
  const late = punches.filter((p) => p.status === "Late").length;
  const wfh = punches.filter((p) => p.status === "WFH").length;
  const total = punches.length + onLeaveToday.length; // total tracked employees

  return {
    data: serializeTeamSummary({
      date: formatDate(today) ?? "",
      present,
      late,
      absent: Math.max(0, total - present - late - wfh - onLeaveToday.length),
      onLeave: onLeaveToday.length,
      wfh,
      total,
    }),
  };
}

export async function checkIn(employeeCode: string, actorEmployeeId?: string, method = "Web") {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const today = startOfDay(new Date());

  const existing = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
  });
  if (existing?.punchIn) {
    throw AppError.conflict("Already checked in today");
  }

  const now = new Date();

  // Shift & Grace Period check: Default 09:00 AM with 15 min grace = 09:15 AM
  const emp = await prisma.employee.findUnique({
    where: { id: empId },
    include: { shift: true },
  });
  const graceMinutes = emp?.shift?.gracePeriodMinutes ?? 15;
  const shiftStartHour = 9;
  const shiftStartMinute = 0;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalCurrentMinutes = currentHours * 60 + currentMinutes;
  const totalShiftAllowedMinutes = shiftStartHour * 60 + shiftStartMinute + graceMinutes;

  let computedStatus = "Present";
  if (totalCurrentMinutes > totalShiftAllowedMinutes) {
    computedStatus = "Late";
  }

  const punch = await prisma.attendancePunch.upsert({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
    update: { punchIn: now, punchOut: null, method, status: computedStatus },
    create: {
      employeeId: empId,
      punchDate: today,
      punchIn: now,
      method,
      status: computedStatus,
      scheduledHours: 8.0,
    },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "CREATE",
    entityType: "AttendancePunch",
    entityId: punch.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_IN", status: computedStatus },
  });

  const serialized = serializeAttendanceList([punch])[0];
  return { data: { employeeId: employeeCode, date: serialized.date, checkIn: serialized.checkIn, status: serialized.status } };
}

export async function checkOut(employeeCode: string, actorEmployeeId?: string) {
  const empId = await resolveEmployeeId(employeeCode, actorEmployeeId);
  const today = startOfDay(new Date());

  const [punch, activeBreak] = await Promise.all([
    prisma.attendancePunch.findUnique({
      where: { employeeId_punchDate: { employeeId: empId, punchDate: today } },
    }),
    prisma.attendanceBreak.findFirst({
      where: { employeeId: empId, endedAt: null },
      select: { id: true },
    }),
  ]);
  if (!punch?.punchIn) {
    throw AppError.badRequest("Check in first before checking out");
  }
  if (punch.punchOut) {
    throw AppError.conflict("Already checked out today");
  }
  if (activeBreak) {
    throw AppError.conflict("End your active break before checking out");
  }

  const now = new Date();
  const punchInTime = punch.punchIn.getTime();
  const punchOutTime = now.getTime();
  const actualHours = Math.round(((punchOutTime - punchInTime) / (1000 * 60 * 60)) * 100) / 100;

  // Overtime rule: if actual hours > 8.0 hours
  let overtimeHours = 0;
  if (actualHours > 8.0) {
    overtimeHours = Math.round((actualHours - 8.0) * 100) / 100;
  }

  let finalStatus = punch.status;
  if (actualHours < 4.0 && punch.status !== "Late") {
    finalStatus = "Half-Day";
  } else if (now.getHours() < 17 && punch.status === "Present") {
    finalStatus = "Early-Checkout";
  }

  const updated = await prisma.attendancePunch.update({
    where: { id: punch.id },
    data: {
      punchOut: now,
      actualHours,
      overtimeHours,
      status: finalStatus,
    },
    include: PUNCH_INCLUDE,
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "AttendancePunch",
    entityId: updated.id,
    newValue: { employeeId: empId, date: formatDate(today), action: "CHECK_OUT", actualHours, overtimeHours },
  });

  const serialized = serializeAttendanceList([updated])[0];
  return { data: { employeeId: employeeCode, checkOut: serialized.checkOut, status: serialized.status, hoursWorked: actualHours, overtimeHours } };
}

export async function startBreak(employeeId: string, actorUserId: string, breakType = "Short Break") {
  const today = startOfDay(new Date());
  const punch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId, punchDate: today } },
    select: { punchIn: true, punchOut: true },
  });

  if (!punch?.punchIn) throw AppError.badRequest("Check in first before starting a break");
  if (punch.punchOut) throw AppError.badRequest("A break cannot be started after check-out");

  try {
    const attendanceBreak = await prisma.attendanceBreak.create({ data: { employeeId, breakType } });

    await writeAuditLog({
      actorUserId,
      action: "CREATE",
      entityType: "AttendanceBreak",
      entityId: attendanceBreak.id,
      newValue: { employeeId, breakType, action: "BREAK_START", startedAt: attendanceBreak.startedAt },
    });

    return {
      data: {
        id: attendanceBreak.id,
        breakType: attendanceBreak.breakType,
        startTime: attendanceBreak.startedAt.toISOString(),
        endTime: null,
        durationMinutes: null,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("A break is already active");
    }
    throw error;
  }
}

export async function endBreak(employeeId: string, actorUserId: string) {
  const activeBreak = await prisma.attendanceBreak.findFirst({
    where: { employeeId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!activeBreak) throw AppError.badRequest("No active break found");

  const endedAt = new Date();
  const durationMinutes = Math.max(0, Math.floor((endedAt.getTime() - activeBreak.startedAt.getTime()) / 60000));
  const closed = await prisma.attendanceBreak.updateMany({
    where: { id: activeBreak.id, endedAt: null },
    data: { endedAt, durationMinutes },
  });
  if (closed.count !== 1) throw AppError.conflict("This break has already ended");

  const attendanceBreak = await prisma.attendanceBreak.findUniqueOrThrow({ where: { id: activeBreak.id } });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "AttendanceBreak",
    entityId: attendanceBreak.id,
    oldValue: { endedAt: null },
    newValue: { action: "BREAK_END", endedAt, durationMinutes },
  });

  return {
    data: {
      id: attendanceBreak.id,
      breakType: attendanceBreak.breakType,
      startTime: attendanceBreak.startedAt.toISOString(),
      endTime: attendanceBreak.endedAt?.toISOString() ?? null,
      durationMinutes: attendanceBreak.durationMinutes,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         Attendance Regularization                          */
/* -------------------------------------------------------------------------- */

const REGULARIZATION_ACTIVE_STATUSES = ["Submitted", "More Details Required", "Resubmitted", "Manager Approved"];
const REGULARIZATION_REQUEST_TYPE = "Attendance Regularization";

type RegularizationActor = {
  userId: string;
  employeeId: string;
  employeeCode: string;
  role: string;
  name: string;
};

type RegularizationInput = {
  date: string;
  requestedStatus: string;
  requestedPunchIn?: string;
  requestedPunchOut?: string;
  reason: string;
};

function validateRegularizationInput(input: RegularizationInput) {
  const targetDate = startOfDay(new Date(`${input.date}T00:00:00Z`));
  if (Number.isNaN(targetDate.getTime())) throw AppError.badRequest("A valid attendance date is required");
  if (targetDate.getTime() >= startOfDay(new Date()).getTime()) {
    throw AppError.badRequest("Regularization is allowed only for past attendance dates");
  }

  const punchIn = input.requestedPunchIn ? new Date(input.requestedPunchIn) : null;
  const punchOut = input.requestedPunchOut ? new Date(input.requestedPunchOut) : null;
  if (!punchIn || !punchOut || Number.isNaN(punchIn.getTime()) || Number.isNaN(punchOut.getTime())) {
    throw AppError.badRequest("Valid requested punch-in and punch-out times are required");
  }
  if (punchOut <= punchIn) throw AppError.badRequest("Punch-out must be later than punch-in");
  const hours = (punchOut.getTime() - punchIn.getTime()) / 3600000;
  if (hours > 18) throw AppError.badRequest("Requested work duration cannot exceed 18 hours");
  return { targetDate, punchIn, punchOut };
}

async function notifyEmployee(employeeId: string, title: string, body: string) {
  await createInAppForEmployee({ employeeId, title, body, category: "Attendance Regularization", link: "/attendance" });
}

async function notifyHr(title: string, body: string) {
  const recipients = await prisma.employee.findMany({
    where: { user: { role: { name: { in: ["HR", "ADMIN"] } }, isActive: true } },
    select: { id: true },
  });
  await Promise.all(recipients.map((employee) => notifyEmployee(employee.id, title, body)));
}

async function activeAttendanceDefinition() {
  const definition = await prisma.workflowDefinition.findFirst({
    where: { requestType: REGULARIZATION_REQUEST_TYPE, status: "Active" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!definition) {
    throw AppError.conflict("Attendance Regularization workflow is not installed. Install it from Workflow Library first.");
  }
  return definition;
}

export async function requestRegularization(
  employeeCode: string,
  input: RegularizationInput,
  actor: RegularizationActor
) {
  const empId = await resolveEmployeeId(employeeCode, actor.employeeId);
  const { targetDate, punchIn, punchOut } = validateRegularizationInput(input);

  const duplicate = await prisma.attendanceRegularization.findFirst({
    where: { employeeId: empId, date: targetDate, status: { in: REGULARIZATION_ACTIVE_STATUSES } },
    select: { id: true, status: true },
  });
  if (duplicate) throw AppError.conflict(`An active regularization request already exists for this date (${duplicate.status})`);

  const monthStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 1));
  const monthlyRequestCount = await prisma.attendanceRegularization.count({
    where: { employeeId: empId, date: { gte: monthStart, lt: monthEnd } },
  });
  const definition = await activeAttendanceDefinition();

  const existingPunch = await prisma.attendancePunch.findUnique({
    where: { employeeId_punchDate: { employeeId: empId, punchDate: targetDate } },
  });
  const originalStatus = existingPunch?.status || "Absent";

  const workflow = await workflowService.submitRequest(definition.id, employeeCode, {
    source_module: "Attendance",
    attendance_date: input.date,
    monthly_request_count: monthlyRequestCount + 1,
  });

  const reg = await prisma.attendanceRegularization.create({
    data: {
      employeeId: empId,
      date: targetDate,
      originalStatus,
      requestedStatus: input.requestedStatus || "Present",
      requestedPunchIn: punchIn,
      requestedPunchOut: punchOut,
      reason: input.reason,
      status: "Submitted",
      workflowInstanceId: workflow.data.id,
      history: {
        create: { actorEmployeeId: actor.employeeId, action: "SUBMIT", toStatus: "Submitted", comment: input.reason },
      },
    },
  });

  const manager = await prisma.employee.findUnique({ where: { id: empId }, select: { reportingManagerId: true } });
  if (manager?.reportingManagerId) {
    await notifyEmployee(manager.reportingManagerId, "Attendance correction awaiting review", `${actor.name} submitted a correction for ${input.date}.`);
  }
  await writeAuditLog({ actorUserId: actor.userId, action: "CREATE", entityType: "AttendanceRegularization", entityId: reg.id, newValue: { status: reg.status, date: input.date } });

  return { data: reg };
}

export async function listRegularizations(filters: { employeeId?: string; status?: string }, actorRole?: string, actorEmployeeId?: string) {
  const where: Prisma.AttendanceRegularizationWhereInput = {};

  if (actorRole === "EMPLOYEE" && actorEmployeeId) {
    where.employeeId = actorEmployeeId;
  } else if (actorRole === "MANAGER" && actorEmployeeId) {
    where.OR = [
      { employeeId: actorEmployeeId },
      { employee: { reportingManagerId: actorEmployeeId } },
    ];
  } else if (filters.employeeId) {
    where.employee = { employeeCode: filters.employeeId };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const rows = await prisma.attendanceRegularization.findMany({
    where,
    include: {
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true, avatarUrl: true, department: { select: { name: true } } },
      },
      history: {
        include: { actor: { select: { employeeCode: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      workflowInstance: { select: { id: true, status: true, currentStepIndex: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    data: rows.map((r) => ({
      id: r.id,
      employeeId: r.employee.employeeCode,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      avatar: r.employee.avatarUrl,
      department: r.employee.department?.name,
      date: formatDate(r.date),
      originalStatus: r.originalStatus,
      requestedStatus: r.requestedStatus,
      requestedPunchIn: r.requestedPunchIn ? formatTime(r.requestedPunchIn) : null,
      requestedPunchOut: r.requestedPunchOut ? formatTime(r.requestedPunchOut) : null,
      reason: r.reason,
      status: r.status,
      decisionNotes: r.decisionNotes,
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      workflow: r.workflowInstance,
      history: r.history.map((item) => ({
        id: item.id,
        action: item.action,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        comment: item.comment,
        actorName: item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System",
        actorEmployeeId: item.actor?.employeeCode ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
  };
}

export async function actOnRegularization(
  id: string,
  decision: { action: "APPROVE" | "REJECT" | "REQUEST_MORE_DETAILS"; comment?: string },
  actor: RegularizationActor
) {
  const reg = await prisma.attendanceRegularization.findUnique({
    where: { id },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, reportingManagerId: true } } },
  });
  if (!reg) throw AppError.notFound("Regularization request not found");
  if (["Approved", "Rejected"].includes(reg.status)) throw AppError.conflict(`Request is already ${reg.status.toLowerCase()}`);
  if (reg.employeeId === actor.employeeId) throw AppError.forbidden("You cannot approve your own attendance correction");
  if (!reg.workflowInstanceId) throw AppError.conflict("This request is not linked to a workflow instance");

  const isManager = actor.role === "MANAGER";
  const isHr = actor.role === "HR" || actor.role === "ADMIN";
  if (isManager && reg.employee.reportingManagerId !== actor.employeeId) {
    throw AppError.forbidden("Managers can act only on requests from their direct reports");
  }
  if (!isManager && !isHr) throw AppError.forbidden("Only the reporting manager or HR can act on this request");

  if (decision.action !== "APPROVE" && !decision.comment?.trim()) {
    throw AppError.badRequest("A comment is required when rejecting or requesting more details");
  }

  if (decision.action === "REQUEST_MORE_DETAILS") {
    if (!isManager || !["Submitted", "Resubmitted"].includes(reg.status)) {
      throw AppError.badRequest("More details can be requested only by the reporting manager during manager review");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({
        where: { id },
        data: { status: "More Details Required", decisionNotes: decision.comment, approverId: actor.employeeId },
      });
      await tx.attendanceRegularizationHistory.create({
        data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: decision.action, fromStatus: reg.status, toStatus: row.status, comment: decision.comment },
      });
      return row;
    });
    await notifyEmployee(reg.employeeId, "Attendance correction needs more details", decision.comment!);
    await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status, comment: decision.comment } });
    return { data: updated };
  }

  if (isManager && !["Submitted", "Resubmitted"].includes(reg.status)) throw AppError.badRequest("This request is not awaiting manager review");
  if (isHr && reg.status !== "Manager Approved") throw AppError.badRequest("HR can act only after manager approval");

  const workflowAction = decision.action === "APPROVE" ? "approve" : "reject";
  await workflowService.actOnStep(reg.workflowInstanceId, actor.employeeCode, actor.name, workflowAction, decision.comment, { bypassRoleApprover: isHr });

  if (decision.action === "REJECT") {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Rejected", decisionNotes: decision.comment, approverId: actor.employeeId, decidedAt: new Date() } });
      await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "REJECT", fromStatus: reg.status, toStatus: "Rejected", comment: decision.comment } });
      return row;
    });
    await notifyEmployee(reg.employeeId, "Attendance correction rejected", decision.comment!);
    await writeAuditLog({ actorUserId: actor.userId, action: "REJECT", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: "Rejected", comment: decision.comment } });
    return { data: updated };
  }

  if (isManager) {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Manager Approved", decisionNotes: decision.comment || "Approved by reporting manager", approverId: actor.employeeId } });
      await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "MANAGER_APPROVE", fromStatus: reg.status, toStatus: "Manager Approved", comment: decision.comment } });
      return row;
    });
    await notifyHr("Attendance correction awaiting HR verification", `${reg.employee.firstName} ${reg.employee.lastName}'s correction requires final verification.`);
    await writeAuditLog({ actorUserId: actor.userId, action: "APPROVE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status } });
    return { data: updated };
  }

  const punchIn = reg.requestedPunchIn!;
  const punchOut = reg.requestedPunchOut!;
  const actualHours = Math.round(((punchOut.getTime() - punchIn.getTime()) / 3600000) * 100) / 100;
  const overtimeHours = Math.max(0, Math.round((actualHours - 8) * 100) / 100);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.attendancePunch.upsert({
      where: {
        employeeId_punchDate: { employeeId: reg.employeeId, punchDate: reg.date },
      },
      update: {
        status: reg.requestedStatus,
        punchIn,
        punchOut,
        actualHours,
        overtimeHours,
      },
      create: {
        employeeId: reg.employeeId,
        punchDate: reg.date,
        status: reg.requestedStatus,
        punchIn,
        punchOut,
        actualHours,
        overtimeHours,
        scheduledHours: 8.0,
      },
    });
    const row = await tx.attendanceRegularization.update({ where: { id }, data: { status: "Approved", decisionNotes: decision.comment || "Verified by HR", approverId: actor.employeeId, decidedAt: new Date() } });
    await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "HR_APPROVE", fromStatus: reg.status, toStatus: "Approved", comment: decision.comment } });
    return row;
  });
  await notifyEmployee(reg.employeeId, "Attendance correction approved", `Your attendance for ${formatDate(reg.date)} has been updated after HR verification.`);
  await writeAuditLog({
    actorUserId: actor.userId,
    action: "APPROVE",
    entityType: "AttendanceRegularization",
    entityId: id,
    oldValue: { status: reg.status },
    newValue: { status: "Approved", attendanceStatus: reg.requestedStatus, actualHours },
  });
  return { data: updated };
}

export async function resubmitRegularization(id: string, input: RegularizationInput, actor: RegularizationActor) {
  const reg = await prisma.attendanceRegularization.findUnique({ where: { id } });
  if (!reg) throw AppError.notFound("Regularization request not found");
  if (reg.employeeId !== actor.employeeId) throw AppError.forbidden("You can resubmit only your own request");
  if (reg.status !== "More Details Required") throw AppError.conflict("Only a request awaiting more details can be resubmitted");
  const { targetDate, punchIn, punchOut } = validateRegularizationInput(input);
  if (targetDate.getTime() !== reg.date.getTime()) throw AppError.badRequest("The attendance date cannot be changed during resubmission");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.attendanceRegularization.update({
      where: { id },
      data: { requestedStatus: input.requestedStatus, requestedPunchIn: punchIn, requestedPunchOut: punchOut, reason: input.reason, status: "Resubmitted", decisionNotes: null },
    });
    await tx.attendanceRegularizationHistory.create({ data: { regularizationId: id, actorEmployeeId: actor.employeeId, action: "RESUBMIT", fromStatus: reg.status, toStatus: "Resubmitted", comment: input.reason } });
    return row;
  });
  const manager = await prisma.employee.findUnique({ where: { id: reg.employeeId }, select: { reportingManagerId: true } });
  if (manager?.reportingManagerId) await notifyEmployee(manager.reportingManagerId, "Attendance correction resubmitted", `${actor.name} added the requested details.`);
  await writeAuditLog({ actorUserId: actor.userId, action: "UPDATE", entityType: "AttendanceRegularization", entityId: id, oldValue: { status: reg.status }, newValue: { status: updated.status } });
  return { data: updated };
}

/* -------------------------------------------------------------------------- */
/*                               Shifts Master                                */
/* -------------------------------------------------------------------------- */

export async function listShifts() {
  const shifts = await prisma.attendanceShift.findMany({
    orderBy: { name: "asc" },
  });
  return {
    data: shifts.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: formatTime(s.startTime),
      endTime: formatTime(s.endTime),
      gracePeriodMinutes: s.gracePeriodMinutes,
      breakDurationMinutes: s.breakDurationMinutes,
      overtimeThresholdHours: toNumber(s.overtimeThresholdHours),
    })),
  };
}

export async function createShift(input: {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
  breakDurationMinutes?: number;
}) {
  const dummyDate = "1970-01-01";
  const shift = await prisma.attendanceShift.create({
    data: {
      name: input.name,
      startTime: new Date(`${dummyDate}T${input.startTime}:00Z`),
      endTime: new Date(`${dummyDate}T${input.endTime}:00Z`),
      gracePeriodMinutes: input.gracePeriodMinutes ?? 15,
      breakDurationMinutes: input.breakDurationMinutes ?? 60,
    },
  });
  return { data: shift };
}
