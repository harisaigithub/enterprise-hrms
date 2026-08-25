import { useNavigate } from "react-router-dom";
import { CalendarPlus, ReceiptText, Target, ListChecks } from "lucide-react";

const ACTIONS = [
  { label: "Apply leave", hint: "Create a request", icon: CalendarPlus, path: "/leave", color: "#0f766e", bg: "#ecfdf5" },
  { label: "View payslip", hint: "Payroll & salary", icon: ReceiptText, path: "/payroll", color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Performance", hint: "Goals & reviews", icon: Target, path: "/performance", color: "#0284c7", bg: "#f0f9ff" },
  { label: "My tasks", hint: "Work priorities", icon: ListChecks, path: "/tasks", color: "#d97706", bg: "#fffbeb" },
];

export default function DashboardQuickActions() {
  const navigate = useNavigate();

  return (
    <section style={{ marginBottom: "22px" }} aria-labelledby="quick-actions-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <p id="quick-actions-title" style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}>Quick actions</p>
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--subtext)" }}>Frequently used employee actions</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{
                border: "1px solid var(--border)", background: "var(--card)", borderRadius: "12px",
                padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px",
                textAlign: "left", cursor: "pointer", font: "inherit", boxShadow: "var(--shadow-sm)",
                transition: "transform 160ms ease, box-shadow 160ms ease",
              }}
              onMouseEnter={(event) => { event.currentTarget.style.transform = "translateY(-2px)"; event.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={(event) => { event.currentTarget.style.transform = "translateY(0)"; event.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <span style={{ width: "36px", height: "36px", borderRadius: "10px", display: "grid", placeItems: "center", color: action.color, background: action.bg, flexShrink: 0 }}>
                <Icon size={17} />
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "12.5px", color: "var(--text)" }}>{action.label}</strong>
                <small style={{ display: "block", marginTop: "2px", fontSize: "10.5px", color: "var(--subtext)" }}>{action.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
