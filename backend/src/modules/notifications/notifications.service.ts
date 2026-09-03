import nodemailer from "nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { writeAuditLog } from "../../services/audit.service";

export const NOTIFICATION_CATEGORIES = [
  "Leave Approved",
  "Leave Rejected",
  "Payslip Ready",
  "Ticket Resolved",
  "Policy Published",
  "New Device Login",
  "Compliance Training Due",
  "Expense Approved",
  "Onboarding Reminder",
] as const;

const SECURITY_CRITICAL = new Set<string>(["New Device Login"]);
const MERGE_FIELDS = [
  { id: "employeeName", label: "Employee Name", classification: "L1" },
  { id: "leaveType", label: "Leave Type", classification: "L1" },
  { id: "leaveDates", label: "Leave Dates", classification: "L2" },
  { id: "ticketId", label: "Ticket ID", classification: "L1" },
  { id: "policyTitle", label: "Policy Title", classification: "L1" },
  { id: "payslipMonth", label: "Payslip Month", classification: "L1" },
  { id: "payslipLink", label: "Payslip Link", classification: "L1" },
  { id: "courseName", label: "Course Name", classification: "L1" },
  { id: "dueDate", label: "Due Date", classification: "L1" },
  { id: "deviceInfo", label: "Device Info", classification: "L2" },
  { id: "loginTime", label: "Login Time", classification: "L1" },
  { id: "expenseCategory", label: "Expense Category", classification: "L1" },
  { id: "salaryAmount", label: "Salary Amount", classification: "L3" },
  { id: "bankAccountNumber", label: "Bank Account Number", classification: "L4" },
  { id: "performanceRating", label: "Performance Rating", classification: "L3" },
  { id: "medicalNote", label: "Medical/Grievance Note", classification: "L4" },
] as const;

function fieldsIn(body: string) {
  return [...new Set([...body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((match) => match[1]))];
}

export function lintTemplate(body: string) {
  const fields = fieldsIn(body);
  const violations = fields.flatMap((field) => {
    const definition = MERGE_FIELDS.find((item) => item.id === field);
    if (!definition) return [{ field, reason: "Not in the approved merge-field catalog" }];
    if (definition.classification === "L3" || definition.classification === "L4") {
      return [{ field, reason: `Classified ${definition.classification}; raw value cannot be included` }];
    }
    return [];
  });
  return { fields, violations, passed: violations.length === 0 };
}

function serializeNotification(row: any) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    link: row.link,
    read: row.isRead,
    timestamp: row.createdAt,
  };
}

export async function inbox(userId: string, limit = 50) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unread = await prisma.notification.count({ where: { userId, isRead: false } });
  return { data: rows.map(serializeNotification), unread };
}

export async function markRead(userId: string, id: string) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) throw AppError.notFound("Notification not found");
  const updated = await prisma.notification.update({
    where: { id },
    data: row.isRead ? {} : { isRead: true, readAt: new Date() },
  });
  return serializeNotification(updated);
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function history(userId: string, limit = 100) {
  return prisma.notificationDelivery.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, category: true, channel: true, status: true, attempt: true, failureReason: true, createdAt: true },
  });
}

export async function preferences(userId: string) {
  const saved = await prisma.notificationPreference.findMany({ where: { userId } });
  return NOTIFICATION_CATEGORIES.map((category) => {
    const current = saved.find((item) => item.category === category);
    return {
      category,
      emailEnabled: SECURITY_CRITICAL.has(category) ? true : current?.emailEnabled ?? true,
      inAppEnabled: current?.inAppEnabled ?? true,
      securityCritical: SECURITY_CRITICAL.has(category),
    };
  });
}

export async function updatePreference(userId: string, category: string, emailEnabled: boolean, inAppEnabled: boolean) {
  const normalizedEmail = SECURITY_CRITICAL.has(category) ? true : emailEnabled;
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, emailEnabled: normalizedEmail, inAppEnabled },
    update: { emailEnabled: normalizedEmail, inAppEnabled },
  });
  return preferences(userId);
}

