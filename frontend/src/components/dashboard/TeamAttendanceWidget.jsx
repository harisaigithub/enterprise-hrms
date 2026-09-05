import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getTeamAttendanceSummary } from "../../services/managerDashboardService";

export default function TeamAttendanceWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getTeamAttendanceSummary);
  const teamSize = data?.teamSize ?? 0;
  const presentToday = data?.presentToday ?? 0;
  const onLeaveToday = data?.onLeaveToday ?? 0;
  const notCheckedIn = data?.notCheckedInToday ?? Math.max(0, teamSize - presentToday - onLeaveToday);
  const pct = teamSize > 0 ? Math.round((presentToday / teamSize) * 100) : 0;

  return (
    <DashboardWidgetCard
      icon={Users}
      title="Team Attendance Today"
      iconColor="#0284c7"
      iconBg="#f0f9ff"
      accentColor="#0284c7"
      loading={loading}
      error={error}
      onRetry={retry}
      onClick={() => navigate("/attendance")}
      isEmpty={!loading && !error && teamSize === 0}
      emptyLabel="No direct reports assigned"
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
        <p style={{ fontSize: "13.5px", color: "var(--text)" }}>
          <strong style={{ fontSize: "22px", fontWeight: 850 }}>{presentToday}</strong>
          <span style={{ color: "var(--subtext)" }}> of {teamSize} present</span>
        </p>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>{pct}%</span>
      </div>

      <div style={{ height: "8px", background: "var(--background)", borderRadius: "99px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "99px",
          background: "linear-gradient(90deg, #38bdf8, #0284c7)",
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11.5px", color: "var(--subtext)" }}>
        {onLeaveToday > 0 && (
          <span style={{ color: "#d97706", fontWeight: 600 }}>
            ● {onLeaveToday} on approved leave
          </span>
        )}
        {notCheckedIn > 0 && (
          <span style={{ color: "var(--subtext)" }}>
            ○ {notCheckedIn} not punched in
          </span>
        )}
        {presentToday === teamSize && teamSize > 0 && (
          <span style={{ color: "#059669", fontWeight: 600 }}>
            ✓ 100% team presence
          </span>
        )}
      </div>
    </DashboardWidgetCard>
  );
}