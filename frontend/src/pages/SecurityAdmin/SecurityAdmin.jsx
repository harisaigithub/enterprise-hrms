/**
 * Security & Administration Page — Module 25
 * Tabs: Users & Roles · Authentication & Access · Encryption & Backup · Audit Log
 */

import { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  KeyRound,
  ScrollText,
  Plus,
  AlertTriangle,
  Lock,
  Unlock,
  LogOut,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  DatabaseBackup,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getRoles,
  grantPermission,
  revokePermission,
  deleteRole,
  createCustomRole,
  setRoleMfa,
  getUsers,
  createUser,
  deactivateUser,
  forcePasswordReset,
  revokeAllSessions,
  useBreakGlass,
  getSessions,
  getSecurityConfig,
  updatePasswordPolicy,
  updateSsoConfig,
  updateIpRestriction,
  getKmsConfig,
  rotateKmsKey,
  getBackupJobs,
  getRestoreRequests,
  requestRestore,
  approveRestore,
  executeRestore,
  getAuditLog,
  verifyAuditChain,
} from "../../services/securityService";
import { PERMISSION_CATALOG, MFA_RESTRICTED_ROLE_IDS, userStatusMeta, severityMeta } from "../../mock/security";

const ME_NAME = "Matsya Singh";
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

/* ---------------------------------- shared bits ---------------------------------- */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle() {
  return {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)",
    outline: "none", background: "var(--card)", fontFamily: "inherit",
  };
}

function fieldLabel(text) {
  return <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{text}</label>;
}

function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
      background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
      fontWeight: 600, fontSize: "13px", cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.6 : 1, ...props.style,
    }}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button {...props} style={{
      padding: "9px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
      background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer", ...props.style,
    }}>
      {children}
    </button>
  );
}

function DangerButton({ children, ...props }) {
  return (
    <button {...props} style={{
      padding: "9px 16px", border: "1px solid var(--red)", borderRadius: "var(--radius-sm)",
      background: "none", color: "var(--red)", fontWeight: 600, fontSize: "13px", cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.6 : 1, ...props.style,
    }}>
      {children}
    </button>
  );
}

function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", marginBottom: "22px", overflowX: "auto" }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
            border: "none", borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
            background: "none", color: isActive ? "var(--primary)" : "var(--subtext)",
            fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Users & Roles tab ---------------------------------- */

