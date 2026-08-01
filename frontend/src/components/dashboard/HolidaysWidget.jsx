import { useNavigate } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getUpcomingHolidays } from "../../services/employeeDashboardService";

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function HolidaysWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getUpcomingHolidays);
  return (
    <DashboardWidgetCard icon={PartyPopper} title="Upcoming Holidays" iconColor="#d97706" iconBg="#fffbeb"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/calendar")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No holidays scheduled yet">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {data?.map((h) => (
          <div key={h.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--text)" }}>{h.name}</span>
            <span style={{ color: "var(--subtext)", fontFamily: "monospace" }}>{fmtDate(h.date)}</span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}