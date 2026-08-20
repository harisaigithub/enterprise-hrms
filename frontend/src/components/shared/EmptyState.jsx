/**
 * EmptyState — shown when a list/table has no data
 */

import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No results", subtitle = "", icon: Icon = Inbox }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        gap: "12px",
        color: "var(--subtext)",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "var(--radius-lg)",
          background: "var(--primary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} style={{ color: "var(--primary)" }} />
      </div>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: "13px", color: "var(--subtext)", textAlign: "center", maxWidth: "320px" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
