/**
 * Login Page
 * Real auth against the backend. Shows one-click demo logins (see
 * DEMO_CREDENTIALS.md). Google/Firebase SSO will be added here later.
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS } from "../../context/AuthContext";
import Spinner from "../../components/shared/Spinner";

const inputStyle = {
  width: "100%",
  height: "42px",
  padding: "0 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "14px",
  color: "var(--text)",
  background: "var(--card)",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, var(--sidebar-bg) 0%, #0f172a 55%, var(--primary) 130%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "36px 32px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div
            style={{
              width: "38px", height: "38px", borderRadius: "var(--radius)",
              background: "var(--primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "18px",
            }}
          >
            P
          </div>
          <div>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>Proteccio HRMS</p>
            <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Enterprise Human Resource Suite</p>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "var(--label)", marginBottom: "20px" }}>
          Sign in with your work account to continue.
        </p>

        {error && (
          <div
            style={{
              background: "var(--red-light)", color: "var(--red)",
              borderRadius: "var(--radius-sm)", padding: "10px 14px",
              fontSize: "13px", fontWeight: 600, marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--border-focus)";
                e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--border-focus)";
                e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              height: "44px", border: "none", borderRadius: "var(--radius-sm)",
              background: "var(--primary)", color: "#fff",
              fontWeight: 700, fontSize: "14px", cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => !busy && (e.currentTarget.style.background = "var(--primary-hover)")}
            onMouseLeave={(e) => !busy && (e.currentTarget.style.background = "var(--primary)")}
          >
            {busy ? <Spinner size={16} /> : "Sign In"}
          </button>
        </form>

        {/* Demo one-click logins */}
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Demo accounts
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
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
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--background)",
                  color: "var(--label)",
                  fontSize: "12.5px", fontWeight: 600,
                  cursor: busy ? "not-allowed" : "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.background = "var(--primary-light)";
                  e.currentTarget.style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--background)";
                  e.currentTarget.style.color = "var(--label)";
                }}
              >
                Login as {acc.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "10px", textAlign: "center" }}>
            All demo passwords are <strong>Password@123</strong> — see DEMO_CREDENTIALS.md
          </p>
        </div>
      </div>
    </div>
  );
}
