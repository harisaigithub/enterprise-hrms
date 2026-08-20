/**
 * Recruitment (ATS) Page � Module 5
 * Tabs: Requisitions � Candidate Pipeline � Interviews � Offers
 */

import { useState, useEffect } from "react";
import {
  Briefcase,
  KanbanSquare,
  Users2,
  FileSignature,
  Plus,
  Star,
  X,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getRequisitions,
  addRequisition,
  getCandidates,
  addCandidate,
  moveCandidateStage,
  getInterviews,
  scheduleInterview,
  submitScorecard,
  getOffers,
  createOffer,
  updateOfferStatus,
} from "../../services/recruitmentService";

import { getEmployees } from "../../services/employeeService";
import { getDepartments, getGrades } from "../../services/Orgmanagementservice";


// import {
//   requisitionStatusMeta,
//   PIPELINE_STAGES,
//   stageMeta,
//   interviewStatusMeta,
//   offerStatusMeta,
// } from "../../mock/recruitment";

const requisitionStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  "Pending Approval": { color: "#d97706", bg: "#fffbeb" },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  Open: { color: "#16a34a", bg: "#f0fdf4" },
  Closed: { color: "#64748b", bg: "#f1f5f9" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
};

const PIPELINE_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const stageMeta = {
  Applied: { color: "#0284c7", bg: "#f0f9ff" },
  Screening: { color: "#7c3aed", bg: "#f5f3ff" },
  Interview: { color: "#d97706", bg: "#fffbeb" },
  Offer: { color: "#0891b2", bg: "#ecfeff" },
  Hired: { color: "#16a34a", bg: "#f0fdf4" },
  Rejected: { color: "#dc2626", bg: "#fef2f2" },
};

const interviewStatusMeta = {
  Scheduled: { color: "#0284c7", bg: "#f0f9ff" },
  "Feedback Pending": { color: "#d97706", bg: "#fffbeb" },
  Completed: { color: "#16a34a", bg: "#f0fdf4" },
};

