import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) return setError("New passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      await logout();
      navigate("/login", { replace: true, state: { message: "Password updated. Sign in with your new password." } });
    } catch (err) {
      setError(err.message || "Unable to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f0f4f8", padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 440, background: "white", border: "1px solid #dbe4ec", borderRadius: 16, padding: 32, boxShadow: "0 10px 35px rgba(15,23,42,.08)" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Change your password</h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>Your administrator or password-expiry policy requires a new password.</p>
        {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        {[
          ["Current password", currentPassword, setCurrentPassword],
          ["New password", newPassword, setNewPassword],
          ["Confirm new password", confirmPassword, setConfirmPassword],
        ].map(([label, value, setter]) => (
          <label key={label} style={{ display: "block", marginBottom: 16, fontWeight: 600, fontSize: 13 }}>
            {label}
            <input type="password" required value={value} onChange={(e) => setter(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
          </label>
        ))}
        <button disabled={busy} style={{ width: "100%", border: 0, borderRadius: 8, padding: 12, color: "white", background: "#0f766e", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
