import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, MoreVertical } from "lucide-react";
import { useDashboardWidget } from "../../hooks/useDashboardWidget";
import { getHRDashboardSnapshot } from "../../services/hrDashboardService";

const SEVERITY_STYLES = {
  warning: { iconColor: "#d97706", iconBg: "#fef3c7", buttonBg: "var(--primary)", Icon: AlertTriangle },
  urgent: { iconColor: "#dc2626", iconBg: "#fee2e2", buttonBg: "var(--primary)", Icon: AlertTriangle },
  info: { iconColor: "#4f46e5", iconBg: "#eef2ff", buttonBg: "var(--primary)", Icon: Info },
};

function AlertRow({ alert, onDismiss }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const Icon = style.Icon;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)",
      padding: "12px 16px", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <span style={{
          width: "34px", height: "34px", borderRadius: "10px", background: style.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={17} style={{ color: style.iconColor }} />
        </span>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {alert.message}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={() => navigate(alert.buttonPath)}
          style={{
            padding: "8px 16px", background: style.buttonBg, color: "#fff", border: "none",
            borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {alert.buttonText}
        </button>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            style={{
              width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: "var(--subtext)",
            }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "32px", background: "#fff",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 10, minWidth: "120px",
            }}>
              <button
                onClick={() => { setMenuOpen(false); onDismiss(alert.id); }}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent",
                  border: "none", fontSize: "12px", color: "var(--text)", cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertCard() {
  const { data, loading, error, retry } = useDashboardWidget(getHRDashboardSnapshot);
  const [dismissedIds, setDismissedIds] = useState([]);
  const alerts = (data?.alerts?.list || []).filter((a) => !dismissedIds.includes(a.id));

  const handleDismiss = (id) => setDismissedIds((prev) => [...prev, id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: "48px", borderRadius: "var(--radius)", background: "var(--background)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
        background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: "20px",
      }}>
        <span style={{ fontSize: "12.5px", color: "var(--subtext)" }}>Couldn't load alerts.</span>
        <button onClick={retry} style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}