import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getPendingSelfAssessment } from "../../services/employeeDashboardService";

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function SelfAssessmentWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getPendingSelfAssessment);
  return (
    <DashboardWidgetCard icon={ClipboardCheck} title="Self-Assessment" iconColor="#7c3aed" iconBg="#f5f3ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/performance")}
      isEmpty={!loading && !error && !data?.pending} emptyLabel="No self-assessment pending">
      {data?.pending && (
        <p style={{ fontSize: "13.5px", color: "var(--text)" }}><strong>{data.cycleName}</strong> due {fmtDate(data.dueDate)}</p>
      )}
    </DashboardWidgetCard>
  );
}