/**
 * DashboardWidgetCard — shared shell for every dashboard widget.
 * Handles the three states every widget needs (spec 3.5.1 step 3, 3.8):
 *   - loading
 *   - error → "Unable to load — tap to retry"
 *   - empty → friendly empty state, never a blank box
 * Deep-links via onClick (spec 3.5.1 step 4 / 3.5.2 step 2).
 *
 * Interaction conventions matched to AlertCard.jsx / PayrollCard.jsx:
 *   - card lifts (var(--shadow-sm) → var(--shadow-md)) on hover, transition 0.2s ease
 *   - the retry button gets the same subtle hover treatment as AlertCard's
 *     "more options" button (background → var(--background), transition 0.15s)
 *   - id attributes are auto-derived from `title` (e.g. "Leave Balance" →
 *     id="leave-balance-widget", retry button → id="retry-leave-balance-btn"),
 *     matching the check-in-btn / apply-leave-btn / run-payroll-btn convention
 *     without requiring every call site to pass one explicitly.
 */
import { ChevronRight, RotateCcw } from "lucide-react";

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function DashboardWidgetCard({
  icon: Icon, title, loading, error, onRetry, onClick,
  iconColor = "var(--primary)", iconBg = "var(--primary-light)",
  isEmpty = false, emptyLabel = "Nothing to show", children, id,
}) {
  const clickable = !!onClick && !loading && !error;
  const slug = slugify(title);
  const cardId = id || `${slug}-widget`;

  return (
    <div
      id={cardId}
      onClick={clickable ? onClick : undefined}
      style={{
        background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)", padding: "16px 18px",
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "var(--radius-sm)", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <p style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text)" }}>{title}</p>
        </div>
        {clickable && <ChevronRight size={15} style={{ color: "var(--subtext)", flexShrink: 0 }} />}
      </div>

      {loading && <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>Loading…</p>}

      {!loading && error && (
        <button
          id={`retry-${slug}-btn`}
          onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none",
            padding: "4px 6px", margin: "-4px -6px", borderRadius: "6px", cursor: "pointer",
            color: "var(--red)", fontSize: "12.5px", fontWeight: 600, transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = "var(--red-light)"; }}
          onMouseLeave={(e) => { e.stopPropagation(); e.currentTarget.style.background = "none"; }}
        >
          <RotateCcw size={13} /> Unable to load — tap to retry
        </button>
      )}

      {!loading && !error && isEmpty && (
        <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>{emptyLabel}</p>
      )}

      {!loading && !error && !isEmpty && children}
    </div>
  );
}