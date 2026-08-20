// Sign-in page — supports both email/password and role-based quick access.
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS } from "../../context/AuthContext";
import Spinner from "../../components/shared/Spinner";

/* ─── Feature bullets shown on the left panel ───────── */
const FEATURES = [
  { icon: "👥", text: "Manage 23+ HR modules in one place" },
  { icon: "📊", text: "Real-time analytics & reporting" },
  { icon: "🔒", text: "Role-based access control" },
  { icon: "⚡", text: "Automated payroll & compliance" },
];

/* ─── Component ─────────────────────────────────────── */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e, creds) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(creds?.email || email, creds?.password || password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#0d1b2a",
    }}>
      {/* ── Left decorative panel (hidden on small screens via inline media trick) ── */}
      <div style={{
        flex: "0 0 45%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 56px",
        background: "linear-gradient(145deg, #0d1b2a 0%, #0f2539 50%, #0c1f30 100%)",
        position: "relative",
        overflow: "hidden",
      }}
        className="login-left-panel"
      >
        {/* Background decorative circles */}
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,118,110,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-60px",
          width: "260px", height: "260px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "52px" }}>
          <img
            src="/logo.png"
            alt="Proteccio HRMS"
            style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(15,118,110,0.5))" }}
          />
          <div>
            <p style={{ fontWeight: 800, fontSize: "20px", color: "#f0f9ff", letterSpacing: "-0.3px" }}>Proteccio HRMS</p>
            <p style={{ fontSize: "12px", color: "#8ba3b8", marginTop: "1px" }}>Enterprise Suite</p>
          </div>
        </div>

        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#f0f9ff", lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: "16px" }}>
          Your complete<br />
          <span style={{ color: "#2dd4bf" }}>HR platform.</span>
        </h1>

        <p style={{ fontSize: "15px", color: "#8ba3b8", lineHeight: 1.7, marginBottom: "44px", maxWidth: "360px" }}>
          Everything your team needs — from payroll to performance — in one powerful, easy-to-use suite.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "rgba(15,118,110,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "17px", flexShrink: 0,
              }}>
                {f.icon}
              </span>
              <p style={{ fontSize: "14px", color: "#b0c8d8", fontWeight: 500 }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ position: "absolute", bottom: "28px", left: "56px", fontSize: "11px", color: "#5a7a8e" }}>
          © 2026 Proteccio HRMS · Enterprise Grade Security
        </p>
      </div>

      {/* ── Right panel: login form ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "#f0f4f8",
        overflowY: "auto",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          animation: "slideUp 0.35s ease",
        }}>
          {/* Card */}
          <div style={{
            background: "#fff",
            borderRadius: "20px",
            boxShadow: "0 4px 32px rgba(13,27,42,0.10), 0 1px 6px rgba(13,27,42,0.06)",
            padding: "40px 36px",
            border: "1px solid rgba(13,27,42,0.06)",
          }}>
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0e1e2c", letterSpacing: "-0.3px" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: "13.5px", color: "#5a7a8e", marginTop: "6px" }}>
                Sign in to your work account to continue.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                background: "#fef2f2", color: "#dc2626",
                borderRadius: "10px", padding: "12px 16px",
                fontSize: "13px", fontWeight: 600,
                marginBottom: "20px",
                border: "1px solid #fecaca",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#3d5a70", letterSpacing: "0.1px" }}>
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={inputStyle}
                  onFocus={(e) => applyFocus(e)}
                  onBlur={(e) => removeFocus(e)}
                />
              </div>

              {/* Password with show/hide toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#3d5a70", letterSpacing: "0.1px" }}>
                  Password
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ ...inputStyle, paddingRight: "44px" }}
                    onFocus={(e) => applyFocus(e)}
                    onBlur={(e) => removeFocus(e)}
                  />
                  {/* Show / Hide toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: "12px",
                      background: "transparent", border: "none",
                      cursor: "pointer", color: "#5a7a8e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "4px", borderRadius: "6px",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#0f766e")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#5a7a8e")}
                  >
                    {showPassword ? (
                      // Eye-off icon (password visible → click to hide)
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      // Eye icon (password hidden → click to show)
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: "4px",
                  height: "46px", border: "none", borderRadius: "12px",
                  background: busy ? "#6ba3a0" : "var(--primary)",
                  color: "#fff", fontWeight: 700, fontSize: "14.5px",
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
                  boxShadow: busy ? "none" : "0 4px 16px rgba(15,118,110,0.3)",
                }}
                onMouseEnter={(e) => !busy && (e.currentTarget.style.background = "#0d6860")}
                onMouseLeave={(e) => !busy && (e.currentTarget.style.background = "var(--primary)")}
                onMouseDown={(e) => !busy && (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => !busy && (e.currentTarget.style.transform = "scale(1)")}
              >
                {busy ? <Spinner size={18} /> : "Sign In →"}
              </button>
            </form>

            {/* ── Quick sign-in ── */}
            <div style={{ marginTop: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ flex: 1, height: "1px", background: "#dde5ee" }} />
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#8ba3b8", textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>
                  Quick Sign-In
                </span>
                <div style={{ flex: 1, height: "1px", background: "#dde5ee" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.label}
                    type="button"
                    disabled={busy}
                    onClick={() => submit(null, acc)}
                    style={{
                      padding: "10px 8px",
                      border: "1.5px solid #dde5ee",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      color: "#3d5a70",
                      fontSize: "12.5px", fontWeight: 600,
                      cursor: busy ? "not-allowed" : "pointer",
                      transition: "border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0f766e";
                      e.currentTarget.style.background = "#f0fdfa";
                      e.currentTarget.style.color = "#0f766e";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,118,110,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dde5ee";
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.color = "#3d5a70";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Continue as {acc.label}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: "11px", color: "#8ba3b8", marginTop: "12px", textAlign: "center" }}>
                Use your assigned credentials or select a role above to explore.
                <br />
                Use <span style={{ fontWeight: "bold" }}>Password@123</span> as password to login.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Responsive: hide left panel on narrow screens ── */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Shared input style ─────────────────────────────── */
const inputStyle = {
  width: "100%",
  height: "44px",
  padding: "0 14px",
  border: "1.5px solid #dde5ee",
  borderRadius: "10px",
  fontSize: "14px",
  color: "#0e1e2c",
  background: "#f8fafc",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
};

/* ─── Focus helpers ──────────────────────────────────── */
function applyFocus(e) {
  e.target.style.borderColor = "#0f766e";
  e.target.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.12)";
  e.target.style.background = "#ffffff";
}
function removeFocus(e) {
  e.target.style.borderColor = "#dde5ee";
  e.target.style.boxShadow = "none";
  e.target.style.background = "#f8fafc";
}
