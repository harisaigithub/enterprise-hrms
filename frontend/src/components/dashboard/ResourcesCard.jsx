import { useNavigate } from "react-router-dom";
import { ShieldCheck, ChevronRight } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

export default function Resources() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const resources = data?.resources;
  const list = resources?.list || [];

  return (
    <DashboardWidgetCard
      icon={ShieldCheck}
      title="Policy Compliance"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!loading && !error && list.length === 0}
      emptyLabel="No policy items need attention."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {list.map((item) => (
          <button
            key={item.name}
            onClick={(e) => { e.stopPropagation(); navigate(item.link); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 4px", background: "transparent", border: "none",
              borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>
                {item.name}
              </span>
              <span style={{ fontSize: "11px", color: "var(--subtext)" }}>
                {item.note}
              </span>
            </span>
            <ChevronRight size={15} style={{ color: "var(--subtext)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}