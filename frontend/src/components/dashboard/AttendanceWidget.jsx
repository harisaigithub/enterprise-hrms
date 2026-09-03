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
        <><div className="dashboard-metric"><strong>{data.checkInTime}</strong><span>check-in</span></div><div className="dashboard-track"><span style={{ width: data.checkOutTime ? "100%" : "55%" }} /></div><span className="dashboard-status">● {data.checkOutTime ? `Completed · ${data.checkOutTime}` : "Workday in progress"}</span></>
      ) : (
        <><div className="dashboard-metric"><strong>--:--</strong><span>check-in</span></div><div className="dashboard-track"><span style={{ width: "0%" }} /></div><span className="dashboard-status warning">● Not checked in yet</span></>
      )}
    </DashboardWidgetCard>
  );
}
