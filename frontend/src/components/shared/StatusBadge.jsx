/**
 * StatusBadge — reusable pill badge for any status
 * Usage: <StatusBadge label="Active" color="#16a34a" bg="#f0fdf4" />
 *        <StatusBadge {...attendanceStatusMeta["Present"]} />
 */

export default function StatusBadge({ label, color, bg, size = "sm" }) {
  const fontSize = size === "xs" ? "10px" : "11.5px";
  const padding  = size === "xs" ? "2px 6px" : "3px 10px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize,
        fontWeight: 600,
        color,
        background: bg,
        padding,
        borderRadius: "99px",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
