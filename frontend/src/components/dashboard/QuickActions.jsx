import {
  Calendar,
  Clock3,
  Wallet,
  MapPin,
  HeartHandshake,
  Phone,
} from "lucide-react";

const actions = [
  { icon: Calendar,      title: "Accrual History" },
  { icon: Clock3,        title: "Time Tracking" },
  { icon: Wallet,        title: "Est. Balance" },
  { icon: MapPin,        title: "Add Location" },
  { icon: HeartHandshake, title: "Benefits" },
  { icon: Phone,         title: "Contact HR" },
];

export default function QuickActions() {
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
          marginBottom: "16px",
        }}
      >
        Quick Actions
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {actions.map((item, index) => (
          <button
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              padding: "14px 8px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              transition: "background 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
              color: "var(--label)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary-light)";
              e.currentTarget.style.borderColor = "var(--border-focus)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--background)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "var(--primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <item.icon size={18} style={{ color: "var(--primary)" }} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--label)",
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}