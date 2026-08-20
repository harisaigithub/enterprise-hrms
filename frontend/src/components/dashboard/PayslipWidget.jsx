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
        <p style={{ fontSize: "13.5px", color: "var(--text)" }}><strong>{data.month}</strong> payslip is ready</p>
      ) : (
        <p style={{ fontSize: "13.5px", color: "var(--subtext)" }}><strong>{data?.month}</strong> payslip not yet generated</p>
      )}
    </DashboardWidgetCard>
  );
}