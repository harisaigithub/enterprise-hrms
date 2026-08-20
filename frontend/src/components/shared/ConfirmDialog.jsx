/**
 * ConfirmDialog — used for all destructive / high-impact actions
 * Implements the "confirmation step" from Golden Rule #7.
 *
 * Usage:
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Run Payroll"
 *   message="This will process payroll for 62 employees. This action requires a second approver."
 *   confirmLabel="Yes, Run Payroll"
 *   danger
 *   onConfirm={handleRunPayroll}
 *   onCancel={() => setShowConfirm(false)}
 * />
 */

import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-xl)",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "var(--shadow-lg)",
          animation: "dialog-in 0.18s ease",
        }}
      >
        <style>{`
          @keyframes dialog-in {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius)",
                background: danger ? "var(--red-light)" : "var(--amber-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} style={{ color: danger ? "var(--red)" : "var(--amber)" }} />
            </div>
            <div>
              <p id="confirm-dialog-title" style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>
                {title}
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", padding: "2px" }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "13.5px", color: "var(--subtext)", lineHeight: 1.6, marginBottom: "24px" }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "none",
              color: "var(--label)",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: danger ? "var(--red)" : "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
