// Shared card shell for dashboard widgets.
// Handles loading (skeleton), error (retry), and empty states.
import { ChevronRight, RotateCcw } from "lucide-react";

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function DashboardWidgetCard({
  icon: Icon, title, loading, error, onRetry, onClick,
  iconColor = "var(--primary)", iconBg = "var(--primary-light)",
  accentColor = "var(--primary)",
  isEmpty = false, emptyLabel = "Nothing to show", children, id,
}) {
  const clickable = !!onClick && !loading && !error;
  const slug   = slugify(title);
  const cardId = id || `${slug}-widget`;

  return (
    <div
      id={cardId}
      className={`employee-dashboard-card${clickable ? " is-clickable" : ""}`}
      onClick={clickable ? onClick : undefined}
      style={{
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {/* Colored left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        width: "4px",
        background: accentColor,
        borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)",
        opacity: 0.9,
      }} />

      {/* Header row */}
      <div className="employee-dashboard-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Icon badge */}
          <div style={{
            width: "32px", height: "32px",
            borderRadius: "9px",
            background: iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${iconBg}`,
          }}>
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{title}</p>
        </div>
        {clickable && <ChevronRight size={15} style={{ color: "var(--subtext)", flexShrink: 0 }} />}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="skeleton" style={{ height: "24px", width: "70%" }} />
          <div className="skeleton" style={{ height: "14px", width: "50%" }} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <button
          id={`retry-${slug}-btn`}
          onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none",
            padding: "4px 6px", margin: "-4px -6px",
            borderRadius: "6px", cursor: "pointer",
            color: "var(--red)", fontSize: "12.5px", fontWeight: 600,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = "var(--red-light)"; }}
          onMouseLeave={(e) => { e.stopPropagation(); e.currentTarget.style.background = "none"; }}
        >
          <RotateCcw size={13} /> Unable to load — tap to retry
        </button>
      )}

      {/* Empty state */}
      {!loading && !error && isEmpty && (
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", fontStyle: "italic" }}>{emptyLabel}</p>
      )}

      {/* Content */}
      {!loading && !error && !isEmpty && children}
    </div>
  );
}
