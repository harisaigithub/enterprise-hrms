import { Cake } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getUpcomingBirthdays } from "../../services/employeeDashboardService";

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function BirthdaysWidget() {
  const { data, loading, error, retry } = useDashboardWidget(getUpcomingBirthdays);
  return (
    <DashboardWidgetCard icon={Cake} title="Birthdays This Week" iconColor="#dc2626" iconBg="#fef2f2"
      loading={loading} error={error} onRetry={retry}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No birthdays in the next 7 days">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {data?.map((b) => (
          <div key={b.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--text)" }}>{b.name}</span>
            <span style={{ color: "var(--subtext)", fontFamily: "monospace" }}>{fmtDate(b.date)}</span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}