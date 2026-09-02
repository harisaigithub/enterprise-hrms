import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getRecentNotifications } from "../../services/employeeDashboardService";

export default function RecentNotificationsWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getRecentNotifications);
  return (
    <DashboardWidgetCard icon={Bell} title="Recent notifications" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/notifications")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="You're all caught up">
      <div className="dashboard-mini-list">
        {data?.slice(0, 3).map((item) => (
          <div key={item.id} className="dashboard-mini-row">
            <span style={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden" }}><i aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.read ? "var(--border)" : "var(--primary)", flexShrink: 0 }} />{item.title}</span>
            <small>{item.read ? "Read" : "New"}</small>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
