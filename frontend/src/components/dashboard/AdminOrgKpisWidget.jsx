import { BarChart3 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

function fetchKpis() {
  return getAnalyticsSnapshot().then((res) => ({ data: res.data?.orgKpis ?? null }));
}

export default function AdminOrgKpisWidget() {
  const { data, loading, error, retry } = useDashboardWidget(fetchKpis);
  return (
    <DashboardWidgetCard
      icon={BarChart3}
      title="Organization KPIs"
      iconColor="#0284c7"
      iconBg="#f0f9ff"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!data}
      emptyLabel="No organization metrics available."
    >
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{data.headcount}</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Active headcount</p>
        </div>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{data.openPositions}</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Open positions</p>
        </div>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{data.attritionYtdPct}%</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Attrition YTD ({data.exitsYtd} exits)</p>
        </div>
      </div>
    </DashboardWidgetCard>
  );
}
