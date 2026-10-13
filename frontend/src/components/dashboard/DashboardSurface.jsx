/**
 * DashboardSurface — role-aware dashboard renderer + customization mode.
 *
 * - Loads the user's saved layout from the backend (validated server-side
 *   against their role/permissions) and renders widgets from the shared
 *   registry. No per-role hardcoded dashboards.
 * - Edit mode: add from gallery, remove, reorder (drag + keyboard buttons),
 *   resize (sm/md/lg), reset to default, preview, then Save or Cancel.
 * - A failed widget never breaks the surface; each widget owns its own
 *   loading/error state via DashboardWidgetCard.
 */
import { useState, useMemo, useCallback, useRef } from "react";
import {
  Settings2, X, Save, RotateCcw, GripVertical, ArrowUp, ArrowDown,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";
import { resolveWidget } from "../../dashboard/widgetRegistry";
import DashboardWidgetGallery from "./DashboardWidgetGallery";
import Spinner from "../shared/Spinner";
import "./dashboard-surface.css";

const SIZE_LABEL = { sm: "Small", md: "Medium", lg: "Wide" };

function EditToolbar({ saving, saveError, onSave, onCancel, onReset }) {
  return (
    <div className="dash-edit-toolbar" role="toolbar" aria-label="Dashboard customization controls">
      <div className="dash-edit-toolbar-left">
        <span className="dash-edit-badge"><Settings2 size={13} /> Customizing — changes are not saved yet</span>
      </div>
      <div className="dash-edit-toolbar-actions">
        <button type="button" className="dash-btn" onClick={onReset} disabled={saving}>
          <RotateCcw size={14} /> Reset to default
        </button>
        <button type="button" className="dash-btn" onClick={onCancel} disabled={saving}>
          <X size={14} /> Cancel
        </button>
        <button type="button" className="dash-btn dash-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="dash-spin" /> : <Save size={14} />} Save layout
        </button>
      </div>
      {saveError && (
        <p className="dash-save-error" role="alert"><AlertCircle size={13} /> {saveError} — your changes are still here, try again.</p>
      )}
    </div>
  );
}

function WidgetFrame({ entry, meta, editMode, onRemove, onSizeChange, onMove, dragProps, isDragging }) {
  // Static registry lookup (id → pre-imported component), not a render-time factory.
  const WidgetComponent = resolveWidget(entry.id);
  if (!WidgetComponent) return null; // unknown/deleted widget — skip gracefully
  return (
    <div
      role="listitem"
      className={`dash-cell dash-size-${entry.size}${editMode ? " dash-cell-edit" : ""}${isDragging ? " dash-dragging" : ""}`}
      {...dragProps}
    >
      {editMode && (
        <div className="dash-cell-editbar">
          <span className="dash-drag-handle" aria-hidden="true"><GripVertical size={14} /></span>
          <span className="dash-cell-title">{meta?.title ?? entry.id}</span>
          <div className="dash-cell-controls">
            <button type="button" className="dash-icon-btn" onClick={() => onMove(-1)} aria-label={`Move ${meta?.title ?? entry.id} earlier`}><ArrowUp size={13} /></button>
            <button type="button" className="dash-icon-btn" onClick={() => onMove(1)} aria-label={`Move ${meta?.title ?? entry.id} later`}><ArrowDown size={13} /></button>
            <div className="dash-size-toggle" role="group" aria-label="Widget size">
              {["sm", "md", "lg"].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`dash-size-btn${entry.size === size ? " is-active" : ""}`}
                  onClick={() => onSizeChange(size)}
                  aria-pressed={entry.size === size}
                >
                  {SIZE_LABEL[size]}
                </button>
              ))}
            </div>
            <button type="button" className="dash-icon-btn dash-remove-btn" onClick={() => onRemove()} aria-label={`Remove ${meta?.title ?? entry.id}`}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {/* Registry entries are static imports — not components created during render. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <WidgetComponent />
    </div>
  );
}

export default function DashboardSurface() {
  const {
    loading, error, layout, catalog, defaultLayout, droppedWidgets,
    customized, saving, saveError, retry, save, reset,
  } = useDashboardLayout();

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const dragIndexRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);

  const catalogById = useMemo(() => new Map((catalog ?? []).map((w) => [w.id, w])), [catalog]);

  const enterEdit = useCallback(() => {
    setDraft(layout.map((e) => ({ ...e })));
    setConfirmReset(false);
    setEditMode(true);
  }, [layout]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    setConfirmReset(false);
    dragIndexRef.current = null;
    setDragIndex(null);
  }, []);

  const handleSave = useCallback(async () => {
    const result = await save(draft);
    if (result.ok) {
      setEditMode(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2600);
    }
    // On failure: stay in edit mode with draft intact so nothing is lost.
  }, [draft, save]);

  const handleResetDraft = useCallback(() => setConfirmReset(true), []);
  const applyDefaultDraft = useCallback(() => {
    setDraft(defaultLayout.map((e) => ({ ...e })));
    setConfirmReset(false);
  }, [defaultLayout]);

  const handleResetAndSave = useCallback(async () => {
    const result = await reset();
    if (result.ok) {
      setEditMode(false);
      setConfirmReset(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2600);
    }
  }, [reset]);

  const addToDraft = useCallback((widget) => {
    setDraft((prev) => (prev.some((e) => e.id === widget.id) ? prev : [...prev, { id: widget.id, size: widget.defaultSize ?? "md" }]));
  }, []);
  const removeFromDraft = useCallback((id) => setDraft((prev) => prev.filter((e) => e.id !== id)), []);
  const changeSize = useCallback((id, size) => setDraft((prev) => prev.map((e) => (e.id === id ? { ...e, size } : e))), []);
  const moveDraft = useCallback((index, delta) => {
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  // Drag & drop reorder (edit mode only)
  const onDragStart = useCallback((index) => { dragIndexRef.current = index; setDragIndex(index); }, []);
  const onDragOver = useCallback((event) => { event.preventDefault(); }, []);
  const onDrop = useCallback((index) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragIndex(null);
    if (from === null || from === index) return;
    setDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  }, []);
  const onDragEnd = useCallback(() => { dragIndexRef.current = null; setDragIndex(null); }, []);

  if (loading) {
    return (
      <div className="dash-surface-loading">
        <Spinner size={26} />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-surface-error" role="alert">
        <AlertCircle size={18} />
        <div>
          <p style={{ fontWeight: 700 }}>Could not load your dashboard layout</p>
          <p style={{ fontSize: 12.5, color: "var(--subtext)" }}>Your widgets are safe. Check your connection and try again.</p>
        </div>
        <button type="button" className="dash-btn dash-btn-primary" onClick={retry}>Retry</button>
      </div>
    );
  }

  const visibleLayout = editMode ? draft : layout;
  const layoutIds = new Set(visibleLayout.map((e) => e.id));

  return (
    <div className={`dash-surface${editMode ? " is-editing" : ""}`}>
      <div className="dash-surface-bar">
        <div>
          <h2 className="dash-surface-heading">Your dashboard</h2>
          <p className="dash-surface-sub">
            {customized && !editMode ? "Personalized layout" : "Recommended layout"}
            {" · "}
            {visibleLayout.length} widget{visibleLayout.length === 1 ? "" : "s"}
          </p>
        </div>
        {!editMode && (
          <div className="dash-surface-bar-actions">
            {savedFlash && <span className="dash-saved-flash"><CheckCircle2 size={14} /> Layout saved</span>}
            {droppedWidgets.length > 0 && (
              <span className="dash-dropped-note" title={droppedWidgets.join(", ")}>
                <AlertCircle size={13} /> {droppedWidgets.length} unavailable widget{droppedWidgets.length === 1 ? "" : "s"} removed from your layout
              </span>
            )}
            <button type="button" className="dash-btn" onClick={enterEdit}>
              <Settings2 size={14} /> Customize dashboard
            </button>
          </div>
        )}
      </div>

      {editMode && (
        <EditToolbar
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onCancel={cancelEdit}
          onReset={handleResetDraft}
        />
      )}

      {editMode && confirmReset && (
        <div className="dash-confirm" role="dialog" aria-modal="true" aria-label="Reset dashboard layout">
          <p>Restore the recommended default layout for your role?</p>
          <div className="dash-confirm-actions">
            <button type="button" className="dash-btn" onClick={() => setConfirmReset(false)}>Keep my changes</button>
            <button type="button" className="dash-btn" onClick={applyDefaultDraft}>Reset layout (not saved yet)</button>
            <button type="button" className="dash-btn dash-btn-primary" onClick={handleResetAndSave} disabled={saving}>Reset &amp; save now</button>
          </div>
        </div>
      )}

      <div className="dash-grid" role="list" aria-label="Dashboard widgets">
        {visibleLayout.map((entry, index) => (
          <WidgetFrame
            key={entry.id}
            entry={entry}
            meta={catalogById.get(entry.id)}
            editMode={editMode}
            onRemove={() => removeFromDraft(entry.id)}
            onSizeChange={(size) => changeSize(entry.id, size)}
            onMove={(delta) => moveDraft(index, delta)}
            isDragging={dragIndex === index}
            dragProps={editMode ? {
              draggable: true,
              onDragStart: () => onDragStart(index),
              onDragOver,
              onDrop: () => onDrop(index),
              onDragEnd,
            } : undefined}
          />
        ))}
        {visibleLayout.length === 0 && (
          <p className="dash-empty-layout">No widgets on your dashboard — add some from the gallery below.</p>
        )}
      </div>

      {editMode && (
        <div className="dash-gallery-panel">
          <h3 className="dash-gallery-heading">Add widgets</h3>
          <DashboardWidgetGallery
            catalog={catalog}
            layoutIds={layoutIds}
            onAdd={addToDraft}
            disabled={saving}
          />
        </div>
      )}
    </div>
  );
}
