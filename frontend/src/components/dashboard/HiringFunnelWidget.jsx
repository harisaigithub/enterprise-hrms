import { useNavigate } from "react-router-dom";
import { Filter } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getAnalyticsSnapshot } from "../../services/adminDashboardService";

export default function HiringFunnelWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getAnalyticsSnapshot);
  const funnel = data?.hiringFunnel;
  const stages = funnel ? [["Applied", funnel.applied], ["Screening", funnel.screening], ["Interview", funnel.interview], ["Offer", funnel.offer], ["Hired", funnel.hired]] : [];
  return (
    <DashboardWidgetCard icon={Filter} title="Hiring Funnel" iconColor="#16a34a" iconBg="#f0fdf4"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/recruitment")}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {stages.map(([label, value]) => (
          <div key={label}>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "10px", color: "var(--subtext)", marginTop: "2px" }}>{label}</p>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}