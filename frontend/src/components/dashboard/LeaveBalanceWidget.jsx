import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getLeaveBalanceSummary } from "../../services/employeeDashboardService";

export default function LeaveBalanceWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getLeaveBalanceSummary);
  return (
    <DashboardWidgetCard icon={Wallet} title="Leave Balance" iconColor="#7c3aed" iconBg="#f5f3ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/leave")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No leave types configured">
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
        {data?.map((b) => (
          <div key={b.leaveType}>
            <p style={{ fontSize: "17px", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{b.available}</p>
            <p style={{ fontSize: "10.5px", color: "var(--subtext)", marginTop: "2px" }}>{b.leaveType}</p>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}