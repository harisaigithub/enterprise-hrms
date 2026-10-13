import { z } from "zod";

/**
 * Server-side dashboard widget catalog + layout validation.
 *
 * The catalog is the single source of truth for which widgets exist and which
 * role/permission combinations may see them. The frontend registry mirrors
 * these ids; every saved layout is validated here against the *authenticated*
 * user's real role and permissions (from the JWT — never from the client body),
 * so a crafted layout can never grant access to unauthorized data.
 */

export type WidgetSize = "sm" | "md" | "lg";

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  /** Uppercase role names allowed to use this widget. */
  roles: string[];
  /** Optional permission gate — user needs at least one of these (OR). */
  anyOfPermissions?: string[];
  defaultSize: WidgetSize;
  sizes: WidgetSize[];
  /** Included in the recommended default layout when allowed. */
  inDefault: boolean;
}

const ALL_ROLES = ["ADMIN", "HR", "MANAGER", "FINANCE", "EMPLOYEE"];
const MANAGER_ROLES = ["MANAGER", "ADMIN"];
const HR_ROLES = ["HR", "ADMIN"];
const ADMIN_ONLY = ["ADMIN"];

const SIZES: WidgetSize[] = ["sm", "md", "lg"];

export const WIDGET_CATALOG: WidgetDefinition[] = [
  // ── Personal workspace (self-scoped data) ────────────────────────────────
  {
    id: "quick.actions",
    title: "Quick actions",
    description: "Shortcuts to the modules you use most.",
    roles: ALL_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "attendance.today",
    title: "Today's attendance",
    description: "Your punch-in/punch-out status for today.",
    roles: ALL_ROLES,
    anyOfPermissions: ["attendance:read"],
    defaultSize: "sm",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "leave.balances",
    title: "Leave balances",
    description: "Your available days by leave type for the current year.",
    roles: ALL_ROLES,
    anyOfPermissions: ["leave:read"],
    defaultSize: "sm",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "payroll.payslip",
    title: "Latest payslip",
    description: "Status of your most recent payslip.",
    roles: ALL_ROLES,
    anyOfPermissions: ["payroll:read"],
    defaultSize: "sm",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "performance.selfAssessment",
    title: "Self-assessment",
    description: "Your pending self-assessment for the active review cycle.",
    roles: ALL_ROLES,
    anyOfPermissions: ["performance:read"],
    defaultSize: "sm",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "lms.complianceCourses",
    title: "Compliance training",
    description: "Mandatory courses still in progress for you.",
    roles: ALL_ROLES,
    anyOfPermissions: ["lms:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "policies.pending",
    title: "Policies to acknowledge",
    description: "Mandatory policies you have not acknowledged yet.",
    roles: ALL_ROLES,
    anyOfPermissions: ["policies:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "notifications.recent",
    title: "Recent notifications",
    description: "Your latest in-app notifications.",
    roles: ALL_ROLES,
    anyOfPermissions: ["notifications:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "people.birthdays",
    title: "Upcoming birthdays",
    description: "Colleagues with birthdays in the next 7 days.",
    roles: ALL_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "ess.holidays",
    title: "Upcoming holidays",
    description: "Company holidays for the year.",
    roles: ALL_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: false,
  },
  {
    id: "ess.announcements",
    title: "Announcements",
    description: "Active company announcements.",
    roles: ALL_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: false,
  },

  // ── Manager — team-scoped (direct reports only) ─────────────────────────
  {
    id: "manager.quickActions",
    title: "Manager quick actions",
    description: "Shortcuts for team approvals and people operations.",
    roles: MANAGER_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "manager.teamApprovals",
    title: "Team approvals",
    description: "Leave and expense requests from your direct reports awaiting action.",
    roles: MANAGER_ROLES,
    anyOfPermissions: ["leave:approve", "expenses:approve"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "manager.teamAttendance",
    title: "Team attendance today",
    description: "Who among your direct reports is present, on leave or not checked in.",
    roles: MANAGER_ROLES,
    anyOfPermissions: ["attendance:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "manager.attendanceTrend",
    title: "Team attendance trend",
    description: "Daily present / on-leave / not-checked-in counts for your team over 14 days.",
    roles: MANAGER_ROLES,
    anyOfPermissions: ["attendance:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "manager.teamRoster",
    title: "Team roster",
    description: "Your direct reports with today's status.",
    roles: MANAGER_ROLES,
    anyOfPermissions: ["employees:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },

  // ── HR — organization-scoped ────────────────────────────────────────────
  {
    id: "hr.quickActions",
    title: "HR quick actions",
    description: "Shortcuts for common HR workflows.",
    roles: HR_ROLES,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.alerts",
    title: "Approval backlog",
    description: "Pending leave, expense and onboarding items needing attention.",
    roles: HR_ROLES,
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.hiringInsights",
    title: "Hiring insights",
    description: "Live applicant pipeline counts by stage.",
    roles: HR_ROLES,
    anyOfPermissions: ["recruitment:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.hiringFunnelChart",
    title: "Hiring funnel",
    description: "Applications by recruitment stage.",
    roles: HR_ROLES,
    anyOfPermissions: ["recruitment:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.people",
    title: "People",
    description: "Recently added employees and total headcount.",
    roles: HR_ROLES,
    anyOfPermissions: ["employees:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.payroll",
    title: "Payroll summary",
    description: "This month's payroll total and change vs last month.",
    roles: HR_ROLES,
    anyOfPermissions: ["payroll:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "hr.resources",
    title: "Policy resources",
    description: "Most recently updated published policies.",
    roles: HR_ROLES,
    anyOfPermissions: ["policies:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },

  // ── Finance ─────────────────────────────────────────────────────────────
  {
    id: "finance.expenseBacklog",
    title: "Expense approval backlog",
    description: "Expense claims awaiting approval across the organization.",
    roles: ["FINANCE", "ADMIN", "HR"],
    anyOfPermissions: ["expenses:approve", "expenses:manage"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },

  // ── Admin — organization-wide analytics ─────────────────────────────────
  {
    id: "admin.orgKpis",
    title: "Organization KPIs",
    description: "Headcount, open positions and YTD attrition.",
    roles: ADMIN_ONLY,
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "admin.departmentHeadcount",
    title: "Headcount by department",
    description: "Active employee distribution across departments.",
    roles: ADMIN_ONLY,
    anyOfPermissions: ["employees:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "admin.hiringFunnel",
    title: "Hiring funnel",
    description: "Applications by recruitment stage.",
    roles: ADMIN_ONLY,
    anyOfPermissions: ["recruitment:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "admin.payrollTrend",
    title: "Payroll cost trend",
    description: "Gross payroll for the most recent payroll runs.",
    roles: ADMIN_ONLY,
    anyOfPermissions: ["payroll:read"],
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "admin.taskProgress",
    title: "Task progress",
    description: "Task completion and overdue counts across projects.",
    roles: ADMIN_ONLY,
    anyOfPermissions: ["tasks:read"],
    defaultSize: "md",
    sizes: SIZES,
    inDefault: true,
  },
  {
    id: "admin.insights",
    title: "Operational insights",
    description: "Actionable items: approval backlogs, overdue work and open roles.",
    roles: ADMIN_ONLY,
    defaultSize: "lg",
    sizes: SIZES,
    inDefault: true,
  },
];

const CATALOG_BY_ID = new Map(WIDGET_CATALOG.map((w) => [w.id, w]));

/**
 * Curated recommended layouts per primary role. Entries are filtered against
 * the user's allowed widgets, so a permission change never yields a broken
 * default. Sizes come from the catalog's defaultSize.
 */
const DEFAULT_LAYOUT_BY_ROLE: Record<string, string[]> = {
  EMPLOYEE: [
    "quick.actions",
    "attendance.today",
    "leave.balances",
    "payroll.payslip",
    "performance.selfAssessment",
    "notifications.recent",
    "policies.pending",
    "lms.complianceCourses",
    "people.birthdays",
  ],
  MANAGER: [
    "manager.quickActions",
    "manager.teamApprovals",
    "manager.teamAttendance",
    "manager.attendanceTrend",
    "manager.teamRoster",
    "quick.actions",
    "attendance.today",
    "leave.balances",
    "payroll.payslip",
    "performance.selfAssessment",
    "notifications.recent",
    "people.birthdays",
  ],
  HR: [
    "hr.quickActions",
    "hr.alerts",
    "hr.hiringInsights",
    "hr.hiringFunnelChart",
    "hr.people",
    "hr.payroll",
    "hr.resources",
    "finance.expenseBacklog",
    "notifications.recent",
  ],
  FINANCE: [
    "finance.expenseBacklog",
    "quick.actions",
    "notifications.recent",
    "people.birthdays",
  ],
  ADMIN: [
    "admin.orgKpis",
    "admin.departmentHeadcount",
    "admin.hiringFunnel",
    "admin.payrollTrend",
    "admin.taskProgress",
    "admin.insights",
    "quick.actions",
    "notifications.recent",
  ],
};

const FALLBACK_DEFAULT_IDS = DEFAULT_LAYOUT_BY_ROLE.EMPLOYEE;

export const WIDGET_ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/;
export const MAX_LAYOUT_WIDGETS = 30;

export const layoutInputSchema = z.object({
  widgets: z
    .array(
      z.object({
        id: z.string().trim().min(3).max(80).regex(WIDGET_ID_PATTERN, "Invalid widget id format"),
        // Kept as a plain string on purpose: an invalid size must not reject
        // the whole layout — sanitizeLayout() coerces it to the widget default.
        size: z.string().trim().max(10).optional(),
      })
    )
    .max(MAX_LAYOUT_WIDGETS, `Layout cannot contain more than ${MAX_LAYOUT_WIDGETS} widgets`),
});

export type LayoutInput = z.infer<typeof layoutInputSchema>;

export interface LayoutEntry {
  id: string;
  size: WidgetSize;
}

export interface SanitizedLayout {
  widgets: LayoutEntry[];
  /** Widget ids that were dropped (unknown, unauthorized or duplicate). */
  dropped: string[];
}

function widgetAllowed(widget: WidgetDefinition, role: string, permissions: string[]): boolean {
  const normalizedRole = (role || "").toUpperCase();
  if (!widget.roles.includes(normalizedRole)) return false;
  if (widget.anyOfPermissions && widget.anyOfPermissions.length > 0) {
    return widget.anyOfPermissions.some((p) => permissions.includes(p));
  }
  return true;
}

/** Catalog entries the given user may actually use. */
export function getAllowedWidgets(role: string, permissions: string[]): WidgetDefinition[] {
  return WIDGET_CATALOG.filter((w) => widgetAllowed(w, role, permissions));
}

/** Recommended default layout for the user's role (only allowed widgets). */
export function getDefaultLayout(role: string, permissions: string[]): LayoutEntry[] {
  const allowed = new Map(getAllowedWidgets(role, permissions).map((w) => [w.id, w]));
  const ids = DEFAULT_LAYOUT_BY_ROLE[(role || "").toUpperCase()] ?? FALLBACK_DEFAULT_IDS;
  const entries: LayoutEntry[] = [];
  for (const id of ids) {
    const widget = allowed.get(id);
    if (widget) entries.push({ id, size: widget.defaultSize });
  }
  // Safety net: if a role has no curated default that matches its permissions,
  // fall back to every allowed widget flagged inDefault.
  if (entries.length === 0) {
    return getAllowedWidgets(role, permissions)
      .filter((w) => w.inDefault)
      .map((w) => ({ id: w.id, size: w.defaultSize }));
  }
  return entries;
}

/**
 * Validate an untrusted layout against the server catalog and the user's real
 * role/permissions. Unknown, unauthorized and duplicate widgets are dropped
 * (reported to the caller); invalid sizes fall back to the widget default.
 * If nothing survives sanitization the recommended default layout is returned
 * so a user can never end up with a blank or maliciously crafted dashboard.
 */
export function sanitizeLayout(role: string, permissions: string[], input: unknown): SanitizedLayout {
  const dropped: string[] = [];
  const seen = new Set<string>();
  const widgets: LayoutEntry[] = [];

  const parsed = layoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { widgets: getDefaultLayout(role, permissions), dropped: ["*invalid-layout*"] };
  }

  for (const entry of parsed.data.widgets) {
    const definition = CATALOG_BY_ID.get(entry.id);
    if (!definition) {
      dropped.push(entry.id);
      continue;
    }
    if (!widgetAllowed(definition, role, permissions)) {
      dropped.push(entry.id);
      continue;
    }
    if (seen.has(entry.id)) {
      dropped.push(entry.id);
      continue;
    }
    seen.add(entry.id);
    const size = entry.size as WidgetSize | undefined;
    widgets.push({
      id: entry.id,
      size: size && definition.sizes.includes(size) ? size : definition.defaultSize,
    });
  }

  if (widgets.length === 0) {
    return { widgets: getDefaultLayout(role, permissions), dropped };
  }
  return { widgets, dropped };
}
