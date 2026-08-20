/**
 * Performance Page � Module 10
 * Tabs: Goals & OKRs � Review Cycle � Feedback � 1:1s � Ratings History
 */

import { useState, useEffect } from "react";
import {
  Target,
  ClipboardCheck,
  MessageSquare,
  Users,
  Award,
  Plus,
  X,
  Lock,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getGoals,
  addGoal,
  updateGoal,
  getReviewCycle,
  advanceReviewCyclePhase,
  getSelfAssessment,
  submitSelfAssessment,
  getManagerReview,
  submitManagerReview,
  getFeedback,
  addFeedback,
  getAdminFeedback,
  getOneOnOnes,
  addOneOnOne,
  toggleActionItem,
  getRatingsHistory,
  getManagerRatingsHistory,
  getAdminRatingsHistory,
  getCalibrationCandidates,
  releaseCalibratedRating,
  getManagerGoals,
  getAdminPerformanceOverview,
  getAdminEmployeesPerformance,
  approveManagerGoal,
  getAdminEmployeePerformanceDetail,
  rejectManagerGoal,
} from "../../services/performanceService";
import { goalStatusMeta, reviewPhaseMeta, feedbackTypeMeta, colleagues } from "../../mock/performance";


function getCurrentEmployeeCode() {
  try {
    const token = localStorage.getItem("hrms_token");

    if (!token) return null;

    const payloadPart = token.split(".")[1];

    if (!payloadPart) return null;

    const normalized = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      atob(normalized)
    );

    return payload.employeeCode || null;
  } catch (error) {
    console.error(
      "Unable to read employee code from token:",
      error
    );

    return null;
  }
}

const getCurrentEmployee = () => ({
  id: getCurrentEmployeeCode(),
  name: "Current Employee",
});

const PHASES = ["Goal Setting", "Continuous Feedback", "Self-Assessment", "Manager Review", "Calibration", "Completed"];

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
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "9px 16px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 600,
        fontSize: "13px",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
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
        padding: "9px 16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "none",
        color: "var(--label)",
        fontWeight: 600,
        fontSize: "13px",
        cursor: "pointer",
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
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 16px",
              border: "none",
              borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              background: "none",
              color: isActive ? "var(--primary)" : "var(--subtext)",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: "pointer",
              whiteSpace: "nowrap",
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

/* ---------------------------------- Goals & OKRs tab ---------------------------------- */

