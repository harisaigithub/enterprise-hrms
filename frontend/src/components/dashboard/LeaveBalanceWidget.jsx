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
      <div className="dashboard-mini-list">
        {data?.map((b) => (
          <div key={b.leaveType} className="dashboard-mini-row">
            <span>{b.leaveType}<div className="dashboard-track" style={{ marginTop: "4px" }}><span style={{ width: `${Math.min(100, Math.max(0, (Number(b.available) / Math.max(1, Number(b.total ?? b.available))) * 100))}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} /></div></span>
            <strong>{b.available}<small> days</small></strong>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
