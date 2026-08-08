import type { LeaveRequest, LeaveType, LeaveBalance } from "@prisma/client";
import { countWeekdays, formatDate, toNumber } from "./helpers";

type LeaveTypePublic = LeaveType;

/** Deterministic mnemonic code from a leave type name (e.g. "Earned Leave" → "EL"). */
function mnemonic(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Leave type DTO. The frontend uses `id` as the join key (LT01..LT06), so we
 * expose the leave type `code` (stored as LT01) as the public `id` and derive a
 * short mnemonic `code` (EL, SL...) for display consistency with mock data.
 */
export function serializeLeaveType(lt: LeaveTypePublic) {
  return {
    id: lt.code,
    name: lt.name,
    code: mnemonic(lt.name),
    maxDays: lt.defaultAnnualDays,
    carryForward: lt.carryForward,
  };
}

export function serializeLeaveTypeList(types: LeaveTypePublic[]) {
  return types.map(serializeLeaveType);
}

type BalanceWithType = LeaveBalance & { leaveType?: LeaveType | null };

/**
 * Leave balance DTO: `{ leaveTypeId, leaveTypeName, total, used, pending, available }`.
 * `pending` and `available` are derived (available = total - used - pending).
 */
export function serializeLeaveBalance(
  balance: BalanceWithType,
  pendingDays: number
) {
  const total = toNumber(balance.totalDays);
  const used = toNumber(balance.usedDays);
  const available = Math.max(0, Math.round((total - used - pendingDays) * 10) / 10);
  return {
    leaveTypeId: balance.leaveType?.code ?? "",
    leaveTypeName: balance.leaveType?.name ?? "",
    total,
    used,
    pending: pendingDays,
    available,
  };
}

export function serializeLeaveBalanceList(
  balances: (BalanceWithType & { pendingDays: number })[]
) {
  return balances.map((b) => serializeLeaveBalance(b, b.pendingDays));
}

type RequestWithRelations = LeaveRequest & {
  employee?: { employeeCode: string; firstName: string; lastName: string } | null;
  leaveType?: LeaveType | null;
  approver?: { employeeCode: string; firstName: string; lastName: string } | null;
};

/**
 * Leave request DTO — matches mock/leave.js exactly:
 * `{ id, employeeId, employeeName, leaveTypeId, leaveTypeName, startDate,
 *    endDate, days, reason, status, appliedOn, approverId, approverName,
 *    approvedOn, comments }`.
 */
export function serializeLeaveRequest(req: RequestWithRelations) {
  return {
    id: req.id,
    employeeId: req.employee?.employeeCode ?? "",
    employeeName: req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : "",
    leaveTypeId: req.leaveType?.code ?? "",
    leaveTypeName: req.leaveType?.name ?? "",
    startDate: formatDate(req.startDate),
    endDate: formatDate(req.endDate),
    days: countWeekdays(req.startDate, req.endDate),
    reason: req.reason ?? "",
    status: req.status,
    appliedOn: formatDate(req.createdAt),
    approverId: req.approver?.employeeCode ?? null,
    approverName: req.approver ? `${req.approver.firstName} ${req.approver.lastName}` : null,
    approvedOn: req.approvedOn ? formatDate(req.approvedOn) : null,
    comments: req.comments ?? "",
  };
}

export function serializeLeaveRequestList(requests: RequestWithRelations[]) {
  return requests.map(serializeLeaveRequest);
}
