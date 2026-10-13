import { prisma } from "../../lib/prisma";
import {
  getDefaultLayout,
  getAllowedWidgets,
  sanitizeLayout,
  type LayoutEntry,
  type WidgetDefinition,
  type WidgetSize,
} from "./dashboard.catalog";

export interface PreferencePayload {
  customized: boolean;
  layout: LayoutEntry[];
  catalog: Array<Pick<WidgetDefinition, "id" | "title" | "description" | "defaultSize" | "sizes">>;
  defaultLayout: LayoutEntry[];
  /** Widget ids removed from the stored layout (unknown/unauthorized/outdated). */
  droppedWidgets: string[];
  updatedAt: string | null;
}

function toCatalogView(widgets: WidgetDefinition[]) {
  return widgets.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    defaultSize: w.defaultSize,
    sizes: w.sizes,
  }));
}

function toPayload(
  role: string,
  permissions: string[],
  stored: { layout: unknown; updatedAt: Date } | null,
  dropped: string[] = []
): PreferencePayload {
  return {
    customized: Boolean(stored),
    layout: stored ? (stored.layout as LayoutEntry[]) : getDefaultLayout(role, permissions),
    catalog: toCatalogView(getAllowedWidgets(role, permissions)),
    defaultLayout: getDefaultLayout(role, permissions),
    droppedWidgets: dropped,
    updatedAt: stored ? stored.updatedAt.toISOString() : null,
  };
}

/** Load the user's saved layout, re-validated against their current permissions. */
export async function getPreferences(userId: string, role: string, permissions: string[]): Promise<PreferencePayload> {
  const record = await prisma.userDashboardPreference.findUnique({ where: { userId } });
  if (!record) return toPayload(role, permissions, null);

  // Stored layout is the widgets array itself; re-wrap for schema validation.
  const storedWidgets = Array.isArray(record.layout) ? record.layout : [];
  const sanitized = sanitizeLayout(role, permissions, { widgets: storedWidgets });

  // Heal the stored row when widgets were dropped (e.g. a permission changed
  // or a widget was removed from the product) so future loads are clean.
  if (sanitized.dropped.length > 0) {
    const healed = await prisma.userDashboardPreference.update({
      where: { userId },
      data: { layout: sanitized.widgets as never },
    });
    return toPayload(role, permissions, { layout: healed.layout, updatedAt: healed.updatedAt }, sanitized.dropped);
  }

  return toPayload(role, permissions, { layout: record.layout, updatedAt: record.updatedAt });
}

/**
 * Persist the user's layout. Only widget ids + sizes are stored — never
 * business data. The layout is sanitized against the authenticated user's
 * server-side role/permissions before it touches the database.
 */
export async function savePreferences(
  userId: string,
  role: string,
  permissions: string[],
  input: unknown
): Promise<PreferencePayload> {
  const sanitized = sanitizeLayout(role, permissions, input);
  const record = await prisma.userDashboardPreference.upsert({
    where: { userId },
    create: { userId, layout: sanitized.widgets as never },
    update: { layout: sanitized.widgets as never },
  });
  return toPayload(role, permissions, { layout: record.layout, updatedAt: record.updatedAt }, sanitized.dropped);
}

/** Remove the user's saved layout — dashboards fall back to the default. */
export async function resetPreferences(userId: string, role: string, permissions: string[]): Promise<PreferencePayload> {
  await prisma.userDashboardPreference.deleteMany({ where: { userId } });
  return toPayload(role, permissions, null);
}

export type { WidgetSize };
