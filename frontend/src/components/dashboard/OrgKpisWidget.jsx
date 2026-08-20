import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function OrgKpisWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  const kpis = data?.orgKpis;
  return (
    <DashboardWidgetCard icon={BarChart3} title="Org KPIs" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/employees")}>
      <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
        <div><p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{kpis?.headcount}</p><p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Headcount</p></div>
        <div><p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{kpis?.attritionRateYtd}%</p><p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Attrition YTD</p></div>
        <div><p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>{kpis?.openPositions}</p><p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Open Positions</p></div>
      </div>
    </DashboardWidgetCard>
  );
}