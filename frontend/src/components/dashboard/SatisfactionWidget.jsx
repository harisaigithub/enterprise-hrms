import { Smile } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function SatisfactionWidget() {
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  const s = data?.satisfactionScore;
  return (
    <DashboardWidgetCard icon={Smile} title="Employee Satisfaction" iconColor="#16a34a" iconBg="#f0fdf4"
      loading={loading} error={error} onRetry={retry}>
      <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{s?.score} <span style={{ fontSize: "13px", color: "var(--subtext)", fontWeight: 500 }}>/ {s?.scale}</span></p>
      <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "2px" }}>{s?.surveyName}</p>
    </DashboardWidgetCard>
  );
}