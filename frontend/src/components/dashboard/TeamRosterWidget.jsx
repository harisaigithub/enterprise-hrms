import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, ExternalLink, Search, CheckCircle2, Clock, CalendarOff } from "lucide-react";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getDirectReportsList } from "../../services/managerDashboardService";

const STATUS_CONFIG = {
  Present: {
    badgeClass: "badge-success",
    color: "#059669",
    bg: "#ecfdf5",
    icon: CheckCircle2,
    label: "Present",
  },
  "On Leave": {
    badgeClass: "badge-warning",
    color: "#d97706",
    bg: "#fffbeb",
    icon: CalendarOff,
    label: "On Leave",
  },
  "Not Checked In": {
    badgeClass: "badge-neutral",
    color: "#64748b",
    bg: "#f8fafc",
    icon: Clock,
    label: "Not Checked In",
  },
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamRosterWidget() {
  const navigate = useNavigate();
  const { data: reports, loading, error, retry } = useDashboardWidget(getDirectReportsList);
  const [searchTerm, setSearchTerm] = useState("");

  const reportList = Array.isArray(reports) ? reports : [];
  const filtered = reportList.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      id="team-roster-widget"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Card Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px #dbeafe",
            }}
          >
            <Users2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 750, color: "var(--text)" }}>
              Direct Reports Presence ({reportList.length})
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--subtext)" }}>
              Real-time daily status for your team members
            </p>
          </div>
        </div>

        {/* Quick Search */}
        {reportList.length > 3 && (
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search size={13} style={{ position: "absolute", left: "10px", color: "var(--subtext)" }} />
            <input
              type="text"
              placeholder="Search team member…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                fontSize: "12px",
                padding: "6px 10px 6px 30px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--background)",
                color: "var(--text)",
                outline: "none",
                width: "180px",
              }}
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
          {[1, 2, 3].map((k) => (
            <div key={k} className="skeleton" style={{ height: "48px", borderRadius: "8px" }} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: "14px", textAlign: "center" }}>
          <p style={{ color: "var(--red)", fontSize: "12.5px", marginBottom: "8px" }}>Unable to load direct reports</p>
          <button
            onClick={retry}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--primary)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reportList.length === 0 && (
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", fontStyle: "italic", margin: "12px 0" }}>
          No direct reports currently assigned to your team.
        </p>
      )}

      {/* Direct reports list */}
      {!loading && !error && reportList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
          {filtered.map((emp) => {
            const statusConfig = STATUS_CONFIG[emp.statusToday] || STATUS_CONFIG["Not Checked In"];
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={emp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Left info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0f766e 0%, #0284c7 100%)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(emp.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {emp.name}
                      </p>
                      <span style={{ fontSize: "10.5px", color: "var(--subtext)", background: "var(--card)", padding: "1px 5px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        {emp.employeeCode}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {emp.designation}
                    </p>
                  </div>
                </div>

                {/* Right Status Badge & Link */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: statusConfig.bg,
                      color: statusConfig.color,
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <StatusIcon size={12} />
                    {emp.statusToday === "Present" && emp.punchInTime ? `In at ${emp.punchInTime}` : (emp.details || statusConfig.label)}
                  </span>
                  <button
                    type="button"
                    title={`View ${emp.name}'s profile`}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--subtext)",
                      padding: "4px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--subtext)")}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
