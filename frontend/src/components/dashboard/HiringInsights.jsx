import { useNavigate } from "react-router-dom";
import { Users2 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";
import HiringChart from "./HiringChart";

export default function HiringInsights() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const stats = data?.hiringInsights?.stats || [];

  return (
    <DashboardWidgetCard
      icon={Users2}
      title="Hiring Insights"
      iconColor="#0f766e"
      iconBg="#eef2ff"
      loading={loading}
      error={error}
      onRetry={retry}
      onClick={() => navigate("/recruitment")}
      isEmpty={!loading && !error && stats.length === 0}
      emptyLabel="No hiring activity this week."
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "var(--subtext)", fontWeight: 400 }}>This week</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "4px" }}>
        {stats.map((item) => (
          <div key={item.title} style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "16px" }}>
            <p style={{ fontSize: "12px", color: "var(--subtext)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
              {item.title}
            </p>
            <p style={{ fontSize: "28px", fontWeight: 800, color: item.color, lineHeight: 1, marginBottom: "6px" }}>
              {item.value}
            </p>
            <span style={{ fontSize: "11.5px", color: "var(--green)", fontWeight: 600, background: "var(--green-light)", padding: "2px 7px", borderRadius: "99px" }}>
              ↗ {item.growth}
            </span>
          </div>
        ))}
      </div>

      {/* stopPropagation so clicking/hovering the chart doesn't trigger the
          card's own onClick navigation to /recruitment */}
      <div onClick={(e) => e.stopPropagation()}>
        <HiringChart />
      </div>
    </DashboardWidgetCard>
  );
}