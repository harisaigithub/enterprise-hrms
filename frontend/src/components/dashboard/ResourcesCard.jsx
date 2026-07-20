import { ChevronRight } from "lucide-react";
import { resources } from "../../data/resources";

export default function ResourcesCard() {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "20px",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "12px",
        }}
      >
        Resources
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {resources.map((item) => (
          <button
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--background)",
              cursor: "pointer",
              transition: "background 0.15s ease, border-color 0.15s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary-light)";
              e.currentTarget.style.borderColor = "var(--border-focus)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--background)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <span
              style={{
                fontSize: "12.5px",
                color: "var(--text)",
                fontWeight: 500,
              }}
            >
              {item}
            </span>
            <ChevronRight size={14} style={{ color: "var(--subtext)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}