import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

export default function PeopleCard() {
  const navigate = useNavigate();
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const people = data?.people;

  return (
    <DashboardWidgetCard
      icon={Users}
      title="People"
      loading={loading}
      error={error}
      onRetry={retry}
      isEmpty={!loading && !error && (!people || people.list.length === 0)}
      emptyLabel="No employees to show."
    >
      {people && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600, background: "var(--primary-light)", padding: "2px 8px", borderRadius: "99px" }}>
              {people.total} total
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "14px" }}>
            {people.list.map((person) => (
              <div
                key={person.name}
                style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--background)", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--background)")}
              >
                <img src={person.img} alt={person.name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }} />
                <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {person.name}
                </p>
              </div>
            ))}
          </div>

          {/* BUG FIX: this button previously had no onClick at all and did nothing. */}
          <button
            id="see-all-people-btn"
            onClick={(e) => { e.stopPropagation(); navigate("/employees"); }}
            style={{
              width: "100%", padding: "9px", background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)", fontSize: "12.5px", fontWeight: 600,
              cursor: "pointer", transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
          >
            See all people →
          </button>
        </>
      )}
    </DashboardWidgetCard>
  );
}