function AddGoalModal({ isOpen, onClose, onSaved, cycleName, goal = null }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technical");
  const [keyResults, setKeyResults] = useState([{ text: "" }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(goal);

  useEffect(() => {
    if (!isOpen) return;

    if (goal) {
      setTitle(goal.title || "");
      setCategory(goal.category || "Technical");
      setKeyResults(
        goal.keyResults?.length
          ? goal.keyResults.map((kr) => ({
              id: kr.id,
              text: kr.text,
              progress: kr.progress || 0,
            }))
          : [{ text: "", progress: 0 }]
      );
      setErrors({});
    } else {
      reset();
    }
  }, [isOpen, goal]);

  const reset = () => {
    setTitle("");
    setCategory("Technical");
    setKeyResults([{ text: "" }]);
    setErrors({});
  };

  const updateKR = (i, value) => {
    setKeyResults((prev) =>
      prev.map((kr, idx) =>
        idx === i ? { ...kr, text: value } : kr
      )
    );
  };

  const addKR = () => setKeyResults((prev) => [...prev, { text: "" }]);
  const removeKR = (i) => setKeyResults((prev) => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Give this goal a title";
    const filledKRs = keyResults.filter((kr) => kr.text.trim());
    if (filledKRs.length === 0) e.keyResults = "Add at least one key result";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setSaving(true);

  try {
    const payload = {
      title: title.trim(),
      category,
      keyResults: keyResults
        .filter((kr) => kr.text.trim())
        .map((kr) => ({
          ...(kr.id ? { id: kr.id } : {}),
          text: kr.text.trim(),
          progress: kr.progress || 0,
        })),
      ...(isEditing ? { status: "Pending Approval" } : {}),
    };

    const res = isEditing
      ? await updateGoal(goal.id, payload)
      : await addGoal(payload);

    onSaved(res.data);
    onClose();
    reset();
  } catch (error) {
    console.error("Failed to save goal:", error);
    alert(error?.message || "Unable to save goal");
  } finally {
    setSaving(false);
  }
};

  return (
    <Modal
      isOpen={isOpen}
      title={isEditing ? "Edit & Resubmit Goal" : "Add Goal (OKR)"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
          {isEditing
            ? "Update the requested changes and resubmit this goal for manager approval."
            : `This goal will need manager approval before it locks for ${cycleName}.`}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Objective *")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Improve API response times across core services"
            style={inputStyle(errors.title)}
          />
          {errors.title && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.title}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Category")}
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            {["Technical", "Leadership", "Business Impact", "Process", "Learning & Growth"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {fieldLabel("Key Results *")}
          {keyResults.map((kr, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                value={kr.text}
                onChange={(e) => updateKR(i, e.target.value)}
                placeholder={`Key result ${i + 1}`}
                style={inputStyle(false)}
              />
              {keyResults.length > 1 && (
                <button type="button" onClick={() => removeKR(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--subtext)", padding: "4px" }}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {errors.keyResults && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.keyResults}</span>}
          <button type="button" onClick={addKR} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "5px", border: "none", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "2px 0" }}>
            <Plus size={14} /> Add key result
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : isEditing
                ? "Save & Resubmit"
                : "Submit for Approval"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function KeyResultRow({ kr }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
      <span style={{ fontSize: "13px", color: "var(--text)", flex: 1 }}>{kr.text}</span>
      <div style={{ width: "110px", height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${kr.progress}%`, background: kr.progress >= 100 ? "var(--green)" : "var(--primary)", borderRadius: "99px" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--subtext)", width: "34px", textAlign: "right" }}>{kr.progress}%</span>
    </div>
  );
}

function GoalCard({ goal, onEdit, canEdit }) {
  const meta = goalStatusMeta[goal.status] || goalStatusMeta.Draft;
  const overall = Math.round(goal.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / goal.keyResults.length) || 0;
  return (
    <div style={{ ...cardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{goal.category}</span>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginTop: "3px" }}>{goal.title}</h3>
        </div>
        <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
      </div>

      <div style={{ margin: "12px 0 4px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
        {goal.keyResults.map((kr) => (
          <KeyResultRow key={kr.id} kr={kr} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Overall progress</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{overall}%</span>
      </div>
      {goal.status === "Revision Requested" && (
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <PrimaryButton onClick={() => onEdit(goal)} disabled={!canEdit}>
            Edit & Resubmit
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function GoalsTab({ goals, cycle, onGoalAdded }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const goalsLocked = cycle && cycle.phase !== "Goal Setting";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
          My Goals � {cycle?.name?.replace(" Performance Review", "") || "This Cycle"}
        </h2>
        <PrimaryButton onClick={() => setShowAdd(true)} disabled={goalsLocked} title={goalsLocked ? "Goal-setting window is closed for this cycle" : undefined}>
          {goalsLocked ? <Lock size={14} /> : <Plus size={16} />}
          Add Goal
        </PrimaryButton>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" subtitle="Add your OKRs for this cycle to get started." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              canEdit={!goalsLocked}
              onEdit={setEditingGoal}
            />
          ))}
        </div>
      )}

      <AddGoalModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onGoalAdded} cycleName={cycle?.name?.replace(" Performance Review", "") || "current cycle"} />
      <AddGoalModal
        isOpen={Boolean(editingGoal)}
        goal={editingGoal}
        cycleName={cycle?.name?.replace(" Performance Review", "") || "current cycle"}
        onClose={() => setEditingGoal(null)}
        onSaved={(updatedGoal) => {
          onGoalAdded(updatedGoal, true);
          setEditingGoal(null);
        }}
      />
    </div>
  );
}

function ManagerGoalsTab({ goals, onApprove, onReject, actionId }) {
  if (!goals || goals.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team goals"
        subtitle="Goals submitted by your direct reports will appear here."
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
          }}
        >
          Team Goals
        </h2>

        <p
          style={{
            fontSize: "12px",
            color: "var(--subtext)",
            marginTop: "4px",
          }}
        >
          Review goals submitted by your direct reports.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "14px",
        }}
      >
        {goals.map((goal) => {
          const meta =
            goalStatusMeta[goal.status] ||
            goalStatusMeta.Draft;

          const keyResults = goal.keyResults || [];

          const overall =
            keyResults.length > 0
              ? Math.round(
                  keyResults.reduce(
                    (sum, kr) =>
                      sum + (kr.progress || 0),
                    0
                  ) / keyResults.length
                )
              : 0;

          const pending =
            goal.status === "Pending Approval";

          const busy = actionId === goal.id;

          return (
            <div
              key={goal.id}
              style={{
                ...cardStyle,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      marginBottom: "4px",
                    }}
                  >
                    {goal.employeeId}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {goal.category}
                  </div>

                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginTop: "4px",
                      marginBottom: 0,
                    }}
                  >
                    {goal.title}
                  </h3>
                </div>

                <StatusBadge
                  label={meta.label}
                  color={meta.color}
                  bg={meta.bg}
                />
              </div>

              <div
                style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop:
                    "1px solid var(--border)",
                }}
              >
                {keyResults.map((kr) => (
                  <KeyResultRow
                    key={kr.id}
                    kr={kr}
                  />
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "var(--subtext)",
                  }}
                >
                  Overall progress
                </span>

                <strong
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  {overall}%
                </strong>
              </div>

              {pending && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "16px",
                    paddingTop: "14px",
                    borderTop:
                      "1px solid var(--border)",
                  }}
                >
                  <PrimaryButton
                    disabled={busy}
                    onClick={() =>
                      onApprove(goal.id)
                    }
                  >
                    <CheckCircle2 size={15} />

                    {busy
                      ? "Processing..."
                      : "Approve"}
                  </PrimaryButton>

                  <SecondaryButton
                    disabled={busy}
                    onClick={() =>
                      onReject(goal.id)
                    }
                  >
                    Request Revision
                  </SecondaryButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminPerformanceOverview({
  overview,
  employees = [],
  onOpenEmployee,
}) {
  if (!overview) {
    return (
      <EmptyState
        icon={Award}
        title="No performance overview available"
        subtitle="Admin performance metrics will appear here."
      />
    );
  }

  const {
    cycle,
    employees: employeeSummary,
    goals,
    reviews,
  } = overview;

  const metricCard = (label, value, subtitle) => (
    <div style={{ ...cardStyle, padding: "18px 20px" }}>
      <p
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--subtext)",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          fontSize: "26px",
          fontWeight: 800,
          color: "var(--text)",
          margin: 0,
        }}
      >
        {value}
      </p>

      {subtitle && (
        <p
          style={{
            fontSize: "11.5px",
            color: "var(--subtext)",
            marginTop: "4px",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );

  const reviewStatusBadge = (submitted) => {
    if (submitted) {
      return (
        <StatusBadge
          label="Submitted"
          color="#16a34a"
          bg="#f0fdf4"
        />
      );
    }

    return (
      <StatusBadge
        label="Pending"
        color="#d97706"
        bg="#fffbeb"
      />
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Active cycle                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div style={{ ...cardStyle, padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {cycle.name}
            </h2>

            <p
              style={{
                fontSize: "12px",
                color: "var(--subtext)",
                marginTop: "4px",
              }}
            >
              Organization-wide performance overview
            </p>
          </div>

          <StatusBadge
            label={cycle.phase}
            color="var(--primary)"
            bg="var(--primary-light)"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric cards                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
        }}
      >
        {metricCard(
          "Employees",
          employeeSummary.total,
          "Employees in organization"
        )}

        {metricCard(
          "Total Goals",
          goals.total,
          "Current review cycle"
        )}

        {metricCard(
          "Pending Approval",
          goals.pendingApproval,
          "Goals awaiting decision"
        )}

        {metricCard(
          "Locked Goals",
          goals.locked,
          "Approved goals"
        )}

        {metricCard(
          "Revision Requested",
          goals.revisionRequested,
          "Goals sent back for revision"
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Completion cards                                                    */}
      {/* ------------------------------------------------------------------ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Self Assessment */}

        <div style={{ ...cardStyle, padding: "20px 22px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "14px",
            }}
          >
            Self-Assessment Completion
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "var(--subtext)",
              }}
            >
              Submitted
            </span>

            <strong>
              {reviews.selfAssessment.submitted} /{" "}
              {employeeSummary.total}
            </strong>
          </div>

          <div
            style={{
              width: "100%",
              height: "8px",
              background: "var(--border)",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${reviews.selfAssessment.completionPercentage}%`,
                background: "var(--primary)",
              }}
            />
          </div>

          <p
            style={{
              fontSize: "12px",
              color: "var(--subtext)",
              marginTop: "8px",
            }}
          >
            {reviews.selfAssessment.completionPercentage}% complete
          </p>
        </div>

        {/* Manager Review */}

        <div style={{ ...cardStyle, padding: "20px 22px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "14px",
            }}
          >
            Manager Review Completion
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "var(--subtext)",
              }}
            >
              Submitted
            </span>

            <strong>
              {reviews.managerReview.submitted} /{" "}
              {employeeSummary.total}
            </strong>
          </div>

          <div
            style={{
              width: "100%",
              height: "8px",
              background: "var(--border)",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${reviews.managerReview.completionPercentage}%`,
                background: "var(--primary)",
              }}
            />
          </div>

          <p
            style={{
              fontSize: "12px",
              color: "var(--subtext)",
              marginTop: "8px",
            }}
          >
            {reviews.managerReview.completionPercentage}% complete
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Employee Performance Table                                          */}
      {/* ------------------------------------------------------------------ */}

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Employee Performance Status
          </h3>

          <p
            style={{
              fontSize: "12px",
              color: "var(--subtext)",
              marginTop: "4px",
              marginBottom: 0,
            }}
          >
            Review goal, self-assessment and manager-review progress for
            every employee.
          </p>
        </div>

        {employees.length === 0 ? (
          <div style={{ padding: "24px" }}>
            <EmptyState
              icon={Users}
              title="No employee performance data"
              subtitle="Employee performance status will appear here."
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--background)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {[
                    "Employee",
                    "Status",
                    "Goals",
                    "Pending Approval",
                    "Locked",
                    "Revision Requested",
                    "Self-Assessment",
                    "Manager Review",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "11px 14px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--subtext)",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {employees.map((employee, index) => (
                  <tr
                    key={employee.employeeId}
                    style={{
                      borderBottom:
                        index < employees.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    {/* Employee */}

                    <td
                      style={{
                        padding: "13px 14px",
                      }}
                    >
                      <div>
                      <button
  type="button"
  onClick={() => onOpenEmployee(employee.employeeId)}
  style={{
    border: "none",
    background: "none",
    padding: 0,
    fontSize: "13.5px",
    fontWeight: 700,
    color: "var(--primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
  }}
>
  {employee.name}
</button>

                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "var(--subtext)",
                            marginTop: "2px",
                          }}
                        >
                          {employee.employeeId}
                        </div>
                      </div>
                    </td>

                    {/* Employee Status */}

                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <StatusBadge
                        label={employee.employeeStatus}
                        color={
                          employee.employeeStatus === "Active"
                            ? "#16a34a"
                            : employee.employeeStatus === "On Leave"
                            ? "#d97706"
                            : "#64748b"
                        }
                        bg={
                          employee.employeeStatus === "Active"
                            ? "#f0fdf4"
                            : employee.employeeStatus === "On Leave"
                            ? "#fffbeb"
                            : "#f1f5f9"
                        }
                      />
                    </td>

                    {/* Total Goals */}

                    <td
                      style={{
                        padding: "13px 14px",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {employee.goals.total}
                    </td>

                    {/* Pending */}

                    <td
                      style={{
                        padding: "13px 14px",
                        fontSize: "13.5px",
                        color:
                          employee.goals.pendingApproval > 0
                            ? "var(--amber)"
                            : "var(--subtext)",
                        fontWeight:
                          employee.goals.pendingApproval > 0 ? 700 : 500,
                      }}
                    >
                      {employee.goals.pendingApproval}
                    </td>

                    {/* Locked */}

                    <td
                      style={{
                        padding: "13px 14px",
                        fontSize: "13.5px",
                        color: "var(--text)",
                      }}
                    >
                      {employee.goals.locked}
                    </td>

                    {/* Revision */}

                    <td
                      style={{
                        padding: "13px 14px",
                        fontSize: "13.5px",
                        color:
                          employee.goals.revisionRequested > 0
                            ? "var(--red)"
                            : "var(--subtext)",
                        fontWeight:
                          employee.goals.revisionRequested > 0 ? 700 : 500,
                      }}
                    >
                      {employee.goals.revisionRequested}
                    </td>

                    {/* Self Assessment */}

                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {reviewStatusBadge(
                        employee.selfAssessment.submitted
                      )}
                    </td>

                    {/* Manager Review */}

                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {reviewStatusBadge(
                        employee.managerReview.submitted
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Review Cycle tab ---------------------------------- */

function PhaseStepper({ phase }) {
  const currentIndex = PHASES.indexOf(phase);
  return (
    <div style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "4px 0" }}>
      {PHASES.map((p, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={p} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "108px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? "var(--green)" : active ? "var(--primary)" : "var(--border)",
                  color: done || active ? "#fff" : "var(--subtext)",
                }}
              >
                {done ? <CheckCircle2 size={15} /> : <span style={{ fontSize: "11px", fontWeight: 700 }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: "11px", fontWeight: active ? 700 : 500, color: active ? "var(--text)" : "var(--subtext)", textAlign: "center" }}>{p}</span>
            </div>
            {i < PHASES.length - 1 && <div style={{ width: "36px", height: "2px", background: done ? "var(--green)" : "var(--border)", marginBottom: "22px" }} />}
          </div>
        );
      })}
    </div>
  );
}

function SubmitSelfAssessmentModal({ isOpen, onClose, goals, onSaved }) {
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const responses = goals.map((g) => ({
      goalId: g.id,
      rating: Number(ratings[g.id]) || 3,
      comments: comments[g.id] || "",
    }));
    const res = await submitSelfAssessment(responses);
    setSaving(false);
    onSaved(res.data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title="Submit Self-Assessment" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {goals.map((g) => (
          <div key={g.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
            <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>{g.title}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
              {fieldLabel("Self-rating (1�5)")}
              <select value={ratings[g.id] || 3} onChange={(e) => setRatings((p) => ({ ...p, [g.id]: e.target.value }))} style={{ ...inputStyle(false), height: "36px", width: "90px", cursor: "pointer" }}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {fieldLabel("Comments")}
              <textarea
                rows={2}
                value={comments[g.id] || ""}
                onChange={(e) => setComments((p) => ({ ...p, [g.id]: e.target.value }))}
                placeholder="Summarize progress and impact�"
                style={{ ...inputStyle(false), resize: "vertical" }}
              />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting�" : "Submit Self-Assessment"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ManagerTeamReviewPanel({ goals }) {
  const reviewableGoals = goals.filter((goal) => goal.status === "Locked");
  const employeeCodes = [...new Set(reviewableGoals.map((goal) => goal.employeeId))];
  const [employeeCode, setEmployeeCode] = useState(employeeCodes[0] || "");
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [managerReview, setManagerReview] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const employeeGoals = reviewableGoals.filter(
    (goal) => goal.employeeId === employeeCode
  );

  useEffect(() => {
    if (!employeeCode) return;

    setLoading(true);
    Promise.all([
      getSelfAssessment(employeeCode),
      getManagerReview(employeeCode),
    ])
      .then(([selfResult, managerResult]) => {
        const selfData = selfResult.data;
        const managerData = managerResult.data;
        setSelfAssessment(selfData);
        setManagerReview(managerData);

        const nextRatings = {};
        const nextComments = {};
        (managerData?.responses || []).forEach((response) => {
          nextRatings[response.goalId] = response.rating;
          nextComments[response.goalId] = response.comments || "";
        });
        setRatings(nextRatings);
        setComments(nextComments);
      })
      .catch((error) => {
        console.error("Failed to load direct-report review:", error);
        alert(error?.message || "Unable to load direct-report review");
      })
      .finally(() => setLoading(false));
  }, [employeeCode]);

  const handleSubmit = async () => {
    if (!selfAssessment?.submitted) {
      alert("The employee must submit their self-assessment first");
      return;
    }

    try {
      setSaving(true);
      const responses = employeeGoals.map((goal) => ({
        goalId: goal.id,
        rating: Number(ratings[goal.id]) || 3,
        comments: comments[goal.id] || "",
      }));
      const result = await submitManagerReview(employeeCode, responses);
      setManagerReview(result.data);
      alert("Manager review submitted successfully");
    } catch (error) {
      console.error("Failed to submit manager review:", error);
      alert(error?.message || "Unable to submit manager review");
    } finally {
      setSaving(false);
    }
  };

  if (employeeCodes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports ready for review"
        subtitle="Direct reports with locked goals will appear here."
      />
    );
  }

  return (
    <div style={{ ...cardStyle, padding: "20px 22px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>
        Direct Report Review
      </h3>
      <select
        value={employeeCode}
        onChange={(event) => setEmployeeCode(event.target.value)}
        style={{ ...inputStyle(false), height: "38px", maxWidth: "260px", marginBottom: "14px" }}
      >
        {employeeCodes.map((code) => <option key={code} value={code}>{code}</option>)}
      </select>

      {loading ? <Spinner /> : (
        <>
          <p style={{ fontSize: "12.5px", color: selfAssessment?.submitted ? "var(--green)" : "var(--red)", marginBottom: "12px" }}>
            Self-assessment: {selfAssessment?.submitted ? "Submitted" : "Pending"}
          </p>
          {employeeGoals.map((goal) => {
            const selfResponse = selfAssessment?.responses?.find(
              (response) => response.goalId === goal.id
            );
            return (
              <div key={goal.id} style={{ borderTop: "1px solid var(--border)", padding: "14px 0" }}>
                <strong style={{ fontSize: "13.5px", color: "var(--text)" }}>{goal.title}</strong>
                {selfResponse && (
                  <p style={{ fontSize: "12px", color: "var(--subtext)", margin: "6px 0" }}>
                    Employee: {selfResponse.rating}/5 — {selfResponse.comments || "No comments"}
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px" }}>
                  <select
                    value={ratings[goal.id] || 3}
                    onChange={(event) => setRatings((previous) => ({ ...previous, [goal.id]: event.target.value }))}
                    style={{ ...inputStyle(false), height: "38px" }}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}
                  </select>
                  <input
                    value={comments[goal.id] || ""}
                    onChange={(event) => setComments((previous) => ({ ...previous, [goal.id]: event.target.value }))}
                    placeholder="Manager comments"
                    style={inputStyle(false)}
                  />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <PrimaryButton onClick={handleSubmit} disabled={saving || !selfAssessment?.submitted}>
              {saving ? "Submitting..." : managerReview?.submitted ? "Update Manager Review" : "Submit Manager Review"}
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCycleTab({
  cycle,
  goals,
  selfAssessment,
  managerReview,
  onSelfAssessmentSubmitted,
  isAdmin,
  onCycleUpdated,
  isManager,
  managerGoals,
}) {
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [advancingPhase, setAdvancingPhase] = useState(false);

  if (!cycle) return <EmptyState icon={ClipboardCheck} title="No active review cycle" />;

  const phaseMeta = reviewPhaseMeta[cycle.phase];
  const canSubmitSelfAssessment =
    !isAdmin &&
    cycle.phase === "Self-Assessment" &&
    !selfAssessment.submitted &&
    goals.length > 0;
  const currentPhaseIndex = PHASES.indexOf(cycle.phase);
  const nextPhase = PHASES[currentPhaseIndex + 1];

  const handleAdvancePhase = async () => {
    if (!nextPhase) return;
    if (!window.confirm(`Advance review cycle to ${nextPhase}?`)) return;

    try {
      setAdvancingPhase(true);
      const res = await advanceReviewCyclePhase(nextPhase);
      onCycleUpdated(res.data);
    } catch (error) {
      console.error("Failed to advance review cycle:", error);
      alert(error?.message || "Unable to advance review cycle");
    } finally {
      setAdvancingPhase(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ ...cardStyle, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{cycle.name}</h2>
            <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "2px" }}>Current phase</p>
          </div>
          <StatusBadge label={cycle.phase} color={phaseMeta.color} bg={phaseMeta.bg} />
        </div>
        <PhaseStepper phase={cycle.phase} />
        {isAdmin && nextPhase && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <PrimaryButton onClick={handleAdvancePhase} disabled={advancingPhase}>
              {advancingPhase ? "Advancing..." : `Advance to ${nextPhase}`}
            </PrimaryButton>
          </div>
        )}
      </div>

      {isManager && cycle.phase === "Manager Review" && (
        <ManagerTeamReviewPanel goals={managerGoals} />
      )}

      {/* Self-assessment */}
      <div style={{ ...cardStyle, padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Self-Assessment</h3>
          {canSubmitSelfAssessment && <PrimaryButton onClick={() => setShowSelfAssessment(true)}>Complete Self-Assessment</PrimaryButton>}
        </div>
        {selfAssessment.submitted ? (
          <>
            <p style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, marginBottom: "12px" }}>
              Submitted on {new Date(selfAssessment.submittedAt + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            {selfAssessment.responses.map((r) => {
              const goal = goals.find((g) => g.id === r.goalId);
              return (
                <div key={r.goalId} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{goal?.title || "Goal"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>{r.rating} / 5</span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "4px" }}>{r.comments}</p>
                </div>
              );
            })}
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--subtext)" }}>
            {cycle.phase === "Self-Assessment" ? "Not yet submitted for this cycle." : "The self-assessment window hasn't opened yet."}
          </p>
        )}
      </div>

      {/* Manager review */}
      <div style={{ ...cardStyle, padding: "20px 22px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "12px" }}>Manager Review</h3>
        {managerReview.submitted ? (
          <>
            <p style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, marginBottom: "12px" }}>
              Submitted on {new Date(managerReview.submittedAt + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            {managerReview.responses.map((r) => {
              const goal = goals.find((g) => g.id === r.goalId);
              return (
                <div key={r.goalId} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{goal?.title || "Goal"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>{r.rating} / 5</span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "4px" }}>{r.comments}</p>
                </div>
              );
            })}
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--subtext)" }}>
            {selfAssessment.submitted
              ? "Your manager hasn't submitted their review yet � you'll be notified once it's ready."
              : "Manager review opens once your self-assessment is submitted."}
          </p>
        )}
      </div>

      {/* 360 status */}
      {cycle.is360Enabled && (
        <div style={{ ...cardStyle, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={16} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>360� Feedback</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--subtext)" }}>
            {cycle.peerResponsesReceived} of {cycle.peerReviewersNominated} nominated peers have responded.
            Results are shown to you only as an anonymized summary once the cycle completes � individual reviewers are never identified.
          </p>
        </div>
      )}

      <SubmitSelfAssessmentModal isOpen={showSelfAssessment} onClose={() => setShowSelfAssessment(false)} goals={goals} onSaved={onSelfAssessmentSubmitted} />
    </div>
  );
}

/* ---------------------------------- Feedback tab ---------------------------------- */

function GiveFeedbackModal({ isOpen, onClose, goals, onSaved }) {
  const [recipientId, setRecipientId] = useState("");
  const [type, setType] = useState("Praise");
  const [goalTag, setGoalTag] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!recipientId) e.recipientId = "Choose who this is for";
    if (!message.trim()) e.message = "Write your feedback";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const entry = {
      toEmployeeCode: recipientId,
      type,
      goalTag: goalTag || null,
      message: message.trim(),
      private: isPrivate,
    };

    try {
      const res = await addFeedback(entry);
      onSaved(res.data);
      onClose();
      setRecipientId("");
      setType("Praise");
      setGoalTag("");
      setMessage("");
      setIsPrivate(false);
    } catch (error) {
      console.error("Failed to send feedback:", error);
      alert(error?.message || "Unable to send feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Give Feedback" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("For *")}
          <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} style={{ ...inputStyle(errors.recipientId), height: "38px", cursor: "pointer" }}>
            <option value="">Select colleague</option>
            {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name} � {c.role}</option>)}
          </select>
          {errors.recipientId && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.recipientId}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Type")}
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
              {["Praise", "Constructive", "General"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Tag to a goal (optional)")}
            <select value={goalTag} onChange={(e) => setGoalTag(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
              <option value="">None</option>
              {goals.map((g) => <option key={g.id} value={g.title}>{g.title}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Message *")}
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Be specific and constructive�"
            style={{ ...inputStyle(errors.message), resize: "vertical" }}
          />
          {errors.message && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.message}</span>}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          Mark private to their manager (not shown to the recipient directly)
        </label>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Sending..." : "Send Feedback"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function FeedbackCard({ entry, currentEmployeeCode, organizationView }) {
  const meta = feedbackTypeMeta[entry.type] || feedbackTypeMeta.General;
  const isReceived = entry.toId === currentEmployeeCode;
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
            {organizationView
              ? `${entry.fromName} → ${entry.toName}`
              : isReceived
                ? `From ${entry.fromName}`
                : `To ${entry.toName}`}
          </span>
          {entry.goalTag && (
            <div style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "2px" }}>on �{entry.goalTag}�</div>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
          {entry.private && <StatusBadge label="Private to manager" color="#64748b" bg="#f1f5f9" />}
          <StatusBadge label={entry.type} color={meta.color} bg={meta.bg} />
        </div>
      </div>
      <p style={{ fontSize: "13.5px", color: "var(--text)", lineHeight: 1.5 }}>{entry.message}</p>
      <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "8px" }}>
        {new Date(entry.createdAt + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}

function FeedbackTab({ feedback, goals, onFeedbackAdded, organizationView }) {
  const [showGive, setShowGive] = useState(false);
  const [filter, setFilter] = useState("all");
  const currentEmployeeCode = getCurrentEmployeeCode();

  const filtered = feedback.filter((f) => {
    if (filter === "received") return f.toId === currentEmployeeCode;
    if (filter === "given") return f.fromId === currentEmployeeCode;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        {!organizationView && <div style={{ display: "flex", gap: "6px" }}>
          {[["all", "All"], ["received", "Received"], ["given", "Given"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: "6px 14px",
                borderRadius: "99px",
                border: `1px solid ${filter === key ? "var(--primary)" : "var(--border)"}`,
                background: filter === key ? "var(--primary-light)" : "var(--card)",
                color: filter === key ? "var(--primary)" : "var(--subtext)",
                fontWeight: 600,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>}
        {!organizationView && <PrimaryButton onClick={() => setShowGive(true)}><Plus size={16} /> Give Feedback</PrimaryButton>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback here yet" subtitle="Continuous feedback logged during the cycle will show up here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((f) => (
            <FeedbackCard
              key={f.id}
              entry={f}
              currentEmployeeCode={currentEmployeeCode}
              organizationView={organizationView}
            />
          ))}
        </div>
      )}

      <GiveFeedbackModal isOpen={showGive} onClose={() => setShowGive(false)} goals={goals} onSaved={onFeedbackAdded} />
    </div>
  );
}

/* ---------------------------------- 1:1s tab ---------------------------------- */

function AddNoteModal({ isOpen, onClose, onSaved }) {
  const currentEmployeeCode = getCurrentEmployeeCode();
  const availableColleagues = colleagues.filter(
    (colleague) => colleague.id !== currentEmployeeCode
  );
  const [withEmployeeCode, setWithEmployeeCode] = useState("");
  const [date, setDate] = useState("");
  const [agendaText, setAgendaText] = useState("");
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState([{ text: "" }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const updateAI = (i, value) => setActionItems((prev) => prev.map((a, idx) => (idx === i ? { text: value } : a)));
  const addAI = () => setActionItems((prev) => [...prev, { text: "" }]);
  const removeAI = (i) => setActionItems((prev) => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    if (!withEmployeeCode) e.withEmployeeCode = "Required";
    if (!date) e.date = "Required";
    if (!agendaText.trim()) e.agendaText = "Add at least one agenda topic";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await addOneOnOne({
        withEmployeeCode,
        date,
        agenda: agendaText.split("\n").map((s) => s.trim()).filter(Boolean),
        actionItems: actionItems.filter((a) => a.text.trim()).map((a) => ({ text: a.text.trim(), done: false })),
        notes,
      });
      onSaved(res.data);
      onClose();
      setWithEmployeeCode("");
      setDate("");
      setAgendaText("");
      setNotes("");
      setActionItems([{ text: "" }]);
    } catch (error) {
      console.error("Failed to save 1:1:", error);
      alert(error?.response?.data?.message || "Unable to save the 1:1 note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="New 1:1 Note" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("With")}
            <select value={withEmployeeCode} onChange={(e) => setWithEmployeeCode(e.target.value)} style={inputStyle(errors.withEmployeeCode)}>
              <option value="">Select employee or manager</option>
              {availableColleagues.map((colleague) => (
                <option key={colleague.id} value={colleague.id}>{colleague.name} - {colleague.role}</option>
              ))}
            </select>
            {errors.withEmployeeCode && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.withEmployeeCode}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Date *")}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle(errors.date)} />
            {errors.date && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.date}</span>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Agenda (one topic per line) *")}
          <textarea rows={3} value={agendaText} onChange={(e) => setAgendaText(e.target.value)} placeholder={"Sprint blockers\nCareer growth check-in"} style={{ ...inputStyle(errors.agendaText), resize: "vertical" }} />
          {errors.agendaText && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.agendaText}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {fieldLabel("Action items")}
          {actionItems.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input value={a.text} onChange={(e) => updateAI(i, e.target.value)} placeholder={`Action item ${i + 1}`} style={inputStyle(false)} />
              {actionItems.length > 1 && (
                <button type="button" onClick={() => removeAI(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--subtext)" }}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addAI} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "5px", border: "none", background: "none", color: "var(--primary)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", padding: "2px 0" }}>
            <Plus size={14} /> Add action item
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Notes")}
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Free-form notes from the conversation�" style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : "Save Note"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function OneOnOneCard({ note, onToggleAction }) {
  return (
    <div style={{ ...cardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>1:1 with {note.withName}</h3>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{note.withRole}</p>
        </div>
        <span style={{ fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
          {new Date(note.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      {note.agenda?.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>Agenda</p>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            {note.agenda.map((item, i) => (
              <li key={i} style={{ fontSize: "13px", color: "var(--text)", marginBottom: "2px" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {note.notes && (
        <p style={{ fontSize: "13px", color: "var(--subtext)", lineHeight: 1.5, marginBottom: "10px" }}>{note.notes}</p>
      )}

      {note.actionItems?.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>Action Items</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {note.actionItems.map((a) => (
              <button
                key={a.id}
                onClick={() => onToggleAction(note.id, a.id)}
                style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", background: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
              >
                {a.done ? <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} /> : <Circle size={16} style={{ color: "var(--subtext)", flexShrink: 0 }} />}
                <span style={{ fontSize: "13px", color: a.done ? "var(--subtext)" : "var(--text)", textDecoration: a.done ? "line-through" : "none" }}>{a.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OneOnOnesTab({ notes, onNoteAdded, onToggleAction, readOnly }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>1-on-1 Meeting Notes</h2>
        {!readOnly && <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> New 1:1</PrimaryButton>}
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={Users} title="No 1:1 notes yet" subtitle="Log notes from your check-ins to keep a running history." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notes.map((n) => <OneOnOneCard key={n.id} note={n} onToggleAction={onToggleAction} />)}
        </div>
      )}

      {!readOnly && <AddNoteModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onNoteAdded} />}
    </div>
  );
}

/* ---------------------------------- Ratings History tab ---------------------------------- */

function RatingsTable({ ratings, showEmployee = false }) {
  return (
    <div style={{ ...cardStyle, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
            {(showEmployee ? ["Employee", "Cycle", "Self Rating", "Manager Rating", "Final Rating", "Increment", "Promotion", "Released"] : ["Cycle", "Self Rating", "Manager Rating", "Final Rating", "Increment", "Promotion", "Released"]).map((heading) => (
              <th key={heading} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{heading}</th>
            ))}
          </tr></thead>
          <tbody>{ratings.map((rating, index) => (
            <tr key={`${rating.employeeId || "self"}-${rating.id || rating.cycle}`} style={{ borderBottom: index < ratings.length - 1 ? "1px solid var(--border)" : "none" }}>
              {showEmployee && <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}><div style={{ fontSize: "13.5px", fontWeight: 600 }}>{rating.employeeName}</div><div style={{ fontSize: "11px", color: "var(--subtext)" }}>{rating.employeeId}</div></td>}
              <td style={{ padding: "13px 16px", fontSize: "13.5px", fontWeight: 600 }}>{rating.cycle}</td>
              <td style={{ padding: "13px 16px", fontSize: "13.5px" }}>{rating.selfRating} / 5</td>
              <td style={{ padding: "13px 16px", fontSize: "13.5px" }}>{rating.originalManagerRating} / 5{rating.calibrationAdjusted && <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--amber)", fontWeight: 600 }}>(pre-calibration)</span>}</td>
              <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--primary)", fontWeight: 700 }}>{rating.finalRating} / 5</td>
              <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--green)", fontWeight: 600 }}>{rating.increment}</td>
              <td style={{ padding: "13px 16px" }}>{rating.promotion ? <StatusBadge label="Promoted" color="#16a34a" bg="#f0fdf4" /> : <span style={{ color: "var(--subtext)" }}>-</span>}</td>
              <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{new Date(`${rating.releasedOn}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function CalibrationPanel({ cycle, onReleased }) {
  const [data, setData] = useState({ candidates: [] });
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(null);

  const loadCandidates = async () => {
    try {
      const response = await getCalibrationCandidates();
      const calibration = response.data || { candidates: [] };
      setData(calibration);
      setForms((current) => {
        const next = { ...current };
        calibration.candidates.forEach((candidate) => {
          if (!next[candidate.employeeId]) {
            next[candidate.employeeId] = {
              finalRating: Math.max(1, Math.min(5, Math.round(candidate.managerRating || 3))),
              increment: "0%",
              promotion: false,
              appraisalLetterUrl: "",
            };
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Failed to load calibration candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCandidates(); }, []);

  const updateForm = (employeeId, field, value) => {
    setForms((current) => ({
      ...current,
      [employeeId]: { ...current[employeeId], [field]: value },
    }));
  };

  const release = async (candidate) => {
    const form = forms[candidate.employeeId];
    if (!form?.increment.trim()) return alert("Increment is required, for example 8% or 0%");
    setReleasing(candidate.employeeId);
    try {
      await releaseCalibratedRating({
        employeeId: candidate.employeeId,
        finalRating: Number(form.finalRating),
        increment: form.increment.trim(),
        promotion: Boolean(form.promotion),
        appraisalLetterUrl: form.appraisalLetterUrl.trim() || null,
      });
      await loadCandidates();
      await onReleased();
      alert(`Rating released for ${candidate.employeeName}`);
    } catch (error) {
      console.error("Failed to release rating:", error);
      alert(error?.response?.data?.message || "Unable to release the rating");
    } finally {
      setReleasing(null);
    }
  };

  if (loading) return <div style={{ ...cardStyle, padding: "20px" }}><Spinner /></div>;

  const phase = data.cycle?.phase || cycle?.phase;
  return <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
    <div><h2 style={{ fontSize: "15px", fontWeight: 700 }}>Calibration & Release</h2><p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "4px" }}>Final ratings become visible in employee history immediately after release.</p></div>
    {phase !== "Calibration" ? <div style={{ padding: "12px", borderRadius: "8px", background: "#fffbeb", color: "#92400e", fontSize: "13px" }}>Move the review cycle to <strong>Calibration</strong> before releasing ratings. Current phase: {phase || "Unknown"}.</div>
    : data.candidates.length === 0 ? <EmptyState icon={Award} title="No ratings awaiting calibration" subtitle="Manager reviews must be submitted and each employee can be released only once per cycle." />
    : data.candidates.map((candidate) => {
      const form = forms[candidate.employeeId] || {};
      return <div key={candidate.employeeId} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}><div><strong style={{ fontSize: "13.5px" }}>{candidate.employeeName}</strong><div style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{candidate.employeeId}</div></div><div style={{ fontSize: "12.5px" }}>Self: <strong>{candidate.selfRating ?? "N/A"}</strong> &nbsp; Manager: <strong>{candidate.managerRating ?? "N/A"}</strong></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>Final rating<select value={form.finalRating || 3} onChange={(event) => updateForm(candidate.employeeId, "finalRating", event.target.value)} style={{ ...inputStyle(false), marginTop: "5px" }}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>Increment<input value={form.increment || ""} onChange={(event) => updateForm(candidate.employeeId, "increment", event.target.value)} placeholder="e.g. 8%" style={{ ...inputStyle(false), marginTop: "5px" }} /></label>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>Appraisal letter URL<input value={form.appraisalLetterUrl || ""} onChange={(event) => updateForm(candidate.employeeId, "appraisalLetterUrl", event.target.value)} placeholder="Optional URL" style={{ ...inputStyle(false), marginTop: "5px" }} /></label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}><label style={{ fontSize: "12.5px", display: "flex", alignItems: "center", gap: "7px" }}><input type="checkbox" checked={Boolean(form.promotion)} onChange={(event) => updateForm(candidate.employeeId, "promotion", event.target.checked)} /> Promotion approved</label><PrimaryButton disabled={releasing === candidate.employeeId} onClick={() => release(candidate)}>{releasing === candidate.employeeId ? "Releasing..." : "Release Rating"}</PrimaryButton></div>
      </div>;
    })}
  </div>;
}

function RatingsTab({ ratings, teamRatings, organizationView, cycle, onRatingsChanged }) {
  if (organizationView) {
    const records = ratings?.records || [];
    const summary = ratings?.summary || {};
    return <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <CalibrationPanel cycle={cycle} onReleased={onRatingsChanged} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
        {[['Employees Rated', `${summary.employeesWithRatings || 0} / ${summary.employees || 0}`], ['Rating Records', summary.totalRecords || 0], ['Average Final Rating', summary.averageFinalRating == null ? '-' : `${summary.averageFinalRating} / 5`]].map(([label, value]) => <div key={label} style={{ ...cardStyle, padding: "18px 20px" }}><p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>{label}</p><p style={{ fontSize: "24px", fontWeight: 800, color: "var(--primary)", marginTop: "8px" }}>{value}</p></div>)}
      </div>
      {records.length ? <RatingsTable ratings={records} showEmployee /> : <EmptyState icon={Award} title="No organization ratings released yet" />}
    </div>;
  }

  const directReportRecords = (teamRatings?.employees || []).flatMap((employee) =>
    employee.ratings.map((rating) => ({ ...rating, employeeId: employee.employeeId, employeeName: employee.name }))
  );

  if (ratings.length === 0) {
    return <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <EmptyState icon={Award} title="No personal ratings history yet" />
      {teamRatings && <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><h2 style={{ fontSize: "14px", fontWeight: 700 }}>Direct Report Ratings</h2>{directReportRecords.length ? <RatingsTable ratings={directReportRecords} showEmployee /> : <EmptyState icon={Users} title="No direct-report ratings released yet" />}</div>}
    </div>;
  }

  const latest = ratings[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Latest Rating</p>
          <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--primary)" }}>{latest.finalRating} / 5</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>{latest.cycle}</p>
        </div>
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Latest Increment</p>
          <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--green)" }}>{latest.increment}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>{latest.promotion ? "+ Promotion" : "No promotion this cycle"}</p>
        </div>
        <div style={{ ...cardStyle, padding: "18px 20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Appraisal Letter</p>
          {latest.appraisalLetterUrl && latest.appraisalLetterUrl !== "#" ? <a href={latest.appraisalLetterUrl} style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>Download PDF</a> : <span style={{ fontSize: "13px", color: "var(--subtext)" }}>Not available</span>}
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "6px" }}>
            Released {new Date(latest.releasedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <RatingsTable ratings={ratings} />
      {teamRatings && <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><h2 style={{ fontSize: "14px", fontWeight: 700 }}>Direct Report Ratings</h2>{directReportRecords.length ? <RatingsTable ratings={directReportRecords} showEmployee /> : <EmptyState icon={Users} title="No direct-report ratings released yet" />}</div>}
      {/* legacy table removed */}
      {false && <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                {["Cycle", "Self Rating", "Manager Rating", "Final Rating", "Increment", "Promotion", "Released"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ratings.map((r, i) => (
                <tr key={r.cycle} style={{ borderBottom: i < ratings.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{r.cycle}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{r.selfRating} / 5</td>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>
                    {r.originalManagerRating} / 5
                    {r.calibrationAdjusted && (
                      <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--amber)", fontWeight: 600 }}>(pre-calibration)</span>
                    )}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--primary)", fontWeight: 700 }}>{r.finalRating} / 5</td>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--green)", fontWeight: 600 }}>{r.increment}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {r.promotion ? <StatusBadge label="Promoted" color="#16a34a" bg="#f0fdf4" /> : <span style={{ fontSize: "12.5px", color: "var(--subtext)" }}>�</span>}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                    {new Date(r.releasedOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "goals", label: "Goals & OKRs", icon: Target },
  { key: "review", label: "Review Cycle", icon: ClipboardCheck },
  { key: "feedback", label: "Feedback", icon: MessageSquare },
  { key: "oneOnOnes", label: "1:1s", icon: Users },
  { key: "ratings", label: "Ratings History", icon: Award },
];


function AdminEmployeeDetailModal({
  isOpen,
  onClose,
  detail,
  loading,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Employee Performance Details"
      onClose={onClose}
    >
      {loading ? (
        <Spinner />
      ) : !detail ? (
        <EmptyState
          icon={Users}
          title="No employee details"
          subtitle="Performance details could not be loaded."
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "4px",
              }}
            >
              {detail.employee.name}
            </h3>

            <p
              style={{
                fontSize: "12px",
                color: "var(--subtext)",
              }}
            >
              {detail.employee.employeeId} · {detail.cycle.name}
            </p>
          </div>

          <div style={{ ...cardStyle, padding: "16px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "12px",
              }}
            >
              Goals
            </h4>

            {detail.goals.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--subtext)",
                }}
              >
                No goals for this cycle.
              </p>
            ) : (
              detail.goals.map((goal) => (
                <div
                  key={goal.id}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {goal.title}
                    </span>

                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--subtext)",
                      }}
                    >
                      {goal.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ ...cardStyle, padding: "16px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "12px",
              }}
            >
              Self-Assessment
            </h4>

            {detail.selfAssessment?.submitted ? (
              detail.selfAssessment.responses.map((response) => {
                const goal = detail.goals.find(
                  (g) => g.id === response.goalId
                );

                return (
                  <div
                    key={response.goalId}
                    style={{
                      padding: "10px 0",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "4px",
                      }}
                    >
                      {goal?.title || "Goal"}
                    </p>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--subtext)",
                        marginBottom: "4px",
                      }}
                    >
                      Rating: {response.rating} / 5
                    </p>

                    <p
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text)",
                      }}
                    >
                      {response.comments || "No comments"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--subtext)",
                }}
              >
                Self-assessment not submitted.
              </p>
            )}
          </div>

          <div style={{ ...cardStyle, padding: "16px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "12px",
              }}
            >
              Manager Review
            </h4>

            {detail.managerReview?.submitted ? (
              detail.managerReview.responses.map((response) => {
                const goal = detail.goals.find(
                  (g) => g.id === response.goalId
                );

                return (
                  <div
                    key={response.goalId}
                    style={{
                      padding: "10px 0",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "4px",
                      }}
                    >
                      {goal?.title || "Goal"}
                    </p>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--subtext)",
                        marginBottom: "4px",
                      }}
                    >
                      Rating: {response.rating} / 5
                    </p>

                    <p
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text)",
                      }}
                    >
                      {response.comments || "No comments"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--subtext)",
                }}
              >
                Manager review not submitted.
              </p>
            )}
          </div>

          <div style={{ ...cardStyle, padding: "16px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "12px",
              }}
            >
              Ratings History
            </h4>

            {detail.ratingsHistory.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--subtext)",
                }}
              >
                No previous ratings.
              </p>
            ) : (
              detail.ratingsHistory.map((rating) => (
                <div
                  key={rating.id}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {rating.cycle}
                    </span>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      {rating.finalRating} / 5
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Performance() {
  const role = localStorage.getItem("hrms_role");

  const isManager = role === "MANAGER";
  const isAdmin = role === "ADMIN";
  const isHR = role === "HR";

  // Admin + HR both get organization-wide read access.
  const hasOrgPerformanceView = isAdmin || isHR;

  const [activeTab, setActiveTab] = useState("goals");
  const [loading, setLoading] = useState(true);

  const [goals, setGoals] = useState([]);
  const [cycle, setCycle] = useState(null);

  const [selfAssessment, setSelfAssessment] = useState({
    submitted: false,
    responses: [],
  });

  const [managerReview, setManagerReview] = useState({
    submitted: false,
    responses: [],
  });

  const [feedback, setFeedback] = useState([]);
  const [oneOnOnes, setOneOnOnes] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [teamRatings, setTeamRatings] = useState(null);

  // Manager state
  const [managerGoals, setManagerGoals] = useState([]);
  const [managerActionId, setManagerActionId] = useState(null);

  const [goalView, setGoalView] = useState(
    isManager ? "team" : "mine"
  );

  // Admin / HR organization state
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminEmployees, setAdminEmployees] = useState([]);

  const [selectedAdminEmployee, setSelectedAdminEmployee] =
    useState(null);

  const [adminEmployeeDetail, setAdminEmployeeDetail] =
    useState(null);

  const [adminDetailLoading, setAdminDetailLoading] =
    useState(false);

  useEffect(() => {
    setLoading(true);

    // Admin/HR accounts are not guaranteed to be linked to an employee.
    // Keep the result slots stable without calling employee-scoped endpoints
    // that would reject and prevent the organization overview from loading.
    const requests = hasOrgPerformanceView
      ? [
          Promise.resolve({ data: [] }),
          getReviewCycle(),
          Promise.resolve({ data: { submitted: false, responses: [] } }),
          Promise.resolve({ data: { submitted: false, responses: [] } }),
          getAdminFeedback(),
          Promise.resolve({ data: [] }),
          getAdminRatingsHistory(),
        ]
      : [
          getGoals(),
          getReviewCycle(),
          getSelfAssessment(),
          getManagerReview(),
          getFeedback(),
          getOneOnOnes(),
          getRatingsHistory(),
        ];

    // Manager gets team goals.
    if (isManager) {
      requests.push(getManagerGoals());
      requests.push(getManagerRatingsHistory());
    }

    // Admin + HR get organization-wide Performance data.
    if (hasOrgPerformanceView) {
      requests.push(getAdminPerformanceOverview());
      requests.push(getAdminEmployeesPerformance());
    }

    Promise.all(requests)
      .then((results) => {
        const [g, c, sa, mr, fb, oo, r] = results;

        let index = 7;

        let managerGoalsResult = null;
        let managerRatingsResult = null;
        let adminOverviewResult = null;
        let adminEmployeesResult = null;

        if (isManager) {
          managerGoalsResult = results[index++];
          managerRatingsResult = results[index++];
        }

        if (hasOrgPerformanceView) {
          adminOverviewResult = results[index++];
          adminEmployeesResult = results[index++];
        }

        // Common logged-in-user data
        setGoals(g?.data || []);
        setCycle(c?.data || null);

        setSelfAssessment(
          sa?.data || {
            submitted: false,
            responses: [],
          }
        );

        setManagerReview(
          mr?.data || {
            submitted: false,
            responses: [],
          }
        );

        setFeedback(fb?.data || []);
        setOneOnOnes(oo?.data || []);
        setRatings(r?.data || []);

        // Manager data
        if (isManager && managerGoalsResult) {
          setManagerGoals(
            managerGoalsResult.data || []
          );
        }
        if (isManager && managerRatingsResult) {
          setTeamRatings(managerRatingsResult.data || { employees: [] });
        }

        // Admin / HR organization overview
        if (
          hasOrgPerformanceView &&
          adminOverviewResult
        ) {
          setAdminOverview(
            adminOverviewResult.data || null
          );
        }

        // Admin / HR employee list
        if (
          hasOrgPerformanceView &&
          adminEmployeesResult
        ) {
          setAdminEmployees(
            adminEmployeesResult.data?.employees || []
          );
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load performance data:",
          error
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isManager, hasOrgPerformanceView]);

  /* ---------------------------------------------------------------------- */
  /* Manager goal actions                                                   */
  /* ---------------------------------------------------------------------- */

  const handleApproveManagerGoal = async (goalId) => {
    try {
      setManagerActionId(goalId);

      const res =
        await approveManagerGoal(goalId);

      setManagerGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? res.data
            : goal
        )
      );
    } catch (error) {
      console.error(
        "Failed to approve goal:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Unable to approve goal"
      );
    } finally {
      setManagerActionId(null);
    }
  };

  const handleRejectManagerGoal = async (goalId) => {
    try {
      setManagerActionId(goalId);

      const res =
        await rejectManagerGoal(goalId);

      setManagerGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? res.data
            : goal
        )
      );
    } catch (error) {
      console.error(
        "Failed to request revision:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Unable to request revision"
      );
    } finally {
      setManagerActionId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 1-on-1 action toggle                                                   */
  /* ---------------------------------------------------------------------- */

  const handleToggleAction = async (
    noteId,
    actionId
  ) => {
    try {
      const response = await toggleActionItem(noteId, actionId);
      const updatedAction = response.data;
      setOneOnOnes((prev) => prev.map((note) =>
        note.id === noteId
          ? { ...note, actionItems: note.actionItems.map((action) => action.id === actionId ? { ...action, ...updatedAction } : action) }
          : note
      ));
    } catch (error) {
      console.error("Failed to update 1:1 action item:", error);
      alert(error?.response?.data?.message || "Unable to update the action item");
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Admin / HR employee detail                                             */
  /* ---------------------------------------------------------------------- */

  const handleOpenAdminEmployee = async (
    employeeId
  ) => {
    try {
      setAdminDetailLoading(true);
      setSelectedAdminEmployee(employeeId);

      const res =
        await getAdminEmployeePerformanceDetail(
          employeeId
        );

      setAdminEmployeeDetail(res.data);
    } catch (error) {
      console.error(
        "Failed to load employee performance detail:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Unable to load employee performance details"
      );

      setSelectedAdminEmployee(null);
    } finally {
      setAdminDetailLoading(false);
    }
  };

  const handleCloseAdminEmployee = () => {
    setSelectedAdminEmployee(null);
    setAdminEmployeeDetail(null);
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
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
        }}
      >
        <PageHeader
          title="Performance"
          subtitle={
            cycle
              ? `${cycle.name} · Goals, reviews and feedback`
              : "Goals, reviews and feedback"
          }
        />

        <TabNav
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* --------------------------------------------------------------- */}
        {/* Goals / Organization Performance                               */}
        {/* --------------------------------------------------------------- */}

        {activeTab === "goals" && (
          <>
            {hasOrgPerformanceView ? (
              <AdminPerformanceOverview
                overview={adminOverview}
                employees={adminEmployees}
                onOpenEmployee={
                  handleOpenAdminEmployee
                }
              />
            ) : (
              <>
                {/* Manager Team/My Goals switch */}

                {isManager && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginBottom: "18px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setGoalView("team")
                      }
                      style={{
                        padding: "7px 15px",
                        borderRadius: "99px",

                        border: `1px solid ${
                          goalView === "team"
                            ? "var(--primary)"
                            : "var(--border)"
                        }`,

                        background:
                          goalView === "team"
                            ? "var(--primary-light)"
                            : "var(--card)",

                        color:
                          goalView === "team"
                            ? "var(--primary)"
                            : "var(--subtext)",

                        fontWeight: 600,
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      Team Goals
                    </button>

                    <button
                      onClick={() =>
                        setGoalView("mine")
                      }
                      style={{
                        padding: "7px 15px",
                        borderRadius: "99px",

                        border: `1px solid ${
                          goalView === "mine"
                            ? "var(--primary)"
                            : "var(--border)"
                        }`,

                        background:
                          goalView === "mine"
                            ? "var(--primary-light)"
                            : "var(--card)",

                        color:
                          goalView === "mine"
                            ? "var(--primary)"
                            : "var(--subtext)",

                        fontWeight: 600,
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      My Goals
                    </button>
                  </div>
                )}

                {/* Manager team goals OR logged-in employee goals */}

                {isManager &&
                goalView === "team" ? (
                  <ManagerGoalsTab
                    goals={managerGoals}
                    actionId={managerActionId}
                    onApprove={
                      handleApproveManagerGoal
                    }
                    onReject={
                      handleRejectManagerGoal
                    }
                  />
                ) : (
                  <GoalsTab
                    goals={goals}
                    cycle={cycle}
                    onGoalAdded={(g, isUpdate = false) =>
                      setGoals((prev) =>
                        isUpdate
                          ? prev.map((goal) =>
                              goal.id === g.id ? g : goal
                            )
                          : [g, ...prev]
                      )
                    }
                  />
                )}
              </>
            )}
          </>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Review Cycle                                                     */}
        {/* --------------------------------------------------------------- */}

        {activeTab === "review" && (
          <ReviewCycleTab
            cycle={cycle}
            goals={goals}
            selfAssessment={selfAssessment}
            managerReview={managerReview}
            onSelfAssessmentSubmitted={
              setSelfAssessment
            }
            isAdmin={isAdmin}
            onCycleUpdated={setCycle}
            isManager={isManager}
            managerGoals={managerGoals}
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Feedback                                                         */}
        {/* --------------------------------------------------------------- */}

        {activeTab === "feedback" && (
          <FeedbackTab
            feedback={feedback}
            goals={goals}
            onFeedbackAdded={(f) =>
              setFeedback((prev) => [
                f,
                ...prev,
              ])
            }
            organizationView={hasOrgPerformanceView}
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* 1:1                                                             */}
        {/* --------------------------------------------------------------- */}

        {activeTab === "oneOnOnes" && (
          <OneOnOnesTab
            notes={oneOnOnes}
            onNoteAdded={(n) =>
              setOneOnOnes((prev) => [
                n,
                ...prev,
              ])
            }
            onToggleAction={
              handleToggleAction
            }
            readOnly={hasOrgPerformanceView}
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Ratings                                                          */}
        {/* --------------------------------------------------------------- */}

        {activeTab === "ratings" && (
          <RatingsTab ratings={ratings} teamRatings={isManager ? teamRatings : null} organizationView={hasOrgPerformanceView} cycle={cycle} onRatingsChanged={async () => { const response = await getAdminRatingsHistory(); setRatings(response.data || { records: [], summary: {} }); }} />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Admin / HR employee drill-down modal                             */}
        {/* --------------------------------------------------------------- */}

        {hasOrgPerformanceView && (
          <AdminEmployeeDetailModal
            isOpen={Boolean(
              selectedAdminEmployee
            )}
            onClose={
              handleCloseAdminEmployee
            }
            detail={adminEmployeeDetail}
            loading={adminDetailLoading}
          />
        )}
      </div>
    </MainLayout>
  );
}
