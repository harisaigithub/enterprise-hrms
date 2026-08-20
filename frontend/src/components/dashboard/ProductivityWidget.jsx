import { Gauge } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function ProductivityWidget() {
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  const p = data?.productivity;
  return (
    <DashboardWidgetCard icon={Gauge} title="Productivity" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry}>
      <div style={{ display: "flex", gap: "18px" }}>
        <div><p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{p?.tasksCompletedRate}%</p><p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Tasks completed</p></div>
        <div><p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{p?.avgCycleTimeDays}d</p><p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Avg cycle time</p></div>
      </div>
    </DashboardWidgetCard>
  );
}