function CreateUserModal({ isOpen, onClose, roles, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !roleId) return;
    setSaving(true);
    const res = await createUser({ name: name.trim(), email: email.trim(), roleIds: [roleId] }, ME_NAME);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setName(""); setEmail("");
  };

  return (
    <Modal isOpen={isOpen} title="Create User Account" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Email *")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Role *")}
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>Activation notification will be sent to the user; this action is itself audit-logged.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Creating…" : "Create User"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function BreakGlassModal({ isOpen, onClose, onUsed }) {
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await useBreakGlass(justification.trim(), ME_NAME);
    setSaving(false);
    if (res.data.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onUsed(res.data);
    onClose();
    setJustification("");
  };

  return (
    <Modal isOpen={isOpen} title="Emergency Break-Glass Access" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <AlertTriangle size={16} style={{ color: "var(--red)", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
            Use only if SSO/IdP is unreachable. This action is always logged as critical severity and triggers a security alert — it can never be used silently.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Justification *")}
          <textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <DangerButton type="submit" disabled={saving || !justification.trim()}>{saving ? "Logging in…" : "Use Break-Glass Access"}</DangerButton>
        </div>
      </form>
    </Modal>
  );
}

function UsersPanel({ users, roles, sessions, onUserUpdated, onUserAdded, onBreakGlassAlert }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);

  const roleName = (roleIds) => roleIds.map((id) => roles.find((r) => r.id === id)?.name || id).join(", ");
  const sessionCount = (userId) => sessions.filter((s) => s.userId === userId).length;

  const handleDeactivate = async (userId) => {
    const res = await deactivateUser(userId, ME_NAME);
    if (res.data.user) onUserUpdated(res.data.user);
  };
  const handleForceReset = async (userId) => {
    const res = await forcePasswordReset(userId, ME_NAME);
    if (res.data.user) onUserUpdated(res.data.user);
  };
  const handleRevokeSessions = async (userId) => {
    await revokeAllSessions(userId, ME_NAME);
    onUserUpdated(users.find((u) => u.id === userId));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>User Accounts</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <SecondaryButton onClick={() => setShowBreakGlass(true)} style={{ color: "var(--red)", borderColor: "var(--red)" }}>
            <ShieldAlert size={14} /> Break-Glass Access
          </SecondaryButton>
          <PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Create User</PrimaryButton>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {users.map((u) => {
          const meta = userStatusMeta[u.status];
          return (
            <div key={u.id} style={{ ...cardStyle, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {u.name}{u.isBreakGlass && <ShieldAlert size={13} style={{ color: "var(--red)" }} />}
                </p>
                <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{u.email} · {roleName(u.roleIds)}</p>
                <p style={{ fontSize: "11px", color: "var(--subtext)" }}>
                  MFA: {u.mfaEnabled ? "On" : "Off"} · {sessionCount(u.id)} active session(s) · last login {fmtDateTime(u.lastLogin)}
                  {u.forcePasswordResetPending && " · reset pending"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <StatusBadge label={u.status} color={meta.color} bg={meta.bg} />
                {u.status === "Active" && !u.isBreakGlass && (
                  <>
                    <button onClick={() => handleForceReset(u.id)} title="Force password reset" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--subtext)" }}><Lock size={15} /></button>
                    <button onClick={() => handleRevokeSessions(u.id)} title="Revoke all sessions" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--subtext)" }}><LogOut size={15} /></button>
                    <button onClick={() => handleDeactivate(u.id)} title="Deactivate" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--red)" }}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} roles={roles} onSaved={onUserAdded} />
      <BreakGlassModal isOpen={showBreakGlass} onClose={() => setShowBreakGlass(false)} onUsed={onBreakGlassAlert} />
    </div>
  );
}

function GrantPermissionModal({ isOpen, onClose, role, onSaved }) {
  const [permission, setPermission] = useState("");
  const [saving, setSaving] = useState(false);

  const available = role ? PERMISSION_CATALOG.filter((p) => !role.permissions.includes(p)) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!permission) return;
    setSaving(true);
    const res = await grantPermission(role.id, permission, ME_NAME);
    setSaving(false);
    if (res.data.role) onSaved(res.data.role);
    onClose();
    setPermission("");
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} title={`Grant Permission — ${role.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Permission *")}
          <select value={permission} onChange={(e) => setPermission(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            <option value="">Select permission</option>
            {available.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>This grant is an explicit, logged action.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !permission}>{saving ? "Granting…" : "Grant"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function MfaExceptionModal({ isOpen, onClose, role, onSaved }) {
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await setRoleMfa(role.id, false, { reason: reason.trim(), approvedBy: approvedBy.trim() }, ME_NAME);
    setSaving(false);
    if (res.data.error) {
      setError(res.data.error);
      return;
    }
    setError("");
    onSaved(res.data.role);
    onClose();
    setReason(""); setApprovedBy("");
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} title={`Disable MFA — ${role.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <AlertTriangle size={16} style={{ color: "#d97706", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
            {role.name} is a restricted role — MFA cannot be disabled without a documented, logged exception.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reason *")}
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Approved By *")}
          <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} style={inputStyle()} />
        </div>
        {error && <p style={{ fontSize: "12px", color: "var(--red)" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Log Exception & Disable"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RolesPanel({ roles, onRoleUpdated, onRoleAdded }) {
  const [grantTarget, setGrantTarget] = useState(null);
  const [mfaExceptionTarget, setMfaExceptionTarget] = useState(null);
  const [deleteError, setDeleteError] = useState({});
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleRevoke = async (roleId, permission) => {
    const res = await revokePermission(roleId, permission, ME_NAME);
    if (res.data.role) onRoleUpdated(res.data.role);
  };

  const handleToggleMfa = async (role) => {
    if (MFA_RESTRICTED_ROLE_IDS.includes(role.id) && role.mfaEnabled) {
      setMfaExceptionTarget(role);
      return;
    }
    const res = await setRoleMfa(role.id, !role.mfaEnabled, {}, ME_NAME);
    if (res.data.role) onRoleUpdated(res.data.role);
  };

  const handleDelete = async (roleId) => {
    const res = await deleteRole(roleId, ME_NAME);
    if (res.data.error) {
      setDeleteError((prev) => ({ ...prev, [roleId]: res.data.error }));
      return;
    }
    setDeleteError((prev) => ({ ...prev, [roleId]: null }));
    onRoleUpdated({ id: roleId, __deleted: true });
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    const res = await createCustomRole(newRoleName.trim(), ME_NAME);
    setCreating(false);
    onRoleAdded(res.data);
    setNewRoleName("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Roles & Permissions</h2>
      </div>

      <div style={{ ...cardStyle, padding: "14px 18px", marginBottom: "14px", display: "flex", gap: "10px" }}>
        <input placeholder="New custom role name (starts with zero permissions)" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} style={inputStyle()} />
        <PrimaryButton onClick={handleCreateRole} disabled={creating || !newRoleName.trim()} style={{ whiteSpace: "nowrap" }}>{creating ? "Creating…" : "+ Custom Role"}</PrimaryButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
        {roles.map((role) => (
          <div key={role.id} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{role.name}{role.isCustom && <span style={{ fontSize: "10px", color: "var(--subtext)", fontWeight: 600 }}> (custom)</span>}</h3>
              <button onClick={() => handleToggleMfa(role)} title={role.mfaEnabled ? "MFA enforced" : "MFA not enforced"} style={{ border: "none", background: "none", cursor: "pointer", color: role.mfaEnabled ? "var(--green)" : "var(--subtext)" }}>
                {role.mfaEnabled ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
            {role.mfaException && (
              <p style={{ fontSize: "10.5px", color: "#d97706", marginBottom: "8px" }}>
                MFA exception on file: "{role.mfaException.reason}" — approved by {role.mfaException.approvedBy}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {role.permissions.length === 0 ? (
                <span style={{ fontSize: "11px", color: "var(--subtext)", fontStyle: "italic" }}>No permissions granted yet</span>
              ) : (
                role.permissions.map((p) => (
                  <span key={p} onClick={() => handleRevoke(role.id, p)} title="Click to revoke" style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px", cursor: "pointer" }}>
                    {p} ✕
                  </span>
                ))
              )}
            </div>
            {deleteError[role.id] && <p style={{ fontSize: "11px", color: "var(--red)", marginBottom: "8px" }}>{deleteError[role.id]}</p>}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setGrantTarget(role)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>+ Grant permission</button>
              <button onClick={() => handleDelete(role.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>Delete role</button>
            </div>
          </div>
        ))}
      </div>

      <GrantPermissionModal isOpen={!!grantTarget} onClose={() => setGrantTarget(null)} role={grantTarget} onSaved={onRoleUpdated} />
      <MfaExceptionModal isOpen={!!mfaExceptionTarget} onClose={() => setMfaExceptionTarget(null)} role={mfaExceptionTarget} onSaved={onRoleUpdated} />
    </div>
  );
}

/* ---------------------------------- Authentication & Access tab ---------------------------------- */

function AuthAccessTab({ config, onConfigUpdated }) {
  const [minLength, setMinLength] = useState(config.passwordPolicy.minLength);
  const [expiryDays, setExpiryDays] = useState(config.passwordPolicy.expiryDays);
  const [cidrs, setCidrs] = useState(config.ipRestrictions[0]?.allowedCidrs.join(", ") || "");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingIp, setSavingIp] = useState(false);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    const res = await updatePasswordPolicy({ minLength: Number(minLength), expiryDays: Number(expiryDays) }, ME_NAME);
    setSavingPolicy(false);
    onConfigUpdated({ ...config, passwordPolicy: res.data });
  };

  const handleSaveIp = async () => {
    setSavingIp(true);
    const list = cidrs.split(",").map((c) => c.trim()).filter(Boolean);
    const res = await updateIpRestriction(config.ipRestrictions[0].id, list, true, ME_NAME);
    setSavingIp(false);
    onConfigUpdated({ ...config, ipRestrictions: config.ipRestrictions.map((r) => (r.id === res.data.id ? res.data : r)) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Single Sign-On</h3>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>
          {config.ssoConfig.enabled ? `Enabled — ${config.ssoConfig.provider}` : "Disabled"} · metadata: {config.ssoConfig.metadataUrl}
        </p>
        <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "4px" }}>Last synced {config.ssoConfig.lastSyncedAt}</p>
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Password Policy</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Minimum Length")}
            <input type="number" min={8} value={minLength} onChange={(e) => setMinLength(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Expiry (days)")}
            <input type="number" min={1} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginBottom: "12px" }}>
          Requires uppercase: {config.passwordPolicy.requireUpper ? "Yes" : "No"} · number: {config.passwordPolicy.requireNumber ? "Yes" : "No"} · symbol: {config.passwordPolicy.requireSymbol ? "Yes" : "No"}
        </p>
        <PrimaryButton onClick={handleSavePolicy} disabled={savingPolicy} style={{ padding: "7px 14px", fontSize: "12px" }}>{savingPolicy ? "Saving…" : "Save Policy"}</PrimaryButton>
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>IP Restrictions — {config.ipRestrictions[0]?.action}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
          {fieldLabel("Allowed CIDR ranges (comma-separated)")}
          <input value={cidrs} onChange={(e) => setCidrs(e.target.value)} style={inputStyle()} />
        </div>
        <PrimaryButton onClick={handleSaveIp} disabled={savingIp} style={{ padding: "7px 14px", fontSize: "12px" }}>{savingIp ? "Saving…" : "Save Restriction"}</PrimaryButton>
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>Session Policy</h3>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>
          Token lifetime: {config.sessionPolicy.tokenLifetimeMinutes} minutes · Max concurrent sessions: {config.sessionPolicy.maxConcurrentSessions}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------- Encryption & Backup tab ---------------------------------- */

function RequestRestoreModal({ isOpen, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    const res = await requestRestore(reason.trim(), ME_NAME);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setReason("");
  };

  return (
    <Modal isOpen={isOpen} title="Request Restore" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>Restores require two distinct approvers before execution, given the risk of overwriting live data.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reason *")}
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Requesting…" : "Request Restore"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EncryptionBackupTab({ kmsConfig, backupJobs, restoreRequests, onKmsUpdated, onRestoreUpdated, onRestoreAdded }) {
  const [rotating, setRotating] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [approverName, setApproverName] = useState("");

  const handleRotate = async () => {
    setRotating(true);
    const res = await rotateKmsKey(ME_NAME);
    setRotating(false);
    onKmsUpdated(res.data);
  };

  const handleApprove = async (requestId) => {
    if (!approverName.trim()) return;
    const res = await approveRestore(requestId, approverName.trim(), ME_NAME);
    if (res.data.request) onRestoreUpdated(res.data.request);
    setApproverName("");
  };

  const handleExecute = async (requestId) => {
    const res = await executeRestore(requestId, ME_NAME);
    if (res.data.request) onRestoreUpdated(res.data.request);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
          <KeyRound size={15} /> Encryption Key Management
        </h3>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>
          Provider: {kmsConfig.provider} · Rotation every {kmsConfig.keyRotationDays} days · Last rotated {kmsConfig.lastRotatedAt}
        </p>
        <PrimaryButton onClick={handleRotate} disabled={rotating} style={{ padding: "7px 14px", fontSize: "12px" }}>{rotating ? "Rotating…" : "Rotate Key Now"}</PrimaryButton>
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <DatabaseBackup size={15} /> Backup Job History
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {backupJobs.map((b) => (
            <p key={b.id} style={{ fontSize: "12px", color: "var(--subtext)" }}>
              {fmtDateTime(b.startedAt)} · <strong>{b.status}</strong>{b.sizeMB ? ` · ${b.sizeMB.toLocaleString("en-IN")} MB` : ""} · encrypted
            </p>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "10px", fontStyle: "italic" }}>Backup contents are never available for direct plaintext download — restore is the only retrieval path.</p>
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>Restore Requests</h3>
          <SecondaryButton onClick={() => setShowRequest(true)} style={{ padding: "6px 12px", fontSize: "12px" }}>+ Request Restore</SecondaryButton>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {restoreRequests.map((r) => (
            <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>{r.reason}</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Requested by {r.requestedBy} · {r.status}</p>
              {r.approvals.length > 0 && (
                <p style={{ fontSize: "11px", color: "var(--subtext)" }}>Approved by: {r.approvals.map((a) => a.by).join(", ")}</p>
              )}
              {r.status.startsWith("Pending") && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input placeholder="Your name (approver)" value={approverName} onChange={(e) => setApproverName(e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
                  <PrimaryButton onClick={() => handleApprove(r.id)} disabled={!approverName.trim()} style={{ padding: "7px 14px", fontSize: "12px" }}>Approve</PrimaryButton>
                </div>
              )}
              {r.status === "Approved — Ready to Execute" && (
                <PrimaryButton onClick={() => handleExecute(r.id)} style={{ padding: "7px 14px", fontSize: "12px", marginTop: "8px" }}>Execute Restore</PrimaryButton>
              )}
              {r.status === "Restored" && (
                <p style={{ fontSize: "11px", color: "var(--green)", marginTop: "6px", display: "flex", alignItems: "center", gap: "5px" }}><CheckCircle2 size={12} /> Restored by {r.executedBy} on {fmtDateTime(r.executedAt)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <RequestRestoreModal isOpen={showRequest} onClose={() => setShowRequest(false)} onSaved={onRestoreAdded} />
    </div>
  );
}

/* ---------------------------------- Audit Log tab ---------------------------------- */

function AuditLogTab({ entries, onRefresh }) {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const handleVerify = async () => {
    setVerifying(true);
    const res = await verifyAuditChain();
    setVerifying(false);
    setVerifyResult(res.data);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Audit Log</h2>
        <SecondaryButton onClick={handleVerify} disabled={verifying} style={{ padding: "7px 14px", fontSize: "12px" }}>
          {verifying ? "Verifying…" : "Verify Chain Integrity"}
        </SecondaryButton>
      </div>

      {verifyResult && (
        <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: "14px", background: verifyResult.valid ? "#f0fdf4" : "#fef2f2", border: `1px solid ${verifyResult.valid ? "#bbf7d0" : "#fecaca"}` }}>
          <p style={{ fontSize: "12.5px", fontWeight: 600, color: verifyResult.valid ? "#166534" : "var(--red)" }}>
            {verifyResult.valid ? "✓ Chain is intact — no tampering detected." : `✗ Chain integrity broken at entry ${verifyResult.brokenAtId}.`}
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((e) => {
            const meta = severityMeta[e.severity];
            return (
              <div key={e.id} style={{ ...cardStyle, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{e.action}</p>
                  <StatusBadge label={e.severity} color={meta.color} bg={meta.bg} />
                </div>
                <p style={{ fontSize: "12px", color: "var(--subtext)" }}>{e.details}</p>
                <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "4px" }}>{e.actor} · {e.category} · {fmtDateTime(e.timestamp)} · hash {e.hash}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "users", label: "Users & Roles", icon: Users },
  { key: "auth", label: "Authentication & Access", icon: ShieldCheck },
  { key: "encryption", label: "Encryption & Backup", icon: KeyRound },
  { key: "audit", label: "Audit Log", icon: ScrollText },
];

export default function Security() {
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState(null);
  const [kmsConfig, setKmsConfig] = useState(null);
  const [backupJobs, setBackupJobs] = useState([]);
  const [restoreRequests, setRestoreRequests] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [breakGlassAlert, setBreakGlassAlert] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsers(), getRoles(), getSessions(), getSecurityConfig(),
      getKmsConfig(), getBackupJobs(), getRestoreRequests(), getAuditLog(),
    ])
      .then(([u, r, s, c, kms, bk, rr, al]) => {
        setUsers(u.data); setRoles(r.data); setSessions(s.data); setConfig(c.data);
        setKmsConfig(kms.data); setBackupJobs(bk.data); setRestoreRequests(rr.data); setAuditEntries(al.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshAuditLog = () => getAuditLog().then((res) => setAuditEntries(res.data));

  const handleUserUpdated = (u) => {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    getSessions().then((res) => setSessions(res.data));
    refreshAuditLog();
  };
  const handleUserAdded = (u) => {
    setUsers((prev) => [u, ...prev]);
    refreshAuditLog();
  };
  const handleBreakGlassAlert = (result) => {
    setBreakGlassAlert(result.entry);
    setUsers((prev) => prev.map((u) => (u.isBreakGlass ? { ...u, lastLogin: result.entry.timestamp } : u)));
    refreshAuditLog();
  };

  const handleRoleUpdated = (r) => {
    if (r.__deleted) {
      setRoles((prev) => prev.filter((x) => x.id !== r.id));
    } else {
      setRoles((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    }
    refreshAuditLog();
  };
  const handleRoleAdded = (r) => {
    setRoles((prev) => [...prev, r]);
    refreshAuditLog();
  };

  const handleConfigUpdated = (c) => {
    setConfig(c);
    refreshAuditLog();
  };

  const handleKmsUpdated = (k) => {
    setKmsConfig(k);
    refreshAuditLog();
  };
  const handleRestoreUpdated = (r) => {
    setRestoreRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    refreshAuditLog();
  };
  const handleRestoreAdded = (r) => {
    setRestoreRequests((prev) => [r, ...prev]);
    refreshAuditLog();
  };

  if (loading) {
    return (
      <MainLayout>
        <Spinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Security & Administration" subtitle="Users, roles, authentication policy, and system-wide security configuration" />

        {breakGlassAlert && (
          <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: "16px", background: "#fef2f2", border: "1px solid #fecaca", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={16} style={{ color: "var(--red)" }} />
              <span style={{ fontSize: "12.5px", color: "#991b1b", fontWeight: 600 }}>Security alert: break-glass access was just used — {breakGlassAlert.details}</span>
            </div>
            <button onClick={() => setBreakGlassAlert(null)} style={{ fontSize: "12px", color: "#991b1b", border: "none", background: "none", cursor: "pointer", fontWeight: 700 }}>Dismiss</button>
          </div>
        )}

        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <UsersPanel users={users} roles={roles} sessions={sessions} onUserUpdated={handleUserUpdated} onUserAdded={handleUserAdded} onBreakGlassAlert={handleBreakGlassAlert} />
            <RolesPanel roles={roles} onRoleUpdated={handleRoleUpdated} onRoleAdded={handleRoleAdded} />
          </div>
        )}

        {activeTab === "auth" && config && (
          <AuthAccessTab config={config} onConfigUpdated={handleConfigUpdated} />
        )}

        {activeTab === "encryption" && kmsConfig && (
          <EncryptionBackupTab
            kmsConfig={kmsConfig}
            backupJobs={backupJobs}
            restoreRequests={restoreRequests}
            onKmsUpdated={handleKmsUpdated}
            onRestoreUpdated={handleRestoreUpdated}
            onRestoreAdded={handleRestoreAdded}
          />
        )}

        {activeTab === "audit" && (
          <AuditLogTab entries={auditEntries} onRefresh={refreshAuditLog} />
        )}
      </div>
    </MainLayout>
  );
}