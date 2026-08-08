import { useNavigate } from "react-router-dom";
import { Wallet, TrendingUp } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

export default function PayrollCard() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const payroll = data?.payroll;

  return (
    <DashboardWidgetCard
      icon={Wallet}
      title={payroll?.title || "Payroll"}
      iconColor="var(--green)"
      iconBg="var(--green-light)"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!loading && !error && !payroll}
      emptyLabel="No payroll data for this period."
    >
      {payroll && (
        <>
          <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
            {payroll.totalPayroll}
          </p>
          <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "5px", marginBottom: "16px" }}>
            {payroll.description}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "16px", background: "var(--green-light)", padding: "6px 10px", borderRadius: "var(--radius-sm)" }}>
            <TrendingUp size={13} style={{ color: "var(--green)" }} />
            <span style={{ fontSize: "11.5px", color: "var(--green)", fontWeight: 600 }}>
              {payroll.changePct} {payroll.changeLabel}
            </span>
          </div>
          {/* BUG FIX: this button previously had no onClick at all and did nothing. */}
          <button
            id="run-payroll-btn"
            onClick={(e) => { e.stopPropagation(); navigate("/payroll"); }}
            style={{
              width: "100%", padding: "9px", background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)", fontSize: "12.5px", fontWeight: 600,
              cursor: "pointer", transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
          >
            {payroll.buttonText}
          </button>
        </>
      )}
    </DashboardWidgetCard>
  );
}