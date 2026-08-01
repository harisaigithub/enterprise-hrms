import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getTeamAttendanceSummary } from "../../services/managerDashboardService";

export default function TeamAttendanceWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getTeamAttendanceSummary);
  const pct = data ? Math.round((data.presentToday / data.teamSize) * 100) : 0;
  return (
    <DashboardWidgetCard icon={Users} title="Team Attendance Today" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/attendance")}>
      <p style={{ fontSize: "13.5px", color: "var(--text)" }}>
        <strong>{data?.presentToday} of {data?.teamSize}</strong> present · {data?.onLeaveToday} on leave
      </p>
      <div style={{ height: "5px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginTop: "8px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: "99px" }} />
      </div>
    </DashboardWidgetCard>
  );
}