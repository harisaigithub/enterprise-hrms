/**
 * Separation Management Page — Module 19
 * Tabs: Separations • Clearance • Exit Interview • Settlement & Alumni
 */

import { useState, useEffect } from "react";
import {
  LogOut,
  ListChecks,
  MessageSquareWarning,
  Wallet,
  Plus,
  ShieldOff,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getSeparations,
  initiateSeparation,
  getClearanceItems,
  updateClearanceItem,
  getExitInterview,
  recordExitInterview,
  computeSettlement,
  revokeAccess,
  convertToAlumni,
  getAlumni,
} from "../../services/separationService";

import { getEmployees } from "../../services/employeeService";

const currency = (n) => `?${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    console.error("Invalid date received:", value);
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ---------------------------------- shared bits ---------------------------------- */

const separationStatusMeta = {
  "Notice Period": {
    color: "#d97706",
    bg: "#fffbeb",
  },
  "Clearance In Progress": {
    color: "#2563eb",
    bg: "#eff6ff",
  },
  Cleared: {
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  "Settlement Pending": {
    color: "#9333ea",
    bg: "#faf5ff",
  },
  Completed: {
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  Alumni: {
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  "Settlement Approved": {
    color: "var(--primary)",
    bg: "var(--primary-light)",
  },
};

const normalizeSeparationStatus = (status) => {
  if (!status) {
    return null;
  }

  const normalized = String(status).trim();

  if (separationStatusMeta[normalized]) {
    return normalized;
  }

  return null;
};

const clearanceStatusMeta = {
  Pending: {
    color: "#d97706",
    bg: "#fffbeb",
  },
  Complete: {
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  Flagged: {
    color: "#dc2626",
    bg: "#fef2f2",
  },
};

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

/* ---------------------------------- Separations tab ---------------------------------- */

function InitiateSeparationModal({
  isOpen,
  onClose,
  onSaved,
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("Resignation");
  const [reason, setReason] = useState("");

  const [submittedOn, setSubmittedOn] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [noticePeriodDays, setNoticePeriodDays] =
    useState(30);

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD EMPLOYEES
  ========================================================= */

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        setError("");

        const response = await getEmployees({
          status: "Active",
        });

        console.log(
          "EMPLOYEE API RESPONSE:",
          response
        );

        if (mounted) {
          setEmployees(response?.data || []);
        }
      } catch (err) {
        console.error(
          "Failed to load employees:",
          err
        );

        if (mounted) {
          setEmployees([]);

          setError(
            err?.response?.data?.message ||
            "Failed to load employees"
          );
        }
      } finally {
        if (mounted) {
          setLoadingEmployees(false);
        }
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  /* =========================================================
     LAST WORKING DAY
  ========================================================= */

  const lastWorkingDay = () => {
    const d = new Date(submittedOn);

    d.setDate(
      d.getDate() +
      Number(noticePeriodDays || 0)
    );

    return d.toISOString().slice(0, 10);
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    /* Employee required */
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }

    /* Reason required */
    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }

    /*
     * IMPORTANT:
     * employeeId must be the real Employee UUID.
     *
     * We find the selected employee from the loaded
     * backend employee list and use employee.id.
     */
    const selectedEmployee = employees.find(
      (employee) => employee.id === employeeId
    );

    if (!selectedEmployee) {
      setError("Invalid employee selected.");
      return;
    }

    try {
      setSaving(true);

      /*
       * Production payload.
       *
       * employeeId = Employee.id (UUID)
       * NOT employee name
       * NOT employee code
       */
      const separation = {
        employeeId: selectedEmployee.id,
        type,
        reason: reason.trim(),
        submittedOn,
        lastWorkingDay: lastWorkingDay(),
        noticePeriodDays: Number(
          noticePeriodDays || 0
        ),
      };

      console.log(
        "SEPARATION PAYLOAD:",
        separation
      );

      const response =
        await initiateSeparation(
          separation
        );

      onSaved(response.data);

      /* Reset form */
      setEmployeeId("");
      setType("Resignation");
      setReason("");
      setNoticePeriodDays(30);
      setError("");

      onClose();
    } catch (err) {
      console.error(
        "Initiate separation error:",
        err
      );

      setError(
        err?.response?.data?.message ||
        "Failed to initiate separation"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <Modal
      isOpen={isOpen}
      title="Initiate Separation"
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >

        {/* =================================================
            TYPE
        ================================================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Type")}

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value)
            }
            disabled={saving}
            style={{
              ...inputStyle(false),
              height: "38px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            <option value="Resignation">
              Resignation (employee-initiated)
            </option>

            <option value="Termination">
              Termination (involuntary — HR +
              senior approver only)
            </option>
          </select>
        </div>

        {/* =================================================
            TERMINATION WARNING
        ================================================= */}

        {type === "Termination" && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius:
                "var(--radius-sm)",
              padding: "10px 12px",
            }}
          >
            <AlertTriangle
              size={16}
              style={{
                color: "var(--red)",
                flexShrink: 0,
                marginTop: "1px",
              }}
            />

            <p
              style={{
                fontSize: "12px",
                color: "#991b1b",
                margin: 0,
              }}
            >
              This path has stricter access in a
              real deployment — restricted to HR
              plus a senior approver, given its
              legal sensitivity.
            </p>
          </div>
        )}

        {/* =================================================
            EMPLOYEE
        ================================================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Employee *")}

          <select
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setError("");
            }}
            disabled={
              loadingEmployees || saving
            }
            style={{
              ...inputStyle(false),
              height: "38px",
              cursor:
                loadingEmployees || saving
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <option value="">
              {loadingEmployees
                ? "Loading employees..."
                : employees.length === 0
                  ? "No active employees found"
                  : "Select employee"}
            </option>

            {employees.map((employee) => {
              /*
               * Display name only.
               *
               * IMPORTANT:
               * value is employee.id.
               */
              const name =
                `${employee.firstName || ""} ${employee.lastName || ""
                  }`.trim();

              return (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {name ||
                    employee.employeeCode ||
                    employee.id}

                  {employee.employeeCode
                    ? ` — ${employee.employeeCode}`
                    : ""}
                </option>
              );
            })}
          </select>

          {/* Optional debugging information */}
          {employeeId && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--subtext)",
              }}
            >
              Selected Employee ID: {employeeId}
            </span>
          )}
        </div>

        {/* =================================================
            REASON
        ================================================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Reason *")}

          <textarea
            rows={2}
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            disabled={saving}
            style={{
              ...inputStyle(false),
              resize: "vertical",
            }}
          />
        </div>

        {/* =================================================
            DATES
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "12px",
          }}
        >
          {/* Submitted On */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Submitted On")}

            <input
              type="date"
              value={submittedOn}
              onChange={(e) =>
                setSubmittedOn(
                  e.target.value
                )
              }
              disabled={saving}
              style={inputStyle(false)}
            />
          </div>

          {/* Notice Period */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel(
              "Notice Period (days)"
            )}

            <input
              type="number"
              min={0}
              value={noticePeriodDays}
              onChange={(e) =>
                setNoticePeriodDays(
                  e.target.value
                )
              }
              disabled={saving}
              style={inputStyle(false)}
            />
          </div>
        </div>

        {/* =================================================
            LAST WORKING DAY
        ================================================= */}

        <p
          style={{
            fontSize: "12px",
            color: "var(--subtext)",
            margin: 0,
          }}
        >
          Computed last working day:{" "}
          <strong>
            {fmtDate(lastWorkingDay())}
          </strong>
        </p>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--red)",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            disabled={
              saving ||
              loadingEmployees ||
              employees.length === 0
            }
          >
            {saving
              ? "Submitting..."
              : "Initiate Separation"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function SeparationsTab({ separations, selectedId, onSelect, onAdded }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Separations</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Initiate Separation</PrimaryButton>
      </div>

      {separations.length === 0 ? (
        <EmptyState icon={LogOut} title="No separations on file" />
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                  {["Employee", "Type", "Submitted", "Last Working Day", "Status", "Access"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {separations.map((s, i) => {
                  const normalizedStatus = normalizeSeparationStatus(
                    s.status
                  );

                  if (!normalizedStatus) {
                    console.error(
                      "Unknown separation status received from backend:",
                      {
                        separationId: s.id,
                        employeeId: s.employeeId,
                        status: s.status,
                      }
                    );
                  }

                  const meta = normalizedStatus
                    ? separationStatusMeta[normalizedStatus]
                    : null;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelect(s.id)}
                      style={{ borderBottom: i < separations.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: s.id === selectedId ? "var(--primary-light)" : "transparent" }}
                    >
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{s.employeeName}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text)" }}>{s.type}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{fmtDate(s.submittedOn)}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{fmtDate(s.lastWorkingDay)}</td>
                      <td style={{ padding: "13px 16px" }}><StatusBadge
                        label={normalizedStatus || "Unknown"}
                        color={meta?.color || "var(--subtext)"}
                        bg={meta?.bg || "var(--background)"}
                      /></td>
                      <td style={{ padding: "13px 16px" }}>
                        {s.accessRevoked ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--red)", fontWeight: 600 }}><ShieldOff size={13} /> Revoked</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--subtext)" }}>Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "12px" }}>Select a row to work on clearance, exit interview, or settlement in the other tabs.</p>

      <InitiateSeparationModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onAdded} />
    </div>
  );
}

/* ---------------------------------- Clearance tab ---------------------------------- */

function ClearanceRow({ item, onUpdate }) {
  const meta = clearanceStatusMeta[item.status];
  const [notes, setNotes] = useState(item.notes || "");

  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
        <div>
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{item.item}</p>
          <p style={{ fontSize: "11px", color: "var(--subtext)" }}>Owner: {item.owner}{item.completedAt ? ` • Completed ${fmtDate(item.completedAt)}` : ""}</p>
        </div>
        <StatusBadge label={item.status} color={meta.color} bg={meta.bg} />
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" style={{ ...inputStyle(false), height: "32px", fontSize: "12px" }} />
        {item.status !== "Complete" && (
          <button onClick={() => onUpdate(item.id, "Complete", notes)} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--green)", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap" }}>Mark Complete</button>
        )}
        {item.status !== "Flagged" && (
          <button onClick={() => onUpdate(item.id, "Flagged", notes)} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap" }}>Flag Issue</button>
        )}
      </div>
    </div>
  );
}

function ClearanceTab({ separation, items, onUpdate }) {
  if (!separation) return <EmptyState icon={ListChecks} title="Select a separation" subtitle="Choose one from the Separations tab first." />;

  const allComplete = items.length > 0 && items.every((i) => i.status === "Complete");

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Clearance — {separation.employeeName}</h2>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "16px" }}>Parallel checklist across owners. Settlement is blocked until every item here is Complete (or a documented HR override is applied).</p>

      {allComplete && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: "16px" }}>
          <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
          <p style={{ fontSize: "12.5px", color: "#166534", margin: 0 }}>All clearance items complete  —  settlement can now be computed in the Settlement & Alumni tab.</p>
        </div>
      )}

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {items.map((item) => <ClearanceRow key={item.id} item={item} onUpdate={onUpdate} />)}
      </div>
    </div>
  );
}

/* ---------------------------------- Exit Interview tab ---------------------------------- */

const DEFAULT_QUESTIONS = [
  "Primary reason for leaving?",
  "Would you recommend this company to a friend?",
  "Anything the company could have done differently?",
];

function ExitInterviewTab({ separation, interview, onSaved }) {
  const [answers, setAnswers] = useState(DEFAULT_QUESTIONS.map(() => ""));
  const [saving, setSaving] = useState(false);

  if (!separation) return <EmptyState icon={MessageSquareWarning} title="Select a separation" subtitle="Choose one from the Separations tab first." />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const responses = DEFAULT_QUESTIONS.map((q, i) => ({ q, a: answers[i] }));
    const res = await recordExitInterview(
      separation.id,
      responses
    );
    setSaving(false);
    onSaved(res.data);
  };

  return (
    <div style={{ maxWidth: "620px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Exit Interview — {separation.employeeName}</h2>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "var(--radius-sm)", padding: "10px 14px", margin: "10px 0 18px" }}>
        <Lock size={15} style={{ color: "#7c3aed", flexShrink: 0, marginTop: "1px" }} />
        <p style={{ fontSize: "12px", color: "#5b21b6", margin: 0 }}>
          Restricted to HR only — not visible to the departing employee's manager or to Auditor roles by default. Only "an interview occurred" is visible elsewhere.
        </p>
      </div>

      {interview ? (
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginBottom: "12px" }}>Conducted by {interview.conductedBy} on {fmtDate(interview.conductedAt)}</p>
          {interview.responses.map((r, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>{r.q}</p>
              <p style={{ fontSize: "13px", color: "var(--subtext)", marginTop: "2px" }}>{r.a}</p>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {DEFAULT_QUESTIONS.map((q, i) => (
            <div key={q} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel(q)}
              <textarea rows={2} value={answers[i]} onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))} style={{ ...inputStyle(false), resize: "vertical" }} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : "Record Exit Interview"}</PrimaryButton>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------------------------------- Settlement & Alumni tab ---------------------------------- */

function SettlementForm({ separation, items, onSettled }) {
  const [pendingSalary, setPendingSalary] = useState(0);
  const [leaveEncashment, setLeaveEncashment] = useState(0);
  const [reimbursements, setReimbursements] = useState(0);
  const [recoveries, setRecoveries] = useState(0);
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const allComplete = items.length > 0 && items.every((i) => i.status === "Complete");
  const openCount = items.filter((i) => i.status !== "Complete").length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allComplete && (!override || !overrideReason.trim())) {
      setError("Clearance is incomplete. Enable the override and provide a documented reason to proceed anyway.");
      return;
    }
    setError("");
    setSaving(true);
    const breakdown = { pendingSalary: Number(pendingSalary), leaveEncashment: Number(leaveEncashment), reimbursements: Number(reimbursements), recoveries: Number(recoveries) };
    const res = await computeSettlement(separation.id, breakdown, override, overrideReason.trim());
    setSaving(false);
    if (res.data?.error) {
      setError(res.data.error);
      return;
    }
    onSettled(res.data.separation);
  };

  return (
    <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {!allComplete && (
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
          <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "12px", color: "#991b1b", margin: 0 }}>{openCount} clearance item(s) still open. Settlement is hard-blocked unless you apply a documented HR override below.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Pending Salary (₹)")}
          <input type="number" value={pendingSalary} onChange={(e) => setPendingSalary(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Leave Encashment (₹)")}
          <input type="number" value={leaveEncashment} onChange={(e) => setLeaveEncashment(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reimbursement Dues (₹)")}
          <input type="number" value={reimbursements} onChange={(e) => setReimbursements(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Recoveries — unreturned assets/advances (₹)")}
          <input type="number" value={recoveries} onChange={(e) => setRecoveries(e.target.value)} style={inputStyle(false)} />
        </div>
      </div>

      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
        Net settlement: {currency(Number(pendingSalary) + Number(leaveEncashment) + Number(reimbursements) - Number(recoveries))}
      </p>

      {!allComplete && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            Apply documented HR override to bypass the clearance gate
          </label>
          {override && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Override reason *")}
              <textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
            </div>
          )}
        </>
      )}

      {error && <p style={{ fontSize: "11.5px", color: "var(--red)", margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrimaryButton type="submit" disabled={saving}>{saving ? "Computing..." : "Compute & Approve Settlement"}</PrimaryButton>
      </div>
    </form>
  );
}

function SettlementAlumniTab({ separation, items, onSettled, onRevoked, onAlumniConverted, alumni }) {
  const [role, setRole] = useState("");
  const [tenure, setTenure] = useState("");
  const [eligible, setEligible] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [converting, setConverting] = useState(false);

  if (!separation) return <EmptyState icon={Wallet} title="Select a separation" subtitle="Choose one from the Separations tab first." />;

  const handleRevoke = async () => {
    setRevoking(true);
    const res = await revokeAccess(separation.id);
    setRevoking(false);
    onRevoked(res.data);
  };

  const handleConvert = async () => {
    if (!role.trim() || !tenure.trim()) return;
    setConverting(true);
    const res = await convertToAlumni(separation.id, tenure.trim(), role.trim(), eligible);
    setConverting(false);
    onAlumniConverted(res.data);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "640px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Settlement & Alumni — {separation.employeeName}</h2>

      {separation.settlement ? (
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>Full & Final Settlement</h3>
            <StatusBadge label="Approved" color="#16a34a" bg="#f0fdf4" />
          </div>
          {["pendingSalary", "leaveEncashment", "reimbursements", "recoveries"].map((k) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "13px", color: "var(--text)" }}>
              <span style={{ textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</span>
              <span>{currency(separation.settlement[k])}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", borderTop: "1px solid var(--border)", marginTop: "6px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
            <span>Net Settlement</span>
            <span>{currency(separation.settlement.netSettlement)}</span>
          </div>
          {separation.settlement.override && (
            <p style={{ fontSize: "11.5px", color: "var(--amber)", marginTop: "10px" }}>Processed via HR override: "{separation.settlement.overrideReason}"</p>
          )}
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "6px" }}>Approved {fmtDate(separation.settlement.approvedAt)}</p>
        </div>
      ) : (
        <SettlementForm separation={separation} items={items} onSettled={onSettled} />
      )}

      {separation.settlement && (
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>System Access</h3>
          {separation.accessRevoked ? (
            <p style={{ fontSize: "13px", color: "var(--red)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><ShieldOff size={15} /> Revoked — SSO, email, VPN and HRMS access disabled; active sessions invalidated.</p>
          ) : (
            <>
              <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>Settlement is complete — revoke access atomically across all connected systems.</p>
              <PrimaryButton onClick={handleRevoke} disabled={revoking}><ShieldOff size={15} /> {revoking ? "Revoking..." : "Revoke All Access"}</PrimaryButton>
            </>
          )}
        </div>
      )}

      {separation.accessRevoked && separation.status !== "Alumni" && (
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>Convert to Alumni Record</h3>
          <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "12px" }}>Creates a deliberately minimal record; full historical data stays retained but becomes access-restricted to HR-Compliance/Auditor only from this point.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle(false)} />
            <input placeholder="Tenure (e.g. 2 yrs 4 mo)" value={tenure} onChange={(e) => setTenure(e.target.value)} style={inputStyle(false)} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer", marginBottom: "12px" }}>
            <input type="checkbox" checked={eligible} onChange={(e) => setEligible(e.target.checked)} />
            Eligible for rehire
          </label>
          <PrimaryButton onClick={handleConvert} disabled={converting}>{converting ? "Converting..." : "Convert to Alumni"}</PrimaryButton>
        </div>
      )}

      {separation.status === "Alumni" && (
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <h3 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>Alumni Record</h3>
          {alumni.filter((a) => a.employeeId === separation.employeeId).map((a) => (
            <div key={a.id} style={{ fontSize: "13px", color: "var(--text)" }}>
              <p>{a.name} • {a.role}</p>
              <p style={{ color: "var(--subtext)", fontSize: "12px" }}>Tenure: {a.tenure} • {a.eligibleForRehire ? "Eligible for rehire" : "Not eligible for rehire"} • Exited {fmtDate(a.exitedOn)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "separations", label: "Separations", icon: LogOut },
  { key: "clearance", label: "Clearance", icon: ListChecks },
  { key: "exitInterview", label: "Exit Interview", icon: MessageSquareWarning },
  { key: "settlement", label: "Settlement & Alumni", icon: Wallet },
];

export default function Separation() {
  const [activeTab, setActiveTab] = useState("separations");
  const [loading, setLoading] = useState(true);
  const [separations, setSeparations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [clearanceByEmp, setClearanceByEmp] = useState({});
  const [interview, setInterview] = useState(null);
  const [alumni, setAlumni] = useState([]);

  useEffect(() => {
    setLoading(true);
    getSeparations().then((res) => {
      setSeparations(res.data);
      setSelectedId(res.data[0]?.id || null);
      return getAlumni();
    }).then((a) => setAlumni(a.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getClearanceItems(selectedId).then((res) => setClearanceByEmp((prev) => ({ ...prev, [selectedId]: res.data })));
    getExitInterview(selectedId).then((res) => setInterview(res.data));
  }, [selectedId]);

  const selectedSeparation = separations.find((s) => s.id === selectedId) || null;

  const handleClearanceUpdate = async (id, status, notes) => {
    const res = await updateClearanceItem(id, status, notes);
    setClearanceByEmp((prev) => ({
      ...prev,
      [selectedId]: prev[selectedId].map((c) => (c.id === id ? res.data : c)),
    }));
    // parent separation status may have changed (Cleared vs Clearance In Progress)
    getSeparations().then((r) => setSeparations(r.data));
  };

  const handleSettled = (updatedSeparation) => {
    setSeparations((prev) => prev.map((s) => (s.id === updatedSeparation.id ? updatedSeparation : s)));
  };
  const handleRevoked = (updatedSeparation) => {
    setSeparations((prev) => prev.map((s) => (s.id === updatedSeparation.id ? updatedSeparation : s)));
  };
  const handleAlumniConverted = (record) => {
    setAlumni((prev) => [record, ...prev]);
    setSeparations((prev) => prev.map((s) => (s.employeeId === record.employeeId ? { ...s, status: "Alumni" } : s)));
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
        <PageHeader title="Separation Management" subtitle="Resignation, clearance, exit interview and full & final settlement" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "separations" && (
          <SeparationsTab
            separations={separations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdded={(s) => { setSeparations((prev) => [s, ...prev]); setSelectedId(s.id); }}
          />
        )}

        {activeTab === "clearance" && (
          <ClearanceTab separation={selectedSeparation} items={clearanceByEmp[selectedId] || []} onUpdate={handleClearanceUpdate} />
        )}

        {activeTab === "exitInterview" && (
          <ExitInterviewTab separation={selectedSeparation} interview={interview} onSaved={setInterview} />
        )}

        {activeTab === "settlement" && (
          <SettlementAlumniTab
            separation={selectedSeparation}
            items={clearanceByEmp[selectedId] || []}
            onSettled={handleSettled}
            onRevoked={handleRevoked}
            onAlumniConverted={handleAlumniConverted}
            alumni={alumni}
          />
        )}
      </div>
    </MainLayout>
  );
}