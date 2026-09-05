import { useNavigate } from "react-router-dom";
import { CalendarCheck, Clock, Receipt, Target, ListChecks } from "lucide-react";

const MANAGER_ACTIONS = [
  { label: "Review Leaves", hint: "Team leave requests", icon: CalendarCheck, path: "/leave?statusFilter=Pending", color: "#0f766e", bg: "#ecfdf5" },
  { label: "Team Attendance", hint: "Daily punches & timesheets", icon: Clock, path: "/attendance", color: "#0284c7", bg: "#f0f9ff" },
  { label: "Review Expenses", hint: "Claims awaiting approval", icon: Receipt, path: "/expenses", color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Team Goals & 1-on-1s", hint: "Performance cycles", icon: Target, path: "/performance", color: "#d97706", bg: "#fffbeb" },
  { label: "Team Tasks", hint: "Sprint boards & backlog", icon: ListChecks, path: "/tasks", color: "#2563eb", bg: "#eff6ff" },
];

export default function ManagerQuickActions() {
  const navigate = useNavigate();

  return (
    <section style={{ marginBottom: "24px" }} aria-labelledby="manager-quick-actions-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <p id="manager-quick-actions-title" style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}>Manager Actions</p>
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--subtext)" }}>Direct operational shortcuts for team management</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
        {MANAGER_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
                boxShadow: "var(--shadow-sm)",
                transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-2px)";
                event.currentTarget.style.boxShadow = "var(--shadow-md)";
                event.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.boxShadow = "var(--shadow-sm)";
                event.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "grid",
                  placeItems: "center",
                  color: action.color,
                  background: action.bg,
                  flexShrink: 0,
                }}
              >
                <Icon size={17} />
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "12.5px", color: "var(--text)" }}>{action.label}</strong>
                <small style={{ display: "block", marginTop: "2px", fontSize: "10.5px", color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {action.hint}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
