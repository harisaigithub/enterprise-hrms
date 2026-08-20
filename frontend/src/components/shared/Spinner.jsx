/**
 * Spinner — loading indicator
 */

export default function Spinner({ size = 24, color = "var(--primary)" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `3px solid var(--border)`,
          borderTop: `3px solid ${color}`,
          borderRadius: "50%",
          animation: "hrms-spin 0.7s linear infinite",
        }}
      />
      <style>{`
        @keyframes hrms-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
