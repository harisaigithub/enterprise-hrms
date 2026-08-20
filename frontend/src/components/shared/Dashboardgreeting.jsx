/**
 * WelcomeCard (DashboardGreeting) — Hero banner at the top of dashboards.
 *
 * Shows a time-aware greeting, the user's name, and a subtle teal gradient
 * banner with an animated decorative element. Quick stats are shown on the right.
 *
 * Usage (from AuthContext):
 *   <WelcomeCard />
 */
import { useAuth } from "../../context/AuthContext";

export default function WelcomeCard() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
                "Good evening";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0d1b2a 0%, #0f2539 60%, #0f766e 140%)",
        borderRadius: "var(--radius-xl)",
        padding: "28px 32px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        flexWrap: "wrap",
        animation: "slideUp 0.35s ease",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute", right: "-40px", top: "-60px",
        width: "220px", height: "220px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(15,118,110,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: "80px", bottom: "-50px",
        width: "160px", height: "160px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Left: greeting */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: "13px", color: "#8ba3b8", fontWeight: 500, marginBottom: "4px" }}>
          {today}
        </p>
        <h1 style={{
          fontSize: "26px", fontWeight: 800, color: "#f0f9ff",
          letterSpacing: "-0.4px", lineHeight: 1.2,
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          {greeting}, {user?.firstName || "there"} <span>👋</span>
        </h1>
        <p style={{ fontSize: "14px", color: "#8ba3b8", marginTop: "6px" }}>
          Here&apos;s what&apos;s happening across your organization today.
        </p>
      </div>

      {/* Right: quick stats pills */}
      <div style={{
        display: "flex", gap: "12px", flexWrap: "wrap",
        position: "relative", zIndex: 1,
      }}>
        {[
          { label: "Role", value: user?.role || "—" },
          { label: "Dept", value: user?.department || "—" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px",
            padding: "10px 18px",
            textAlign: "center",
            minWidth: "100px",
          }}>
            <p style={{ fontSize: "12px", color: "#8ba3b8", marginBottom: "3px" }}>{s.label}</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#f0f9ff" }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
