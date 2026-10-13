import { Wallet } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getFinanceDashboardSnapshot } from "../../services/financeDashboardService";

function fetchBacklog() {
  return getFinanceDashboardSnapshot().then((res) => ({ data: res.data ?? null }));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function FinanceExpenseBacklogWidget() {
  const { data, loading, error, retry } = useDashboardWidget(fetchBacklog);
  const backlog = data?.backlog;
  const topCategories = (data?.byCategory ?? []).slice(0, 4);
  return (
    <DashboardWidgetCard
      icon={Wallet}
      title="Expense approval backlog"
      iconColor="#d97706"
      iconBg="#fffbeb"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!backlog || backlog.pendingCount === 0}
      emptyLabel="No expense claims waiting for approval."
    >
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{backlog.pendingCount}</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Pending claims</p>
        </div>
        <div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{inr.format(backlog.totalAmount)}</p>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Total requested</p>
        </div>
      </div>
      {topCategories.length > 0 && (
        <div className="dashboard-mini-list" style={{ marginTop: 12 }}>
          {topCategories.map((row) => (
            <div key={row.category} className="dashboard-mini-row">
              <span>{row.category}</span>
              <small>{row.count} · {inr.format(row.amount)}</small>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
