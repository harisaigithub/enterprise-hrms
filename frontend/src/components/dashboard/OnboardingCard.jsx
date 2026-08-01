import { useState, useEffect } from "react";
import { UserPlus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOnboardingRecords } from "../../services/onboardingService";

export default function OnboardingCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getOnboardingRecords().then((res) => {
      const items = res.data.flatMap((r) => r.items);
      const complete = items.filter((i) => i.status === "Complete").length;
      setStats({ complete, total: items.length, joiners: res.data.length });
    });
  }, []);

  return (
    <div
      onClick={() => navigate("/onboarding")}
      style={{
        background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)", padding: "18px 20px", cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "var(--radius-sm)", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserPlus size={15} style={{ color: "#0284c7" }} />
          </div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Onboarding</p>
        </div>
        <ChevronRight size={16} style={{ color: "var(--subtext)" }} />
      </div>

      {stats ? (
        <>
          <p style={{ fontSize: "13px", color: "var(--subtext)", marginBottom: "10px" }}>
            <strong style={{ color: "var(--text)" }}>{stats.complete} of {stats.total}</strong> items complete for {stats.joiners} new joiner{stats.joiners !== 1 ? "s" : ""} this week
          </p>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${stats.total ? Math.round((stats.complete / stats.total) * 100) : 0}%`, background: "var(--primary)", borderRadius: "99px" }} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>Loading…</p>
      )}
    </div>
  );
}