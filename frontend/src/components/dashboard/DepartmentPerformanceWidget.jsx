import { Building2 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function DepartmentPerformanceWidget() {
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  return (
    <DashboardWidgetCard icon={Building2} title="Department Performance" iconColor="#7c3aed" iconBg="#f5f3ff"
      loading={loading} error={error} onRetry={retry}>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {data?.departmentPerformance.map((d) => (
          <div key={d.department} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12.5px", color: "var(--text)", width: "90px", flexShrink: 0 }}>{d.department}</span>
            <div style={{ flex: 1, height: "5px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(d.avgRating / 5) * 100}%`, background: "var(--primary)", borderRadius: "99px" }} />
            </div>
            <span style={{ fontSize: "12px", color: "var(--subtext)", fontWeight: 600 }}>{d.avgRating}</span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}