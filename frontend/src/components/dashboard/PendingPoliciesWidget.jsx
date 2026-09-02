import { useNavigate } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getPendingPolicies } from "../../services/employeeDashboardService";

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "No deadline";

export default function PendingPoliciesWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getPendingPolicies);
  return (
    <DashboardWidgetCard icon={FileCheck2} title="Policy acknowledgements" iconColor="#7c3aed" iconBg="#f5f3ff"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/policies")}
      isEmpty={!loading && !error && (!data || data.length === 0)} emptyLabel="No policy acknowledgement pending">
      <div className="dashboard-mini-list">
        {data?.map((policy) => (
          <div key={policy.id} className="dashboard-mini-row">
            <span>{policy.title}</span><small>Due {formatDate(policy.dueDate)}</small>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
