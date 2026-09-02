import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getPayslipStatus } from "../../services/employeeDashboardService";

export default function PayslipWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getPayslipStatus);
  return (
    <DashboardWidgetCard icon={Receipt} title="Payslip" iconColor="#16a34a" iconBg="#f0fdf4"
      loading={loading} error={error} onRetry={retry} onClick={() => navigate("/payroll")}>
      {data?.generated ? (
        <><div className="dashboard-metric"><strong>{data.month}</strong></div><div className="dashboard-track"><span style={{ width: "100%", background: "linear-gradient(90deg,#16a34a,#4ade80)" }} /></div><span className="dashboard-status">● Payslip ready</span></>
      ) : (
        <><div className="dashboard-metric"><strong>{data?.month || "Current"}</strong></div><div className="dashboard-track"><span style={{ width: "35%", background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} /></div><span className="dashboard-status warning">● Processing</span></>
      )}
    </DashboardWidgetCard>
  );
}
