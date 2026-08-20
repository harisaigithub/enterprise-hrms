/**
 * Modal — generic modal wrapper used by Add Employee, Apply Leave, etc.
 */

import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ isOpen, title, onClose, children, width = "520px" }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    if (isOpen) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-xl)",
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          animation: "dialog-in 0.18s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--card)",
            zIndex: 1,
          }}
        >
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{title}</h2>
          <button
            aria-label="Close modal"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--subtext)",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
