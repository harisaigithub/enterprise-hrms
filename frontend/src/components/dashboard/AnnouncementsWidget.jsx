import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getActiveAnnouncements } from "../../services/employeeDashboardService";

export default function AnnouncementsWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getActiveAnnouncements);
  return (
    <DashboardWidgetCard icon={Megaphone} title="Announcements" iconColor="#0284c7" iconBg="#f0f9ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/announcements")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No active announcements">
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {data?.map((a) => (
          <p key={a.id} style={{ fontSize: "13px", color: "var(--text)" }}>{a.title}</p>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}