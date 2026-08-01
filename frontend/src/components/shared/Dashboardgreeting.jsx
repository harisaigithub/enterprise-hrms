export default function DashboardGreeting({ name, subtitle }) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
 
  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: "10px" }}>
        Good {timeOfDay}, {name} <span>👋</span>
      </h1>
      {subtitle && <p style={{ fontSize: "14px", color: "var(--subtext)", marginTop: "4px" }}>{subtitle}</p>}
    </div>
  );
}
 