export function mergeFieldCatalog() {
  return MERGE_FIELDS;
}

export async function templates() {
  return prisma.notificationTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function saveTemplate(input: { name: string; category: string; body: string }, actorUserId: string) {
  const lint = lintTemplate(input.body);
  if (!lint.passed) throw AppError.badRequest(`Template contains restricted fields: ${lint.violations.map((item) => item.field).join(", ")}`);
  const created = await prisma.notificationTemplate.create({ data: { ...input, createdByUserId: actorUserId } });
  void writeAuditLog({ actorUserId, action: "CREATE", entityType: "NotificationTemplate", entityId: created.id, newValue: { name: created.name, category: created.category } });
  return created;
}

function render(body: string, values: Record<string, string>) {
  return body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => values[key] ?? `[${key}]`);
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL || (env.SMTP_USER && !env.SMTP_PASS)) {
    return { status: "Skipped", failureReason: "SMTP is not configured" };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    });
    await transporter.sendMail({ from: { name: env.SMTP_FROM_NAME, address: env.SMTP_FROM_EMAIL }, to, subject, text: body });
    return { status: "Delivered", failureReason: null };
  } catch (error) {
    logger.error({ err: error, userEmail: to }, "Notification email delivery failed");
    return { status: "Failed", failureReason: "Email provider rejected the message" };
  }
}

export async function dispatchToUser(input: {
  userId: string;
  title: string;
  body: string;
  category: string;
  link?: string | null;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, email: true } });
  if (!user) throw AppError.notFound("Notification recipient not found");
  const preference = await prisma.notificationPreference.findUnique({ where: { userId_category: { userId: user.id, category: input.category } } });
  const inAppEnabled = preference?.inAppEnabled ?? true;
  const emailEnabled = SECURITY_CRITICAL.has(input.category) || (preference?.emailEnabled ?? true);

  const notification = inAppEnabled
    ? await prisma.notification.create({ data: { userId: user.id, title: input.title, body: input.body, category: input.category, link: input.link } })
    : null;

  const deliveryRows: Array<{ channel: string; status: string; failureReason?: string | null }> = [];
  if (inAppEnabled) deliveryRows.push({ channel: "In-app", status: "Delivered" });
  if (emailEnabled) {
    const result = await sendEmail(user.email, input.title, input.body);
    deliveryRows.push({ channel: "Email", ...result });
  }
  if (deliveryRows.length) {
    await prisma.notificationDelivery.createMany({
      data: deliveryRows.map((row) => ({ notificationId: notification?.id, userId: user.id, category: input.category, channel: row.channel, status: row.status, failureReason: row.failureReason })),
    });
  }
  return { notification: notification ? serializeNotification(notification) : null, deliveries: deliveryRows };
}

export async function createInAppForEmployee(input: {
  employeeId: string;
  title: string;
  body: string;
  category: string;
  link?: string | null;
}) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId }, select: { userId: true } });
  if (!employee?.userId) return null;
  const preference = await prisma.notificationPreference.findUnique({ where: { userId_category: { userId: employee.userId, category: input.category } } });
  if (preference?.inAppEnabled === false) return null;
  const notification = await prisma.notification.create({ data: { userId: employee.userId, title: input.title, body: input.body, category: input.category, link: input.link } });
  await prisma.notificationDelivery.create({ data: { notificationId: notification.id, userId: employee.userId, category: input.category, channel: "In-app", status: "Delivered" } });
  return serializeNotification(notification);
}

export async function sendTest(templateId: string, userId: string, values: Record<string, string>) {
  const template = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.status !== "Active") throw AppError.notFound("Active notification template not found");
  return dispatchToUser({ userId, title: template.name, body: render(template.body, values), category: template.category, link: "/notifications" });
}
