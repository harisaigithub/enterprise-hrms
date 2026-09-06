import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) return setError("This password setup link is invalid.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const response = await api.post("/auth/set-password", { token, newPassword: password });
      setMessage(response.data.data.message);
      setPassword("");
      setConfirm("");
    } catch (requestError) {
      setError(requestError.message || "Unable to set password.");
    } finally {
      setBusy(false);
    }
  };

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f0f4f8" }}>
    <section style={{ width: "100%", maxWidth: 430, padding: 32, borderRadius: 18, background: "#fff", border: "1px solid #dde5ee", boxShadow: "0 12px 38px rgba(13,27,42,.1)" }}>
      <h1 style={{ color: "#0e1e2c", fontSize: 24 }}>Set your password</h1>
      <p style={{ margin: "8px 0 22px", color: "#5a7a8e", fontSize: 13, lineHeight: 1.5 }}>Use at least 12 characters with uppercase, lowercase, a number and a symbol. This link works once and expires after 60 minutes.</p>
      {error && <p role="alert" style={{ padding: 10, borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12 }}>{error}</p>}
      {message ? <><p style={{ padding: 10, borderRadius: 8, background: "#ecfdf5", color: "#047857", fontSize: 12 }}>{message}</p><Link to="/login" style={{ display: "inline-block", marginTop: 16, color: "#0f766e", fontWeight: 700 }}>Continue to sign in</Link></> :
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, color: "#3d5a70", fontSize: 12, fontWeight: 700 }}>New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, color: "#3d5a70", fontSize: 12, fontWeight: 700 }}>Confirm password<input type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={(event) => setConfirm(event.target.value)} style={inputStyle} /></label>
          <button disabled={busy} style={{ height: 44, border: 0, borderRadius: 10, background: "#0f766e", color: "#fff", fontWeight: 750, cursor: busy ? "wait" : "pointer" }}>{busy ? "Setting password…" : "Set password"}</button>
        </form>}
    </section>
  </main>;
}

const inputStyle = { height: 44, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" };