const offerStatusMeta = {
  Draft: { color: "#64748b", bg: "#f1f5f9" },
  "Salary Approval Pending": {
    color: "#d97706",
    bg: "#fffbeb",
  },
  Approved: { color: "#0284c7", bg: "#f0f9ff" },
  "Background Verification": {
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  "Sent — Awaiting Signature": {
    color: "#d97706",
    bg: "#fffbeb",
  },
  Accepted: { color: "#16a34a", bg: "#f0fdf4" },
  Declined: { color: "#dc2626", bg: "#fef2f2" },
  Expired: { color: "#64748b", bg: "#f1f5f9" },
};

const currency = (n) => `?${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ---------------------------------- shared bits ---------------------------------- */

const cardStyle = {
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};

function inputStyle(hasError) {
  return {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${hasError ? "var(--red)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    fontSize: "13.5px",
    color: "var(--text)",
    outline: "none",
    background: "var(--card)",
    fontFamily: "inherit",
  };
}

function fieldLabel(text) {
  return <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{text}</label>;
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "9px 16px", background: "var(--primary)", color: "#fff",
        border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px",
        cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "9px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
        background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer",
        ...props.style,
      }}
    >
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
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
              border: "none", borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              background: "none", color: isActive ? "var(--primary)" : "var(--subtext)",
              fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function StarRating({ value }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} fill={n <= value ? "#f59e0b" : "none"} style={{ color: n <= value ? "#f59e0b" : "var(--border)" }} />
      ))}
    </div>
  );
}

/* ---------------------------------- Requisitions tab ---------------------------------- */

function AddRequisitionModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "",
    departmentId: "",
    grade: "",
    openings: 1,
    salaryMin: "",
    salaryMax: "",
    justification: ""
  });

  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [departmentsRes, gradesRes] = await Promise.all([
          getDepartments(),
          getGrades(),
        ]);

        setDepartments(departmentsRes.data || []);
        setGrades(gradesRes.data || []);
      } catch (error) {
        console.error("Failed to load departments and grades:", error);

        setDepartments([]);
        setGrades([]);
      }
    };

    loadData();
  }, [isOpen]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Required";
    if (!form.salaryMin || !form.salaryMax) e.salary = "Enter a salary range";
    if (Number(form.salaryMin) > Number(form.salaryMax)) e.salary = "Min cannot exceed max";
    if (!form.justification.trim()) e.justification = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const req = {
      title: form.title.trim(),
      departmentId: form.departmentId || undefined,
      grade: form.grade,
      openings: Number(form.openings) || 1,
      salaryMin: Number(form.salaryMin),
      salaryMax: Number(form.salaryMax),
      justification: form.justification.trim(),
    };
    const res = await addRequisition(req);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setForm({
      title: "",
      departmentId: "",
      grade: "",
      openings: 1,
      salaryMin: "",
      salaryMax: "",
      justification: ""
    });
  };

  return (
    <Modal isOpen={isOpen} title="Raise Job Requisition" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          Routes for approval: Hiring Manager ? Department Head ? HR{form.salaryMax && Number(form.salaryMax) > 2000000 ? " ? Finance (over standard band)" : ""}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Job Title *")}
          <input value={form.title} onChange={(e) => set("title", e.target.value)} style={inputStyle(errors.title)} placeholder="e.g. Senior Backend Engineer" />
          {errors.title && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.title}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Department")}
            <select
              value={form.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}
            >
              <option value="">Select Department</option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Grade")}
            <select
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
              style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}
            >
              <option value="">Select Grade</option>

              {grades.map((grade) => (
                <option key={grade.id} value={grade.code}>
                  {grade.code} - {grade.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Openings")}
            <input type="number" min={1} value={form.openings} onChange={(e) => set("openings", e.target.value)} style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Budgeted Salary Range (annual, ?) *")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input type="number" placeholder="Min" value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} style={inputStyle(errors.salary)} />
            <input type="number" placeholder="Max" value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} style={inputStyle(errors.salary)} />
          </div>
          {errors.salary && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.salary}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Justification *")}
          <textarea rows={2} value={form.justification} onChange={(e) => set("justification", e.target.value)} style={{ ...inputStyle(errors.justification), resize: "vertical" }} />
          {errors.justification && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.justification}</span>}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting�" : "Submit Requisition"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function RequisitionsTab({ requisitions, onAdded }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Job Requisitions</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Raise Requisition</PrimaryButton>
      </div>

      {requisitions.length === 0 ? (
        <EmptyState icon={Briefcase} title="No requisitions yet" />
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                  {["Title", "Department", "Grade", "Openings", "Salary Band", "Raised By", "Status"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requisitions.map((r, i) => {
                  const meta = requisitionStatusMeta[r.status] || requisitionStatusMeta.Draft;
                  return (
                    <tr key={r.id} style={{ borderBottom: i < requisitions.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{r.title}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{r.department}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{r.grade}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", textAlign: "center" }}>{r.openings}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{currency(r.salaryMin)} � {currency(r.salaryMax)}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text)" }}>{r.raisedBy}</td>
                      <td style={{ padding: "13px 16px" }}><StatusBadge label={r.status} color={meta.color} bg={meta.bg} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddRequisitionModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onAdded} />
    </div>
  );
}

/* ---------------------------------- Candidate Pipeline tab ---------------------------------- */

function AddCandidateModal({ isOpen, onClose, requisitions, onSaved }) {
  const [form, setForm] = useState({ requisitionId: "", name: "", email: "", resumeSummary: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.requisitionId) e.requisitionId = "Select a requisition";
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const nameParts = form.name.trim().split(/\s+/);

    const candidate = {
      requisitionId: form.requisitionId,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" "),
      email: form.email.trim(),
      resumeSummary: form.resumeSummary.trim(),
      stage: "Applied",
      rating: 0,
      notes: "",
    };
    const res = await addCandidate(candidate);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setForm({ requisitionId: "", name: "", email: "", resumeSummary: "" });
  };

  return (
    <Modal isOpen={isOpen} title="Add Candidate" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Requisition *")}
          <select value={form.requisitionId} onChange={(e) => set("requisitionId", e.target.value)} style={{ ...inputStyle(errors.requisitionId), height: "38px", cursor: "pointer" }}>
            <option value="">Select requisition</option>
            {requisitions.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.department})</option>)}
          </select>
          {errors.requisitionId && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.requisitionId}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Name *")}
            <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle(errors.name)} />
            {errors.name && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.name}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Email *")}
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inputStyle(errors.email)} />
            {errors.email && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.email}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Resume Summary")}
          <p style={{ fontSize: "11px", color: "var(--subtext)", margin: "0 0 2px" }}>Parsed/suggested fields should always be verified by the recruiter, not auto-trusted.</p>
          <textarea rows={2} value={form.resumeSummary} onChange={(e) => set("resumeSummary", e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding�" : "Add to Pipeline"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CandidateCard({ candidate, requisitionTitle, onMove }) {
  const idx = PIPELINE_STAGES.indexOf(candidate.stage);
  const canAdvance = idx >= 0 && idx < PIPELINE_STAGES.length - 2; // not past Offer, and not already Hired/Rejected
  const nextStage = PIPELINE_STAGES[idx + 1];

  return (
    <div style={{ ...cardStyle, padding: "12px 14px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{candidate.name}</p>
          <p style={{ fontSize: "11px", color: "var(--subtext)" }}>{requisitionTitle}</p>
        </div>
        {candidate.rating > 0 && <StarRating value={candidate.rating} />}
      </div>
      {candidate.resumeSummary && <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "6px", lineHeight: 1.4 }}>{candidate.resumeSummary}</p>}
      {candidate.notes && <p style={{ fontSize: "11.5px", color: "var(--label)", marginTop: "6px", fontStyle: "italic" }}>"{candidate.notes}"</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
        <span style={{ fontSize: "10.5px", color: "var(--subtext)" }}>{fmtDate(candidate.appliedOn)}</span>
        {canAdvance && candidate.stage !== "Rejected" && (
          <button
            onClick={() => onMove(candidate.id, nextStage)}
            style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}
          >
            Move ? {nextStage}
          </button>
        )}
      </div>
    </div>
  );
}

function PipelineTab({ candidates, requisitions, onCandidateAdded, onMove }) {
  const [showAdd, setShowAdd] = useState(false);
  const reqTitle = (id) => requisitions.find((r) => r.id === id)?.title || "�";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Candidate Pipeline</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Candidate</PrimaryButton>
      </div>

      <div style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "8px" }}>
        {PIPELINE_STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage);
          const meta = stageMeta[stage];
          return (
            <div key={stage} style={{ minWidth: "230px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: meta.color, background: meta.bg, padding: "3px 10px", borderRadius: "99px" }}>{stage}</span>
                <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{stageCandidates.length}</span>
              </div>
              <div style={{ minHeight: "40px" }}>
                {stageCandidates.map((c) => (
                  <CandidateCard key={c.id} candidate={c} requisitionTitle={reqTitle(c.requisitionId)} onMove={onMove} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddCandidateModal isOpen={showAdd} onClose={() => setShowAdd(false)} requisitions={requisitions} onSaved={onCandidateAdded} />
    </div>
  );
}

/* ---------------------------------- Interviews tab ---------------------------------- */

function ScheduleInterviewModal({ isOpen, onClose, candidates, onSaved }) {
  const [form, setForm] = useState({
    candidateId: "",
    round: "",
    interviewers: [],
    scheduledAt: ""
  });

  const [interviewers, setInterviewers] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadInterviewers = async () => {
      try {
        const res = await getEmployees();

        console.log("INTERVIEWERS:", res);

        setInterviewers(res.data || []);
      } catch (error) {
        console.error("Failed to load interviewers:", error);
        setInterviewers([]);
      }
    };

    loadInterviewers();
  }, [isOpen]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.candidateId) e.candidateId = "Select a candidate";
    if (!form.round.trim()) e.round = "Required";
    if (!form.interviewers.length) {
      e.interviewers = "Select at least one interviewer";
    }
    if (!form.scheduledAt) e.scheduledAt = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const interview = {
      applicationId: form.candidateId,
      round: form.round.trim(),
      interviewers: form.interviewers,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    };
    const res = await scheduleInterview(interview);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setForm({ candidateId: "", round: "", interviewers: [], scheduledAt: "" });
  };

  return (
    <Modal isOpen={isOpen} title="Schedule Interview" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Candidate *")}
          <select value={form.candidateId} onChange={(e) => set("candidateId", e.target.value)} style={{ ...inputStyle(errors.candidateId), height: "38px", cursor: "pointer" }}>
            <option value="">Select candidate</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.candidateId && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.candidateId}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Round *")}
          <input value={form.round} onChange={(e) => set("round", e.target.value)} placeholder="e.g. System Design" style={inputStyle(errors.round)} />
          {errors.round && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.round}</span>}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Interviewers *")}

          <div
            style={{
              border: `1px solid ${errors.interviewers
                ? "var(--red)"
                : "var(--border)"
                }`,
              borderRadius: "var(--radius-sm)",
              background: "var(--card)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "9px 12px",
                fontSize: "13px",
                color: "var(--subtext)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Select interviewer
            </div>

            <div
              style={{
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              {interviewers.map((employee) => {
                const employeeCode = employee.id;

                const selected =
                  form.interviewers.includes(employeeCode);

                return (
                  <label
                    key={employee.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          set(
                            "interviewers",
                            [...form.interviewers, employeeCode]
                          );
                        } else {
                          set(
                            "interviewers",
                            form.interviewers.filter(
                              (code) => code !== employeeCode
                            )
                          );
                        }
                      }}
                    />

                    {employee.firstName}{" "}
                    {employee.lastName || ""}
                  </label>
                );
              })}
            </div>
          </div>

          {form.interviewers.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--subtext)",
              }}
            >
              {form.interviewers.length} interviewer
              {form.interviewers.length > 1 ? "s" : ""} selected
            </span>
          )}


          {errors.interviewers && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.interviewers}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Date & Time *")}
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} style={inputStyle(errors.scheduledAt)} />
          {errors.scheduledAt && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.scheduledAt}</span>}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Scheduling�" : "Schedule"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ScorecardModal({ isOpen, onClose, interview, onSaved }) {
  const [interviewer, setInterviewer] = useState("");
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const remaining = interview ? interview.interviewers.filter((n) => !interview.scorecards.some((s) => s.interviewer === n)) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!interviewer) return;

    setSaving(true);

    try {
      const interviewerIndex =
        interview.interviewers.indexOf(interviewer);

      const interviewerId =
        interview.interviewerIds[interviewerIndex];

      if (!interviewerId) {
        throw new Error("Interviewer ID not found");
      }

      const res = await submitScorecard(
        interview.id,
        {
          interviewerId,
          submitted: true,
          rating: Number(rating),
          notes,
        }
      );

      onSaved(res.data);
      onClose();

      setInterviewer("");
      setRating(3);
      setNotes("");
    } catch (error) {
      console.error("Failed to submit scorecard:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!interview) return null;

  return (
    <Modal isOpen={isOpen} title={`Submit Scorecard � ${interview.round}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>
          Your feedback stays hidden from other interviewers until every panelist for this round has submitted.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Submitting as *")}
          <select value={interviewer} onChange={(e) => setInterviewer(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            <option value="">Select your name</option>
            {remaining.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Overall Rating (1�5)")}
          <select value={rating} onChange={(e) => setRating(e.target.value)} style={{ ...inputStyle(false), height: "38px", width: "90px", cursor: "pointer" }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Structured Notes")}
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Competency-based observations�" style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !interviewer}>{saving ? "Submitting�" : "Submit Scorecard"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function InterviewCard({ interview, candidateName, onOpenScorecard }) {
  const meta = interviewStatusMeta[interview.status];
  const allSubmitted = interview.scorecards.length >= interview.interviewers.length;
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{candidateName} � {interview.round}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{interview.interviewers.join(", ")}</p>
        </div>
        <StatusBadge label={interview.status} color={meta.color} bg={meta.bg} />
      </div>
      <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "10px" }}>
        {new Date(interview.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>

      <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--label)", marginBottom: "6px" }}>
        {interview.scorecards.length} of {interview.interviewers.length} scorecards submitted
      </p>

      {allSubmitted ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {interview.scorecards.map((s) => (
            <div key={s.interviewer} style={{ fontSize: "12.5px", color: "var(--text)", background: "var(--background)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
              <strong>{s.interviewer}</strong> � {s.rating}/5{s.notes ? `: ${s.notes}` : ""}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", fontStyle: "italic" }}>
          Feedback stays hidden from the panel until everyone has submitted (avoids anchoring bias).
        </p>
      )}

      {!allSubmitted && (
        <button onClick={() => onOpenScorecard(interview)} style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
          + Submit a scorecard
        </button>
      )}
    </div>
  );
}

function InterviewsTab({ interviews, candidates, onScheduled, onScorecardSubmitted }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [scorecardInterview, setScorecardInterview] = useState(null);
  const candidateName = (applicationId) => {
    const candidate = candidates.find(
      (c) => c.id === applicationId
    );

    return candidate?.name || "Unknown Candidate";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Interviews</h2>
        <PrimaryButton onClick={() => setShowSchedule(true)}><Plus size={16} /> Schedule Interview</PrimaryButton>
      </div>

      {interviews.length === 0 ? (
        <EmptyState icon={Users2} title="No interviews scheduled" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
          {interviews.map((iv) => (
            <InterviewCard
              key={iv.id}
              interview={iv}
              candidateName={candidateName(iv.applicationId)}
              onOpenScorecard={(interview) =>
                setScorecardInterview(interview)
              }
            />
          ))}
        </div>
      )}

      <ScheduleInterviewModal isOpen={showSchedule} onClose={() => setShowSchedule(false)} candidates={candidates} onSaved={onScheduled} />
      <ScorecardModal isOpen={!!scorecardInterview} onClose={() => setScorecardInterview(null)} interview={scorecardInterview} onSaved={onScorecardSubmitted} />
    </div>
  );
}

/* ---------------------------------- Offers tab ---------------------------------- */

function CreateOfferModal({ isOpen, onClose, candidates, requisitions, onSaved }) {
  const [candidateId, setCandidateId] = useState("");
  const [salary, setSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const candidate = candidates.find((c) => c.id === candidateId);
  const requisition = candidate ? requisitions.find((r) => r.id === candidate.requisitionId) : null;
  const overBand = requisition && salary && Number(salary) > requisition.salaryMax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!candidateId || !salary) { setError("Select a candidate and enter a salary"); return; }
    setError("");
    setSaving(true);
    const offer = {
      applicationId: candidateId,
      proposedSalary: Number(salary),
    };
    const res = await createOffer(offer);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setCandidateId("");
    setSalary("");
  };

  return (
    <Modal isOpen={isOpen} title="Create Offer" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Candidate *")}
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            <option value="">Select candidate marked "Selected"</option>
            {candidates.filter((c) => c.stage === "Offer").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {requisition && (
          <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>
            Approved band for {requisition.title}: {currency(requisition.salaryMin)} � {currency(requisition.salaryMax)}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Proposed Salary (annual, ?) *")}
          <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} style={inputStyle(false)} />
        </div>
        {overBand && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <AlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "12px", color: "#92400e", margin: 0 }}>
              This is above the approved band. The offer will be created as <strong>Salary Approval Pending</strong> and cannot be sent until Finance approves � this is a hard block, not just a warning.
            </p>
          </div>
        )}
        {error && <span style={{ fontSize: "11px", color: "var(--red)" }}>{error}</span>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Creating�" : "Create Offer"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function OfferRow({ offer, candidateName, onUpdate }) {
  const meta = offerStatusMeta[offer.status];
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const approveSalary = () => onUpdate(offer.id, "Approved", {});
  const applyOverride = () => {
    if (!overrideReason.trim()) return;
    onUpdate(offer.id, "Approved", { financeOverride: true, overrideReason: overrideReason.trim() });
    setShowOverride(false);
  };
  const logConsent = () => onUpdate(offer.id, "Background Verification", { consentOnFile: true });
  const send = () => {
    if (!offer.consentOnFile) return; // hard block: cannot send without BV consent flow having run
    onUpdate(offer.id, "Sent � Awaiting Signature", { sentAt: new Date().toISOString().slice(0, 10) });
  };
  const accept = () => onUpdate(offer.id, "Accepted", {});
  const decline = () => onUpdate(offer.id, "Declined", {});

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{candidateName}</td>
      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{currency(offer.proposedSalary)}</td>
      <td style={{ padding: "13px 16px" }}><StatusBadge label={offer.status} color={meta.color} bg={meta.bg} /></td>
      <td style={{ padding: "13px 16px" }}>
        {offer.consentOnFile ? (
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--green)", fontWeight: 600 }}><ShieldCheck size={14} /> On file</span>
        ) : (
          <span style={{ fontSize: "12px", color: "var(--subtext)" }}>Not logged</span>
        )}
      </td>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {offer.status === "Salary Approval Pending" && !showOverride && (
            <>
              <button onClick={approveSalary} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Approve (within revised band)</button>
              <button onClick={() => setShowOverride(true)} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--amber)", border: "none", background: "none", cursor: "pointer" }}>Finance override�</button>
            </>
          )}
          {showOverride && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input placeholder="Override reason" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} style={{ ...inputStyle(false), height: "30px", width: "140px", fontSize: "12px" }} />
              <button onClick={applyOverride} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Log override</button>
            </div>
          )}
          {offer.status === "Approved" && !offer.consentOnFile && (
            <button onClick={logConsent} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Log candidate consent ? start BV</button>
          )}
          {offer.status === "Background Verification" && (
            <button onClick={send} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Verification complete � Send offer</button>
          )}
          {offer.status === "Sent � Awaiting Signature" && (
            <>
              <button onClick={accept} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--green)", border: "none", background: "none", cursor: "pointer" }}>Mark Accepted</button>
              <button onClick={decline} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>Mark Declined</button>
            </>
          )}
        </div>
        {offer.financeOverride && <p style={{ fontSize: "10.5px", color: "var(--subtext)", marginTop: "4px" }}>Finance override logged: "{offer.overrideReason}"</p>}
      </td>
    </tr>
  );
}

