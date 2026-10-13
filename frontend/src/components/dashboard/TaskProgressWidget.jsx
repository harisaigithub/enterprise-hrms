import { Gauge } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

function fetchTasks() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.taskProgress ?? null }));
}

export default function TaskProgressWidget() {
  const { data, loading, error, retry } = useDashboardWidget(fetchTasks);
  return (
    <DashboardWidgetCard
      icon={Gauge}
      title="Task progress"
      iconColor="#0284c7"
      iconBg="#f0f9ff"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!data || data.total === 0}
      emptyLabel="No tasks tracked yet."
    >
      <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{data.completionPct}%</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Completed ({data.done}/{data.total})</p>
        </div>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: data.overdue > 0 ? "var(--amber)" : "var(--text)" }}>{data.overdue}</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Overdue</p>
        </div>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "#e8eef2", marginTop: 12, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${data.completionPct}%`, borderRadius: 999, background: "linear-gradient(90deg,#0f766e,#2dd4bf)" }} />
      </div>
    </DashboardWidgetCard>
  );
}
