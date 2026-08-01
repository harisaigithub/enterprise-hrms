import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getUpcomingComplianceCourses } from "../../services/employeeDashboardService";

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function ComplianceCoursesWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getUpcomingComplianceCourses);
  return (
    <DashboardWidgetCard icon={GraduationCap} title="Compliance Training" iconColor="#16a34a" iconBg="#f0fdf4"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/learning")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No courses due soon">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {data?.map((c) => (
          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--text)" }}>{c.name}</span>
            <span style={{ color: "var(--amber)", fontFamily: "monospace", fontWeight: 600 }}>Due {fmtDate(c.dueDate)}</span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}