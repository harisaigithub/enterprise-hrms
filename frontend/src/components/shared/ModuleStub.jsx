/**
 * ModuleStub — placeholder page for modules not yet implemented.
 * Shows module name, description, and expected features list.
 * Every stub is wired to a real route so the sidebar navigation works.
 */

import { Construction } from "lucide-react";

export default function ModuleStub({ title, description, features = [] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "var(--radius-xl)",
          background: "var(--primary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <Construction size={32} style={{ color: "var(--primary)" }} />
      </div>

      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "8px",
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: "var(--subtext)",
          maxWidth: "460px",
          lineHeight: 1.6,
          marginBottom: "28px",
        }}
      >
        {description}
      </p>

      {features.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 28px",
            maxWidth: "400px",
            width: "100%",
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--subtext)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: "12px",
            }}
          >
            Planned Features
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {features.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13.5px",
                  color: "var(--label)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    flexShrink: 0,
                  }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
