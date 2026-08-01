import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getTeamApprovalsCount } from "../../services/managerDashboardService";

export default function TeamApprovalsWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getTeamApprovalsCount);
  return (
    <DashboardWidgetCard icon={ClipboardList} title="Pending Team Approvals" iconColor="#d97706" iconBg="#fffbeb"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/leave?statusFilter=Pending")}
      isEmpty={!loading && !error && !data?.pendingCount} emptyLabel="No pending approvals">
      <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "6px" }}>{data?.pendingCount}</p>
      <div style={{ display: "flex", gap: "12px" }}>
        {data?.breakdown.map((b) => (
          <span key={b.type} style={{ fontSize: "12px", color: "var(--subtext)" }}>{b.type}: <strong style={{ color: "var(--text)" }}>{b.count}</strong></span>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}