function OffersTab({ offers, candidates, requisitions, onCreated, onUpdate }) {
  const [showCreate, setShowCreate] = useState(false);
  const candidateName = (id) => candidates.find((c) => c.id === id)?.name || "�";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Offers</h2>
        <PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Create Offer</PrimaryButton>
      </div>

      {offers.length === 0 ? (
        <EmptyState icon={FileSignature} title="No offers yet" />
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                  {["Candidate", "Proposed Salary", "Status", "BV Consent", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <OfferRow key={o.id} offer={o} candidateName={candidateName(o.candidateId)} onUpdate={onUpdate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateOfferModal isOpen={showCreate} onClose={() => setShowCreate(false)} candidates={candidates} requisitions={requisitions} onSaved={onCreated} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "requisitions", label: "Requisitions", icon: Briefcase },
  { key: "pipeline", label: "Candidate Pipeline", icon: KanbanSquare },
  { key: "interviews", label: "Interviews", icon: Users2 },
  { key: "offers", label: "Offers", icon: FileSignature },
];

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState("requisitions");
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);

  // useEffect(() => {
  //   setLoading(true);
  //   Promise.all([getRequisitions(), getCandidates(), getInterviews(), getOffers()])
  //     .then(([r, c, iv, o]) => {
  //       setRequisitions(r.data);
  //       setCandidates(c.data);
  //       setInterviews(iv.data);
  //       setOffers(o.data);
  //     })
  //     .finally(() => setLoading(false));
  // }, []);

  useEffect(() => {
    const loadRecruitmentData = async () => {
      try {
        setLoading(true);

        const [
          requisitionsRes,
          candidatesRes,
          interviewsRes,
          offersRes,
        ] = await Promise.all([
          getRequisitions(),
          getCandidates(),
          getInterviews(),
          getOffers(),
        ]);

        console.log("REQUISITIONS:", requisitionsRes);
        console.log("CANDIDATES:", candidatesRes);
        console.log("INTERVIEWS:", interviewsRes);
        console.log("OFFERS:", offersRes);

        setRequisitions(requisitionsRes.data || []);
        setCandidates(candidatesRes.data || []);
        setInterviews(interviewsRes.data || []);
        setOffers(offersRes.data || []);
      } catch (error) {
        console.error(
          "Failed to load recruitment data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadRecruitmentData();
  }, []);

  const handleMove = async (id, stage) => {
    const res = await moveCandidateStage(id, stage);
    setCandidates((prev) => prev.map((c) => (c.id === id ? res.data : c)));
  };

  const handleOfferUpdate = async (id, status, patch) => {
    const res = await updateOfferStatus(id, status, patch);
    setOffers((prev) => prev.map((o) => (o.id === id ? res.data : o)));
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
        <PageHeader title="Recruitment (ATS)" subtitle="Job requisitions, candidate pipeline, interviews and offers" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "requisitions" && (
          <RequisitionsTab requisitions={requisitions} onAdded={(r) => setRequisitions((prev) => [r, ...prev])} />
        )}

        {activeTab === "pipeline" && (
          <PipelineTab
            candidates={candidates}
            requisitions={requisitions}
            onCandidateAdded={(c) => setCandidates((prev) => [c, ...prev])}
            onMove={handleMove}
          />
        )}

        {activeTab === "interviews" && (
          <InterviewsTab
            interviews={interviews}
            candidates={candidates}
            onScheduled={(iv) => setInterviews((prev) => [iv, ...prev])}
            onScorecardSubmitted={(iv) => setInterviews((prev) => prev.map((i) => (i.id === iv.id ? iv : i)))}
          />
        )}

        {activeTab === "offers" && (
          <OffersTab
            offers={offers}
            candidates={candidates}
            requisitions={requisitions}
            onCreated={(o) => setOffers((prev) => [o, ...prev])}
            onUpdate={handleOfferUpdate}
          />
        )}
      </div>
    </MainLayout>
  );
}