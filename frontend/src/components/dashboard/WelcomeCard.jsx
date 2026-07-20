/**
 * WelcomeCard — reads from AuthContext for the real logged-in user's name.
 */

import { useAuth } from "../../context/AuthContext";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeCard() {
  const { user } = useAuth();

  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px", lineHeight: 1.3 }}>
        {getGreeting()}, {user.firstName} 👋
      </h1>
      <p style={{ color: "var(--subtext)", fontSize: "14.5px", marginTop: "5px", fontWeight: 400 }}>
        Here's what needs your attention today
      </p>
    </div>
  );
}