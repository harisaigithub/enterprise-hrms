import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleDashboardSection({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ marginTop: "22px" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%", border: "1px solid var(--border)", background: "var(--card)",
          borderRadius: open ? "12px 12px 0 0" : "12px", padding: "13px 15px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", textAlign: "left", font: "inherit",
        }}
      >
        <span>
          <strong style={{ display: "block", color: "var(--text)", fontSize: "13px" }}>{title}</strong>
          {subtitle && <small style={{ display: "block", marginTop: "2px", color: "var(--subtext)", fontSize: "10.5px" }}>{subtitle}</small>}
        </span>
        <ChevronDown size={17} style={{ color: "var(--subtext)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 180ms ease" }} />
      </button>
      {open && (
        <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", background: "color-mix(in srgb, var(--background) 70%, white)", padding: "14px" }}>
          {children}
        </div>
      )}
    </section>
  );
}
