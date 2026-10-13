import { Plus, Check } from "lucide-react";

/**
 * Widget gallery shown while customizing the dashboard. Lists catalog widgets
 * the user may add (not already on the dashboard) with one-click add.
 */
export default function DashboardWidgetGallery({ catalog, layoutIds, onAdd, disabled }) {
  const available = (catalog ?? []).filter((w) => !layoutIds.has(w.id));
  if (available.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "var(--subtext)", fontStyle: "italic" }}>
        Every available widget is already on your dashboard.
      </p>
    );
  }
  return (
    <div className="dash-gallery">
      {available.map((widget) => (
        <div key={widget.id} className="dash-gallery-item">
          <div style={{ minWidth: 0 }}>
            <p className="dash-gallery-title">{widget.title}</p>
            <p className="dash-gallery-desc">{widget.description}</p>
          </div>
          <button
            type="button"
            className="dash-btn dash-btn-add"
            onClick={() => onAdd(widget)}
            disabled={disabled}
            aria-label={`Add ${widget.title} widget`}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      ))}
    </div>
  );
}

export function WidgetAddedHint() {
  return <Check size={14} />;
}
