/**
 * Policy Management Page � Module 18
 * Tabs: Policy Library � My Acknowledgements � Compliance Dashboard
 */

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  BadgeCheck,
  ShieldAlert,
  Plus,
  History,
  CheckCircle2,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getPolicies,
  createPolicy,
  addVersion,
  publishPolicy,
  getAcknowledgements,
  getAllAcknowledgements,
  acknowledgePolicy,
} from "../../services/policyService";
import { policyStatusMeta, ackStatusMeta } from "../../mock/policies";
import { colleagues } from "../../mock/recruitment";

const ME = { id: "EMP001", name: "Matsya Singh" };
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "�");

/* ---------------------------------- shared bits ---------------------------------- */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle(hasError) {
  return {
    width: "100%", padding: "9px 12px",
    border: `1px solid ${hasError ? "var(--red)" : "var(--border)"}`,
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

function currentVersion(policy) {
  return policy.versions.find((v) => v.id === policy.currentVersionId);
}

/* ---------------------------------- Policy Library tab ---------------------------------- */

function CreatePolicyModal({ isOpen, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HR");
  const [scope, setScope] = useState("Company-wide");
  const [mandatory, setMandatory] = useState(true);
  const [reviewCycleMonths, setReviewCycleMonths] = useState(12);
  const [summary, setSummary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [ackDeadlineDays, setAckDeadlineDays] = useState(14);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const versionId = `v-${Date.now()}`;
    const policy = {
      id: `pol-${Date.now()}`,
      title: title.trim(),
      category,
      scope,
      mandatoryAcknowledgement: mandatory,
      reviewCycleMonths: Number(reviewCycleMonths) || null,
      status: "Draft",
      currentVersionId: versionId,
      nextReviewDate: null,
      versions: [{
        id: versionId,
        versionNumber: 1,
        effectiveDate: effectiveDate || null,
        ackDeadlineDays: mandatory ? Number(ackDeadlineDays) || null : null,
        requiresReacknowledgement: true,
        summary: summary.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: ME.name,
      }],
    };
    const res = await createPolicy(policy);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setTitle(""); setSummary(""); setEffectiveDate(""); setAckDeadlineDays(14);
  };

  return (
    <Modal isOpen={isOpen} title="Author New Policy" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Category")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
              {["HR", "Conduct", "IT & Security", "Safety", "Finance"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Scope")}
            <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Company-wide, or e.g. Location: Delhi" style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Summary / Content")}
          <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
          Requires mandatory employee acknowledgement
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Effective Date *")}
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={inputStyle(false)} />
            <p style={{ fontSize: "10.5px", color: "var(--subtext)", margin: 0 }}>Required before this can be published.</p>
          </div>
          {mandatory && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Ack. Deadline (days) *")}
              <input type="number" min={1} value={ackDeadlineDays} onChange={(e) => setAckDeadlineDays(e.target.value)} style={inputStyle(false)} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Review Cycle (months)")}
          <input type="number" min={1} value={reviewCycleMonths} onChange={(e) => setReviewCycleMonths(e.target.value)} style={{ ...inputStyle(false), width: "120px" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Save as Draft"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AddVersionModal({ isOpen, onClose, policy, onSaved }) {
  const [summary, setSummary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [ackDeadlineDays, setAckDeadlineDays] = useState(14);
  const [requiresReacknowledgement, setRequiresReacknowledgement] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!policy) return null;
  const latest = currentVersion(policy);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const version = {
      id: `v-${Date.now()}`,
      versionNumber: latest.versionNumber + 1,
      effectiveDate: effectiveDate || null,
      ackDeadlineDays: policy.mandatoryAcknowledgement ? Number(ackDeadlineDays) || null : null,
      requiresReacknowledgement,
      summary: summary.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: ME.name,
    };
    const res = await addVersion(policy.id, version);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setSummary(""); setEffectiveDate(""); setAckDeadlineDays(14);
  };

  return (
    <Modal isOpen={isOpen} title={`New Version � ${policy.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>
          Version {latest.versionNumber} stays in history unchanged. This creates version {latest.versionNumber + 1} and moves the policy back to Draft until republished.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("What changed?")}
          <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Effective Date *")}
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={inputStyle(false)} />
          </div>
          {policy.mandatoryAcknowledgement && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Ack. Deadline (days) *")}
              <input type="number" min={1} value={ackDeadlineDays} onChange={(e) => setAckDeadlineDays(e.target.value)} style={inputStyle(false)} />
            </div>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
          <input type="checkbox" checked={requiresReacknowledgement} onChange={(e) => setRequiresReacknowledgement(e.target.checked)} />
          Require everyone to re-acknowledge (prior acknowledgements won't carry forward)
        </label>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Create Version"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function VersionHistory({ policy }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: "10px" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", fontWeight: 700, color: "var(--subtext)", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
        <History size={13} /> {open ? "Hide" : "Show"} version history ({policy.versions.length})
      </button>
      {open && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {[...policy.versions].reverse().map((v) => (
            <div key={v.id} style={{ fontSize: "11.5px", color: "var(--text)", background: "var(--background)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
              <strong>v{v.versionNumber}</strong> � effective {fmtDate(v.effectiveDate)} � by {v.createdBy} on {fmtDate(v.createdAt)}
              {v.id === policy.currentVersionId && <span style={{ marginLeft: "6px", color: "var(--primary)", fontWeight: 700 }}>(current)</span>}
              {v.summary && <p style={{ margin: "4px 0 0", color: "var(--subtext)" }}>{v.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyLibraryTab({ policies, onPolicyAdded, onPolicyUpdated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null);
  const [publishError, setPublishError] = useState({});

  const handlePublish = async (id) => {
    const res = await publishPolicy(id);
    if (res.data?.error) {
      setPublishError((p) => ({ ...p, [id]: res.data.error }));
      return;
    }
    setPublishError((p) => ({ ...p, [id]: null }));
    onPolicyUpdated(res.data.policy);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Policy Library</h2>
        <PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Author Policy</PrimaryButton>
      </div>

      {policies.length === 0 ? (
        <EmptyState icon={FileText} title="No policies yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {policies.map((p) => {
            const meta = policyStatusMeta[p.status];
            const v = currentVersion(p);
            return (
              <div key={p.id} style={{ ...cardStyle, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>{p.title}</h3>
                      <span style={{ fontSize: "11px", color: "var(--subtext)" }}>v{v.versionNumber}</span>
                    </div>
                    <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>{p.category} � {p.scope}</p>
                  </div>
                  <StatusBadge label={p.status} color={meta.color} bg={meta.bg} />
                </div>

                {v.summary && <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "10px" }}>{v.summary}</p>}

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                  {p.mandatoryAcknowledgement && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: "99px" }}>Mandatory ack. within {v.ackDeadlineDays}d</span>}
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Effective {fmtDate(v.effectiveDate)}</span>
                  {p.reviewCycleMonths && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Review every {p.reviewCycleMonths}mo</span>}
                </div>

                {publishError[p.id] && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "8px" }}>{publishError[p.id]}</p>}

                <div style={{ display: "flex", gap: "14px", marginTop: "12px" }}>
                  {p.status === "Draft" && (
                    <button onClick={() => handlePublish(p.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Publish</button>
                  )}
                  <button onClick={() => setVersionTarget(p)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>New version</button>
                </div>

                <VersionHistory policy={p} />
              </div>
            );
          })}
        </div>
      )}

      <CreatePolicyModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSaved={onPolicyAdded} />
      <AddVersionModal isOpen={!!versionTarget} onClose={() => setVersionTarget(null)} policy={versionTarget} onSaved={onPolicyUpdated} />
    </div>
  );
}

/* ---------------------------------- My Acknowledgements tab ---------------------------------- */

function AcknowledgeModal({ isOpen, onClose, policy, onSaved }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(null);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledToBottom(true);
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    const v = currentVersion(policy);
    const res = await acknowledgePolicy(policy.id, v.id, ME.id, ME.name);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setScrolledToBottom(false);
  };

  if (!policy) return null;
  const v = currentVersion(policy);

  return (
    <Modal isOpen={isOpen} title={policy.title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0 }}>Version {v.versionNumber} � effective {fmtDate(v.effectiveDate)}</p>
        <div
          ref={contentRef}
          onScroll={handleScroll}
          style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", fontSize: "13px", color: "var(--text)", lineHeight: 1.6, background: "var(--background)" }}
        >
          <p>{v.summary || "Policy content goes here."}</p>
          <p style={{ marginTop: "12px" }}>By acknowledging, you confirm you have read and understood this policy and agree to comply with it for the duration it remains in effect.</p>
          <p style={{ marginTop: "12px", color: "var(--subtext)" }}>� End of document �</p>
        </div>
        {!scrolledToBottom && <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>Scroll to the end to enable acknowledgement.</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton type="button" disabled={!scrolledToBottom || saving} onClick={handleAcknowledge}>
            {saving ? "Recording�" : "I have read and acknowledge"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function MyAcknowledgementsTab({ policies, myAcks, onAcknowledged }) {
  const [target, setTarget] = useState(null);
  const mandatoryPolicies = policies.filter((p) => p.mandatoryAcknowledgement && p.status === "Published");

  const ackFor = (policy) => myAcks.find((a) => a.policyId === policy.id && a.versionId === policy.currentVersionId);

  if (mandatoryPolicies.length === 0) return <EmptyState icon={BadgeCheck} title="Nothing to acknowledge right now" />;

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>My Acknowledgements</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
        {mandatoryPolicies.map((p) => {
          const ack = ackFor(p);
          const v = currentVersion(p);
          const done = !!ack?.acknowledgedAt;
          let deadlineDate = null;
          if (v.effectiveDate && v.ackDeadlineDays) {
            deadlineDate = new Date(v.effectiveDate);
            deadlineDate.setDate(deadlineDate.getDate() + v.ackDeadlineDays);
          }
          const overdue = !done && deadlineDate && deadlineDate < new Date();

          return (
            <div key={p.id} style={{ ...cardStyle, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>{p.title}</h3>
                  <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Version {v.versionNumber} � {p.category}</p>
                </div>
                {done ? (
                  <StatusBadge label="Acknowledged" color={ackStatusMeta.Acknowledged.color} bg={ackStatusMeta.Acknowledged.bg} />
                ) : overdue ? (
                  <StatusBadge label="Overdue" color={ackStatusMeta.Overdue.color} bg={ackStatusMeta.Overdue.bg} />
                ) : (
                  <StatusBadge label="Not Acknowledged" color={ackStatusMeta["Not Acknowledged"].color} bg={ackStatusMeta["Not Acknowledged"].bg} />
                )}
              </div>

              {done ? (
                <p style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, marginTop: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <CheckCircle2 size={13} /> Signed {fmtDate(ack.acknowledgedAt)} � {ack.device}
                </p>
              ) : (
                <>
                  {deadlineDate && <p style={{ fontSize: "11.5px", color: overdue ? "var(--red)" : "var(--subtext)", marginTop: "10px" }}>Due by {fmtDate(deadlineDate.toISOString().slice(0, 10))}</p>}
                  <PrimaryButton onClick={() => setTarget(p)} style={{ marginTop: "10px", padding: "7px 14px", fontSize: "12px" }}>Read & Acknowledge</PrimaryButton>
                </>
              )}
            </div>
          );
        })}
      </div>

      <AcknowledgeModal isOpen={!!target} onClose={() => setTarget(null)} policy={target} onSaved={onAcknowledged} />
    </div>
  );
}

/* ---------------------------------- Compliance Dashboard tab ---------------------------------- */

function ComplianceTab({ policies, allAcks }) {
  const mandatoryPolicies = policies.filter((p) => p.mandatoryAcknowledgement && p.status === "Published");
  const roster = [{ id: ME.id, name: ME.name }, ...colleagues];

  if (mandatoryPolicies.length === 0) return <EmptyState icon={ShieldAlert} title="No mandatory policies published" />;

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>Compliance Dashboard</h2>
      {mandatoryPolicies.map((p) => {
        const v = currentVersion(p);
        const relevant = roster.map((emp) => {
          const ack = allAcks.find((a) => a.policyId === p.id && a.versionId === v.id && a.employeeId === emp.id);
          return { ...emp, acknowledged: !!ack?.acknowledgedAt };
        });
        const completed = relevant.filter((r) => r.acknowledged).length;
        const outstanding = relevant.filter((r) => !r.acknowledged);

        return (
          <div key={p.id} style={{ ...cardStyle, padding: "18px 20px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{p.title}</h3>
                <p style={{ fontSize: "11px", color: "var(--subtext)" }}>Version {v.versionNumber}</p>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{completed}/{relevant.length} acknowledged</span>
            </div>
            <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ height: "100%", width: `${(completed / relevant.length) * 100}%`, background: "var(--green)", borderRadius: "99px" }} />
            </div>
            {outstanding.length > 0 && (
              <>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                  Outstanding � escalates to employee then manager after the configured overdue period
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {outstanding.map((e) => (
                    <span key={e.id} style={{ fontSize: "11.5px", color: "var(--red)", background: "#fef2f2", padding: "3px 10px", borderRadius: "99px" }}>{e.name}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "library", label: "Policy Library", icon: FileText },
  { key: "myAcks", label: "My Acknowledgements", icon: BadgeCheck },
  { key: "compliance", label: "Compliance Dashboard", icon: ShieldAlert },
];

export default function Policies() {
  const [activeTab, setActiveTab] = useState("library");
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);
  const [myAcks, setMyAcks] = useState([]);
  const [allAcks, setAllAcks] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getPolicies(), getAcknowledgements(ME.id), getAllAcknowledgements()])
      .then(([p, mine, all]) => {
        setPolicies(p.data);
        setMyAcks(mine.data);
        setAllAcks(all.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledged = (ack) => {
    setMyAcks((prev) => {
      const exists = prev.some((a) => a.id === ack.id);
      return exists ? prev.map((a) => (a.id === ack.id ? ack : a)) : [ack, ...prev];
    });
    setAllAcks((prev) => {
      const exists = prev.some((a) => a.id === ack.id);
      return exists ? prev.map((a) => (a.id === ack.id ? ack : a)) : [ack, ...prev];
    });
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
        <PageHeader title="Policy Management" subtitle="Policy authoring, versioning and employee acknowledgement" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "library" && (
          <PolicyLibraryTab
            policies={policies}
            onPolicyAdded={(p) => setPolicies((prev) => [p, ...prev])}
            onPolicyUpdated={(p) => setPolicies((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
          />
        )}

        {activeTab === "myAcks" && (
          <MyAcknowledgementsTab policies={policies} myAcks={myAcks} onAcknowledged={handleAcknowledged} />
        )}

        {activeTab === "compliance" && <ComplianceTab policies={policies} allAcks={allAcks} />}
      </div>
    </MainLayout>
  );
}