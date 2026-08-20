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

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "10px" }}>
        <p style={{ fontSize: "13.5px", color: "var(--text)" }}>
          <strong style={{ fontSize: "20px", fontWeight: 800 }}>{data?.presentToday}</strong>
          <span style={{ color: "var(--subtext)" }}> of {data?.teamSize} present</span>
        </p>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>{pct}%</span>
      </div>

      <div style={{ height: "9px", background: "var(--background)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "99px",
          background: "linear-gradient(90deg, #38bdf8, #0284c7)",
          transition: "width 0.4s ease",
        }} />
      </div>

      {data?.onLeaveToday > 0 && (
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "8px" }}>
          {data.onLeaveToday} on leave today
        </p>
      )}
    </DashboardWidgetCard>
  );
}