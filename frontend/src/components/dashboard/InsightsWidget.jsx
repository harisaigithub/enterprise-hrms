import { useNavigate } from "react-router-dom";
import { Lightbulb, AlertTriangle, Info } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

function fetchInsights() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.insights ?? [] }));
}

export default function InsightsWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(fetchInsights);
  const insights = data ?? [];
  return (
    <DashboardWidgetCard
      icon={Lightbulb}
      title="Operational insights"
      iconColor="#d97706"
      iconBg="#fffbeb"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={insights.length === 0}
      emptyLabel="Nothing needs attention right now."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.link)}
            style={{
              display: "flex", alignItems: "center", gap: 10, textAlign: "left",
              padding: "8px 10px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${item.severity === "warning" ? "#fde68a" : "var(--border)"}`,
              background: item.severity === "warning" ? "var(--amber-light)" : "var(--card)",
              fontSize: 12.5, color: "var(--text)", fontWeight: 600,
            }}
          >
            {item.severity === "warning"
              ? <AlertTriangle size={14} style={{ color: "var(--amber)", flexShrink: 0 }} />
              : <Info size={14} style={{ color: "var(--blue)", flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{item.message}</span>
            <span style={{ fontSize: 10.5, color: "var(--subtext)", fontWeight: 700 }}>Open →</span>
          </button>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
