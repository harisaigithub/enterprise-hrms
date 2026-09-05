import { useNavigate } from "react-router-dom";
import { ClipboardList, ArrowUpRight } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getTeamApprovalsCount } from "../../services/managerDashboardService";

export default function TeamApprovalsWidget() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getTeamApprovalsCount);
  const pendingCount = data?.pendingCount ?? 0;
  const breakdown = Array.isArray(data?.breakdown) ? data.breakdown : [];
  const latestRequest = data?.recentRequests?.[0];

  return (
    <DashboardWidgetCard
      icon={ClipboardList}
      title="Pending Team Approvals"
      iconColor="#d97706"
      iconBg="#fffbeb"
      accentColor="#d97706"
      loading={loading}
      error={error}
      onRetry={retry}
      onClick={() => navigate("/leave?statusFilter=Pending")}
      isEmpty={!loading && !error && pendingCount === 0}
      emptyLabel="All caught up — no pending requests"
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
        <div className="dashboard-metric">
          <strong>{pendingCount}</strong>
          <span>request{pendingCount !== 1 ? "s" : ""}</span>
        </div>
        {pendingCount > 0 && (
          <span style={{
            fontSize: "11px",
            fontWeight: 750,
            padding: "3px 8px",
            borderRadius: "99px",
            background: "#fef3c7",
            color: "#92400e",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}>
            Review <ArrowUpRight size={12} />
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
        {breakdown.map((b) => (
          <span key={b.type} style={{ fontSize: "12px", color: "var(--subtext)" }}>
            {b.type}: <strong style={{ color: "var(--text)" }}>{b.count}</strong>
          </span>
        ))}
      </div>

      {latestRequest && (
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "10px", borderTop: "1px dashed var(--border)", paddingTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Latest: <strong style={{ color: "var(--text)" }}>{latestRequest.employeeName}</strong> ({latestRequest.leaveType})
        </p>
      )}
    </DashboardWidgetCard>
  );
}