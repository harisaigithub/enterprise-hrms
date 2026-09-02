import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getUpcomingComplianceCourses } from "../../services/employeeDashboardService";

const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : null;

export default function ComplianceCoursesWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getUpcomingComplianceCourses);
  return (
    <DashboardWidgetCard icon={GraduationCap} title="Compliance Training" iconColor="#16a34a" iconBg="#f0fdf4"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/lms")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No courses due soon">
      <div className="dashboard-mini-list">
        {data?.map((c) => (
          <div key={c.name} className="dashboard-mini-row">
            <span>{c.name}</span><small>{fmtDate(c.dueDate) ? `Due ${fmtDate(c.dueDate)}` : c.status}</small>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
