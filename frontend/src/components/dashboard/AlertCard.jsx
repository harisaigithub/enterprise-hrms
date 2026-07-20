import { AlertTriangle, MoreVertical } from "lucide-react";
import { alerts } from "../../data/alerts";

const severityStyle = {
  urgent: { icon: "#dc2626", tag: "#fef2f2", tagText: "#dc2626" },
  warning: { icon: "#d97706", tag: "#fffbeb", tagText: "#b45309" },
  info: { icon: "#4f46e5", tag: "#eef2ff", tagText: "#4338ca" },
};

export default function AlertCard() {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      {alerts.map((item, index) => {
        const sev = severityStyle[item.severity] || severityStyle.info;
        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom:
                index !== alerts.length - 1 ? "1px solid var(--border)" : "none",
              gap: "12px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "var(--radius-sm)",
                  background: sev.tag,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={16} style={{ color: sev.icon }} />
              </div>

              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--text)",
                  fontWeight: 450,
                  lineHeight: 1.5,
                }}
              >
                {item.title}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              <button
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-text)",
                  border: "none",
                  padding: "7px 16px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s ease, transform 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--primary-hover)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--primary)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {item.button}
              </button>

              <button
                aria-label="More options"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                  color: "var(--subtext)",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}