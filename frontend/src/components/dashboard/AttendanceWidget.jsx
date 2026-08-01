import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getTodayAttendance } from "../../services/employeeDashboardService";

export default function AttendanceWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getTodayAttendance);
  return (
    <DashboardWidgetCard icon={Clock} title="Today's Attendance" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/attendance")}>
      {data?.checkedIn ? (
        <p style={{ fontSize: "13.5px", color: "var(--text)" }}>Checked in at <strong>{data.checkInTime}</strong>{data.checkOutTime ? `, out at ${data.checkOutTime}` : ""}</p>
      ) : (
        <p style={{ fontSize: "13.5px", color: "var(--amber)", fontWeight: 600 }}>Not checked in yet</p>
      )}
    </DashboardWidgetCard>
  );
}