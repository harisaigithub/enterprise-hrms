import { useNavigate } from "react-router-dom";
import { Grid2x2, UserPlus, Briefcase, Wallet, CalendarCheck, ClipboardList, BarChart3 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

// Maps action id to icon component.
const ICONS = {
  UserPlus,
  Briefcase,
  Wallet,
  CalendarCheck,
  ClipboardList,
  BarChart3,
};

export default function QuickActions() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const actions = data?.quickActions?.actions || [];

  return (
    <DashboardWidgetCard
      icon={Grid2x2}
      title="Quick Actions"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!loading && !error && actions.length === 0}
      emptyLabel="No quick actions available."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        {actions.map((action) => {
          const Icon = ICONS[action.iconName] || Grid2x2;
          return (
            <button
              key={action.id}
              id={`quick-action-${action.id}`}
              onClick={(e) => { e.stopPropagation(); navigate(action.path); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                gap: "8px", padding: "14px 6px", background: "var(--primary-light)", border: "none",
                borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "background 0.15s, transform 0.1s",
                textAlign: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <Icon size={20} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text)", lineHeight: 1.25 }}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </DashboardWidgetCard>
  );
}