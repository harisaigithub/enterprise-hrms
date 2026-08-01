import { TrendingUp } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function PayrollCostTrendWidget() {
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  const trend = data?.payrollCostTrend || [];
  const max = Math.max(...trend.map((t) => t.cost), 1);
  return (
    <DashboardWidgetCard icon={TrendingUp} title="Payroll Cost Trend" iconColor="#d97706" iconBg="#fffbeb"
      loading={loading} error={error} onRetry={retry}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "56px" }}>
        {trend.map((t) => (
          <div key={t.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flex: 1 }}>
            <div style={{ width: "100%", height: `${(t.cost / max) * 44}px`, background: "var(--primary)", borderRadius: "3px 3px 0 0" }} />
            <span style={{ fontSize: "9.5px", color: "var(--subtext)" }}>{t.month}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "10.5px", color: "var(--subtext)", marginTop: "4px" }}>₹ crore / month</p>
    </DashboardWidgetCard>
  );
}