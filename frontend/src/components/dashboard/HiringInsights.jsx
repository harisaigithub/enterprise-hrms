import HiringChart from "./HiringChart";

const stats = [
  { title: "Applicants",     value: "158", growth: "+15.7%", color: "#4f46e5" },
  { title: "Interviewing",   value: "58",  growth: "+7.3%",  color: "#7c3aed" },
  { title: "Offer Extended", value: "32",  growth: "+12.6%", color: "#059669" },
  { title: "Onboarded",      value: "5",   growth: "+89.5%", color: "#0284c7" },
];

export default function HiringInsights() {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "24px",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
          Hiring Insights
        </h2>
        <span style={{ fontSize: "12px", color: "var(--subtext)", fontWeight: 400 }}>
          This week
        </span>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "4px",
        }}
      >
        {stats.map((item) => (
          <div
            key={item.title}
            style={{
              background: "var(--background)",
              borderRadius: "var(--radius)",
              padding: "16px",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "var(--subtext)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: "8px",
              }}
            >
              {item.title}
            </p>

            <p
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: item.color,
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              {item.value}
            </p>

            <span
              style={{
                fontSize: "11.5px",
                color: "var(--green)",
                fontWeight: 600,
                background: "var(--green-light)",
                padding: "2px 7px",
                borderRadius: "99px",
              }}
            >
              ↗ {item.growth}
            </span>
          </div>
        ))}
      </div>

      <HiringChart />
    </div>
  );
}