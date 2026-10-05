/**
 * Task Management Page — Module 13
 * Views: Kanban Board • Calendar (deadline) View • Projects
 */

import { useState, useEffect } from "react";
import {
  KanbanSquare,
  CalendarDays,
  FolderKanban,
  Plus,
  Clock,
  AlertTriangle,
  UserX,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getProjects,
  addProject,
  addMilestone,
  getTasks,
  addTask,
  updateTaskStatus,
  reassignTask,
  getTaskHistory,
  getOrphanedTasks,
  getTimeEntries,
  logTimeEntry,
  getTaskMeta,
  deleteTask,
  updateTask
} from "../../services/taskService";
import { useAuth } from "../../context/AuthContext";

const fmtDate = (value) => {
  if (!value) return "—";
  const dateOnly = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateForInputDisplay = (value) => {
  if (!value) return "—";
  const dateOnly = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

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

/* ---------------------------------- Create Task modal ---------------------------------- */

function CreateTaskModal({
  isOpen,
  onClose,
  projects,
  employees,
  priorities,
  currentEmployee,
  tasks,
  onSaved,
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [milestoneId, setMilestoneId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(
    currentEmployee?.id || ""
  );
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [subtasksInput, setSubtasksInput] = useState("");
  const [blockerTaskIds, setBlockerTaskIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const project = projects.find((p) => p.id === projectId);
  const assignableEmployees = employees.filter(
    (e) =>
      e.isActive &&
      (project ? project.members.includes(e.id) : true)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !dueDate) return;
    setSaving(true);
    const subtasks = subtasksInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    try {
      const res = await addTask({
        projectId,
        milestoneId: milestoneId || null,
        title: title.trim(),
        assigneeId,
        priority,
        dueDate,
        comments: description.trim(),
        blockerTaskIds,
        subtasks,
      });
      onSaved(res.data);
      onClose();
      setTitle(""); setDescription(""); setDueDate(""); setMilestoneId(""); setPriority("Medium"); setSubtasksInput(""); setBlockerTaskIds([]);
    } catch (submitError) {
      setError(submitError.message || "Could not create the task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Create Task" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project *")}
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setMilestoneId(""); setBlockerTaskIds([]); }} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {project?.milestones.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Milestone")}
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              <option value="">None</option>
              {project.milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Description")}
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Assignee *")}
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              {assignableEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Priority *")}
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Due Date *")}
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Checklist (optional)")}
          <textarea
            rows={3}
            value={subtasksInput}
            onChange={(e) => setSubtasksInput(e.target.value)}
            placeholder="Add one checklist item per line"
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Blocked by (optional)")}
          <div style={{ display: "grid", gap: "6px", maxHeight: "140px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px" }}>
            {tasks.filter((task) => task.projectId === projectId).length === 0 ? (
              <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>No other tasks in this project yet.</span>
            ) : tasks.filter((task) => task.projectId === projectId).map((task) => (
              <label key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--label)" }}>
                <input
                  type="checkbox"
                  checked={blockerTaskIds.includes(task.id)}
                  onChange={(event) => setBlockerTaskIds((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))}
                />
                <span>{task.title} <span style={{ color: "var(--subtext)" }}>({task.status})</span></span>
              </label>
            ))}
          </div>
        </div>
        {error && <p role="alert" style={{ fontSize: "12px", color: "var(--red)", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", position: "sticky", bottom: "-24px", background: "var(--card)", padding: "12px 0 4px", marginTop: "4px", borderTop: "1px solid var(--border)" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Creating..." : "Create Task"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------- Force-close modal ---------------------------------- */

function ForceCloseModal({ isOpen, onClose, task, openBlockers = [], openSubtasks = [], onResolved, canWrite, currentEmployee }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasBlockers = openBlockers.length > 0;
  const hasOpenSubtasks = openSubtasks.length > 0;
  const canForceClose = hasBlockers && !hasOpenSubtasks && canWrite && task?.projectLeadId === currentEmployee?.id;
  const blockerText = hasBlockers ? openBlockers.map((b) => b.title).join(", ") : "";

  const handleForceClose = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const res = await updateTaskStatus(task.id, "Done", { force: true, reason: reason.trim() });
      onResolved(res.data?.task ?? res.data);
      onClose();
      setReason("");
    } catch (error) {
      setErrorMessage(error.message || "Could not close this task.");
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} title={hasBlockers ? `Force-close — ${task.title}` : `Task blocked — ${task.title}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <AlertTriangle size={16} style={{ color: hasBlockers ? "var(--amber, #d97706)" : "var(--red)", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
            {hasOpenSubtasks ? (
              <>Complete these open checklist items before closing the task: <strong>{openSubtasks.join(", ")}</strong>.</>
            ) : hasBlockers ? (
              <>
                This task has open blocker(s): <strong>{blockerText}</strong>. Only the Project Lead can force-close past these with a reason logged to Task History.
              </>
            ) : (
              <>
                This task still has open checklist items: <strong>{openSubtasks.join(", ")}</strong>. Complete the checklist before moving it to Done.
              </>
            )}
          </p>
        </div>
        {canForceClose && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Reason for force-close *")}
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
          </div>
        )}
        {errorMessage && <p role="alert" style={{ color: "var(--red)", margin: 0 }}>{errorMessage}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          {canForceClose ? (
            <PrimaryButton onClick={handleForceClose} disabled={saving || !reason.trim()}>{saving ? "Closing..." : "Force-close as Done"}</PrimaryButton>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Task detail / time log modal ---------------------------------- */

function TaskDetailModal({
  isOpen,
  onClose,
  task,
  statusMeta,
  canWrite,
  currentEmployee,
  canLogTime,
  onDelete,
  priorities,
  onSaved,
}) {
  const taskId = task?.id;
  const [entries, setEntries] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);
  const [priority, setPriority] = useState(task?.priority || "Medium");
  const [comments, setComments] = useState(task?.comments || "");
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    if (!taskId) return undefined;
    let active = true;
    Promise.all([getTimeEntries(taskId), getTaskHistory(taskId)])
      .then(([timeEntries, history]) => {
        if (!active) return;
        setEntries(timeEntries.data);
        setTaskHistory(history.data);
      })
      .catch((error) => console.error("Failed to load task details:", error));
    return () => { active = false; };
  }, [taskId]);

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!hours) return;
    if (!currentEmployee) return;
    setLogging(true);
    const entry = await logTimeEntry({
      taskId: task.id,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      date: new Date().toISOString().slice(0, 10),
      hours,
      note: note.trim(),
    });
    setEntries((prev) => [entry.data, ...prev]);
    setLogging(false);
    setHours(""); setNote("");
  };

  const handleSaveDetails = async () => {
    if (!task || !canWrite) return;
    setSavingDetails(true);
    try {
      const updated = await updateTask(task.id, { priority, subtasks });
      if (onSaved) onSaved(updated.data ?? updated);
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePostComment = async () => {
    if (!task || !canWrite || !comments.trim()) return;
    setSavingDetails(true);
    try {
      const updated = await updateTask(task.id, { comments: comments.trim() });
      if (onSaved) onSaved(updated.data ?? updated);
    } finally {
      setSavingDetails(false);
    }
  };

  const toggleSubtask = async (subtaskId) => {
    if (!task || !canWrite) return;
    const next = subtasks.map((item) => item.id === subtaskId ? { ...item, done: !item.done } : item);
    setSubtasks(next);
    await updateTask(task.id, { subtasks: next });
    if (onSaved) onSaved({ ...task, subtasks: next });
  };

  const addSubtask = async () => {
    const trimmed = newSubtask.trim();
    if (!trimmed || !task || !canWrite) return;
    const next = [...subtasks, { id: `subtask-${Date.now()}`, title: trimmed, done: false }];
    setSubtasks(next);
    setNewSubtask("");
    await updateTask(task.id, { subtasks: next });
    if (onSaved) onSaved({ ...task, subtasks: next });
  };

  if (!task) return null;
  const meta = statusMeta[task.status] || {};

  return (
    <Modal isOpen={isOpen} title={task.title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <StatusBadge label={task.status} color={meta.color} bg={meta.bg} />
          <span style={{ fontSize: "12px", color: "var(--subtext)" }}>Due {fmtDate(task.dueDate)} • {task.assigneeName}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Priority")}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!canWrite}
              style={{ ...inputStyle(), height: "38px", cursor: canWrite ? "pointer" : "default" }}
            >
              {priorities.map((p) => <option value={p} key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Due date")}
            <input value={formatDateForInputDisplay(task.dueDate)} readOnly style={{ ...inputStyle(), background: "var(--surface)", color: "var(--subtext)" }} />
          </div>
        </div>

        {canWrite && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton onClick={handleSaveDetails} disabled={savingDetails}>{savingDetails ? "Saving..." : "Save details"}</PrimaryButton>
          </div>
        )}

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            {fieldLabel("Comments")}
            {canWrite && (
              <button type="button" onClick={handlePostComment} disabled={savingDetails || !comments.trim()} style={{ border: "none", background: "none", color: comments.trim() ? "var(--primary)" : "var(--subtext)", fontWeight: 700, fontSize: "11.5px", cursor: comments.trim() ? "pointer" : "not-allowed" }}>
                Post
              </button>
            )}
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={!canWrite}
            rows={4}
            placeholder="Add team updates or blockers. Keep comments work-related and factual."
            style={{ ...inputStyle(), resize: "vertical", minHeight: "100px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {fieldLabel("Checklist")}
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add a subtask" style={{ ...inputStyle(), flex: 1 }} disabled={!canWrite} />
            <PrimaryButton type="button" onClick={addSubtask} disabled={!canWrite || !newSubtask.trim()} style={{ padding: "9px 12px" }}>Add</PrimaryButton>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {subtasks.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--subtext)" }}>No checklist items yet.</div>
            ) : (
              subtasks.map((subtask) => (
                <label key={subtask.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--subtext)" }}>
                  <input type="checkbox" checked={Boolean(subtask.done)} onChange={() => toggleSubtask(subtask.id)} disabled={!canWrite} />
                  <span style={{ textDecoration: subtask.done ? "line-through" : "none", color: subtask.done ? "var(--muted)" : "var(--text)" }}>{subtask.title}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--label)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={13} /> Log time ({totalHours}h logged)
          </h4>
          {canLogTime && (<form onSubmit={handleLogTime} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <input type="number" step="0.5" min="0.5" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} style={{ ...inputStyle(), width: "90px" }} />
            <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle()} />
            <PrimaryButton type="submit" disabled={logging || !hours} style={{ padding: "9px 14px" }}>{logging ? "..." : "Log"}</PrimaryButton>
          </form>)}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "110px", overflowY: "auto" }}>
            {entries.map((e) => (
              <div key={e.id} style={{ fontSize: "12px", color: "var(--subtext)" }}>
                {fmtDate(e.date)} • <strong>{e.hours}h</strong> • {e.employeeName}{e.note ? ` • ${e.note}` : ""}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--label)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <History size={13} /> History
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
            {taskHistory.map((h) => (
              <div key={h.id} style={{ fontSize: "12px", color: "var(--subtext)" }}>
                {fmtDate(h.date)} • <strong>{h.action}</strong> • {h.detail}
              </div>
            ))}
          </div>
        </div>

        {/* 👉 Delete Action Button */}
        <div style={{ borderTop: "1px solid var(--border, #eee)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              if (onDelete) onDelete(task.id);
              onClose();
            }}
            style={{
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete Task
          </button>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>

      </div>
    </Modal>
  );
}

/* ---------------------------------- Orphaned tasks banner ---------------------------------- */

function OrphanedTasksBanner({
  orphaned,
  employees = [],
  onReassigned,
  canWrite,
}) {
  const [reassignTarget, setReassignTarget] = useState(null);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);

  if (orphaned.length === 0) return null;

  const handleReassign = async () => {
    if (!newAssigneeId) return;
    setSaving(true);
    const res = await reassignTask(reassignTarget.id, newAssigneeId);
    setSaving(false);
    onReassigned(res.data);
    setReassignTarget(null);
    setNewAssigneeId("");
  };

  return (
    <div style={{ ...cardStyle, padding: "14px 18px", marginBottom: "16px", background: "#fef2f2", border: "1px solid #fecaca" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <UserX size={16} style={{ color: "var(--red)" }} />
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b" }}>Orphaned tasks — assignee no longer active</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {orphaned.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12.5px", color: "#991b1b" }}>
              <strong>{t.title}</strong> — was assigned to {t.assigneeName}
            </span>
            {canWrite && (
              <button
                onClick={() => setReassignTarget(t)}
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--primary)",
                  border: "none",
                  background: "none",
                  cursor: "pointer"
                }}
              >
                Reassign
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={!!reassignTarget} title={`Reassign — ${reassignTarget?.title || ""}`} onClose={() => setReassignTarget(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("New assignee *")}
            <select value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              <option value="">Select employee</option>
              {employees
                .filter((e) => e.isActive)
                .map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <SecondaryButton onClick={() => setReassignTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleReassign} disabled={saving || !newAssigneeId}>{saving ? "Reassigning..." : "Reassign"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------------- Kanban view ---------------------------------- */

function TaskCard({
  task,
  statuses,
  priorityMeta,
  onOpen,
  onMove,
  onBlockedAttempt,
  canMoveTask,
}) {
  const [movingDirection, setMovingDirection] = useState(null);
  const [moveError, setMoveError] = useState("");
  const meta = priorityMeta[task.priority] || {};
  const currentIndex = statuses.indexOf(task.status);
  const blockerStatus = new Map((task.blockers || []).map((blocker) => [blocker.id, blocker.status]));
  const openBlockers = (task.blockers || []).filter((blocker) => blocker.status !== "Done");
  const hasOpenBlockers = openBlockers.length > 0 ||
    (task.blockedByTaskIds || []).some((id) => blockerStatus.get(id) !== "Done");
  const hasOpenSubtasks = task.subtasks?.some((subtask) => !subtask.done) ?? false;
  const needsReassignment = !task.assigneeId || task.assigneeStatus !== "Active";

  const handleMove = async (direction) => {
    const nextStatus = direction < 0 && hasOpenBlockers && task.status !== "Todo"
      ? "Todo"
      : statuses[currentIndex + direction];
    if (!nextStatus || movingDirection !== null) return;
    if (needsReassignment || (hasOpenBlockers && nextStatus !== "Todo" && nextStatus !== "Done")) return;
    setMovingDirection(direction);
    setMoveError("");
    try {
      const res = await updateTaskStatus(task.id, nextStatus);
      if (res.data?.error === "blocked") {
        onBlockedAttempt(task, res.data.openBlockers || [], res.data.openSubtasks || []);
        return;
      }
      onMove(res.data?.task ?? res.data);
    } catch (error) {
      if (error.data?.error === "blocked") {
        onBlockedAttempt(task, error.data.openBlockers || [], error.data.openSubtasks || []);
        return;
      }
      setMoveError(error.message || "Could not update task status. Try again.");
    } finally {
      setMovingDirection(null);
    }
  };

  return (
    <div id={`task-${task.id}`} style={{ ...cardStyle, padding: "12px 14px", cursor: "pointer" }} onClick={() => onOpen(task)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{task.title}</h4>
        {task.priority !== "Medium" && <span aria-label={`Priority: ${task.priority}`} style={{ fontSize: "10px", fontWeight: 700, color: meta.color || "#475569", background: meta.bg || "#f1f5f9", padding: "3px 8px", borderRadius: "99px", whiteSpace: "nowrap" }}>{task.priority}</span>}
      </div>
      <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginBottom: "8px" }}>{task.assigneeName} • due {fmtDate(task.dueDate)}</p>
      {hasOpenBlockers && task.status !== "Done" && (
        <div style={{ fontSize: "10.5px", color: "var(--amber, #d97706)", marginBottom: "8px" }}>
          <strong>⚠ {openBlockers.length} {openBlockers.length === 1 ? "blocker" : "blockers"}:</strong>{" "}
          {openBlockers.map((blocker, index) => (
            <span key={blocker.id}>
              {index > 0 ? ", " : ""}
              <a href={`#task-${blocker.id}`} onClick={(event) => event.stopPropagation()} style={{ color: "inherit", textDecoration: "underline" }}>{blocker.title}</a>
            </span>
          ))}
        </div>
      )}
      {hasOpenBlockers && task.status !== "Todo" && <p style={{ fontSize: "10.5px", color: "var(--amber, #d97706)", marginBottom: "8px" }}>This task cannot progress until its blockers are done. Move it back to Todo to pause it.</p>}
      {needsReassignment && <p style={{ fontSize: "10.5px", color: "var(--red)", marginBottom: "8px" }}>Reassign this task before changing its status.</p>}
      {task.forceClosed && (
        <p style={{ fontSize: "10.5px", color: "var(--red)", marginBottom: "8px" }}>Force-closed: {task.forceCloseReason}</p>
      )}
      {moveError && (
        <p role="alert" style={{ fontSize: "11px", color: "var(--red)", marginBottom: "8px" }}>
          {moveError}
        </p>
      )}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
        {currentIndex > 0 && canMoveTask(task, hasOpenBlockers ? "Todo" : statuses[currentIndex - 1]) && (
          <button
            type="button"
            aria-label={`Move ${task.title} back to ${hasOpenBlockers ? "Todo" : statuses[currentIndex - 1]}`}
            title={needsReassignment ? "Reassign the inactive assignee first." : `Move back to ${hasOpenBlockers ? "Todo" : statuses[currentIndex - 1]}`}
            onClick={() => handleMove(-1)}
            disabled={movingDirection !== null || needsReassignment}
            style={{
              minHeight: "30px", padding: "5px 9px", border: "1px solid var(--border)",
              borderRadius: "6px", background: "var(--card)", color: "var(--label)",
              fontSize: "11px", fontWeight: 600, cursor: needsReassignment ? "not-allowed" : movingDirection !== null ? "wait" : "pointer",
              opacity: needsReassignment || movingDirection !== null ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {movingDirection === -1 ? "Updating…" : `← ${hasOpenBlockers ? "Todo" : statuses[currentIndex - 1]}`}
          </button>
        )}
        {currentIndex < statuses.length - 1 && canMoveTask(task, statuses[currentIndex + 1]) && (
          <button
            type="button"
            aria-label={`Move ${task.title} to ${statuses[currentIndex + 1]}`}
            title={needsReassignment
              ? "Reassign the inactive assignee first."
              : hasOpenBlockers && statuses[currentIndex + 1] !== "Todo" && statuses[currentIndex + 1] !== "Done"
                ? "Complete the blocking task before moving this task forward."
                : statuses[currentIndex + 1] === "Done" && hasOpenSubtasks
                  ? "Complete open checklist items before marking Done."
                : `Move to ${statuses[currentIndex + 1]}`}
            onClick={() => handleMove(1)}
            disabled={movingDirection !== null || needsReassignment || (hasOpenBlockers && statuses[currentIndex + 1] !== "Todo" && statuses[currentIndex + 1] !== "Done") || (statuses[currentIndex + 1] === "Done" && hasOpenSubtasks)}
            style={{
              minHeight: "30px", padding: "5px 10px", border: "1px solid var(--primary)",
              borderRadius: "6px", background: "color-mix(in srgb, var(--primary) 10%, white)",
              color: "var(--primary)", fontSize: "11px", fontWeight: 700,
              cursor: needsReassignment || (hasOpenBlockers && statuses[currentIndex + 1] !== "Todo" && statuses[currentIndex + 1] !== "Done") || (statuses[currentIndex + 1] === "Done" && hasOpenSubtasks) ? "not-allowed" : movingDirection !== null ? "wait" : "pointer", opacity: needsReassignment || (hasOpenBlockers && statuses[currentIndex + 1] !== "Todo" && statuses[currentIndex + 1] !== "Done") || (statuses[currentIndex + 1] === "Done" && hasOpenSubtasks) || movingDirection !== null ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {movingDirection === 1 ? "Updating…" : `${statuses[currentIndex + 1]} →`}
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanTab({
  tasks,
  statuses,
  priorityMeta,
  onOpen,
  onMove,
  onBlockedAttempt,
  canMoveTask,
}) {
  if (tasks.length === 0) return <EmptyState icon={KanbanSquare} title="No tasks yet" />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(170px, 1fr))", gap: "14px", overflowX: "auto" }}>
      {statuses.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status}>
            <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>
              {status} ({columnTasks.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "48px" }}>
              {columnTasks.length === 0 && <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0, padding: "8px 2px" }}>No tasks in this stage.</p>}
              {columnTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  statuses={statuses}
                  priorityMeta={priorityMeta}
                  onOpen={onOpen}
                  onMove={onMove}
                  onBlockedAttempt={onBlockedAttempt}
                  canMoveTask={canMoveTask}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Calendar (deadline) view ---------------------------------- */

function CalendarTab({
  tasks,
  statusMeta,
  onOpen,
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  if (tasks.length === 0) return <EmptyState icon={CalendarDays} title="No tasks yet" />;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const tasksByDate = new Map();
  tasks.forEach((task) => {
    const dayTasks = tasksByDate.get(task.dueDate) || [];
    dayTasks.push(task);
    tasksByDate.set(task.dueDate, dayTasks);
  });
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index - startOffset + 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, tasks: tasksByDate.get(key) || [] };
  });

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div aria-label="Calendar legend" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", fontSize: "11px", color: "var(--subtext)" }}>
        {Object.entries(statusMeta).map(([status, meta]) => (
          <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color }} />
            {status}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }} />
          Overdue (not Done)
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={{ ...cardStyle, padding: "7px 10px", color: "var(--primary)", cursor: "pointer" }}><ChevronLeft size={16} /></button>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: 0 }}>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={{ ...cardStyle, padding: "7px 10px", color: "var(--primary)", cursor: "pointer" }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: "840px", display: "grid", gridTemplateColumns: "repeat(7, minmax(110px, 1fr))", gap: "6px" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textAlign: "center", padding: "5px" }}>{day}</div>
          ))}
          {days.map(({ date, key, tasks: dayTasks }) => (
            <div key={key} style={{ minHeight: "108px", padding: "7px", border: "1px solid var(--border)", borderRadius: "8px", background: key === today ? "color-mix(in srgb, var(--primary) 7%, var(--card))" : "var(--card)", opacity: date.getMonth() === month.getMonth() ? 1 : 0.48 }}>
              <div style={{ fontSize: "11px", fontWeight: key === today ? 800 : 600, color: key === today ? "var(--primary)" : "var(--subtext)", marginBottom: "5px" }}>{date.getDate()}</div>
              <div style={{ display: "grid", gap: "4px" }}>
                {dayTasks.slice(0, 3).map((task) => {
                  const meta = statusMeta[task.status] || {};
                  const overdue = task.dueDate < today && task.status !== "Done";
                  return (
                    <button key={task.id} type="button" onClick={() => onOpen(task)} title={`${overdue ? "Overdue — " : ""}${task.title} — ${task.assigneeName}`} style={{ border: "none", borderLeft: `3px solid ${overdue ? "#dc2626" : meta.color || "var(--primary)"}`, borderRadius: "4px", padding: "4px 5px", textAlign: "left", background: meta.bg || "var(--background)", color: "var(--text)", cursor: "pointer", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {overdue && <strong style={{ color: "#dc2626" }}>Overdue · </strong>}{task.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && <span style={{ fontSize: "10px", color: "var(--subtext)" }}>+{dayTasks.length - 3} more</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Projects tab ---------------------------------- */

function CreateProjectModal({
  isOpen,
  onClose,
  onSaved,
  employees,
  currentEmployee,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [projectLeadId, setProjectLeadId] = useState(currentEmployee?.id || "");
  const [memberIds, setMemberIds] = useState(
    currentEmployee?.id ? [currentEmployee.id] : []
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [milestones, setMilestones] = useState([{ title: "", dueDate: "" }]);
  const [saving, setSaving] = useState(false);

  const visibleMembers = employees.filter((employee) => employee.isActive && employee.name.toLowerCase().includes(memberSearch.toLowerCase().trim()));

  const toggleMember = (id) => {
    setMemberIds((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (projectLeadId === id && !next.includes(id)) {
        setProjectLeadId(next[0] || "");
      }
      if (!projectLeadId && next.length > 0) {
        setProjectLeadId(next[0]);
      }
      return next;
    });
  };

  const updateMilestone = (index, field, value) => {
    setMilestones((prev) => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const addMilestoneRow = () => setMilestones((prev) => [...prev, { title: "", dueDate: "" }]);
  const removeMilestoneRow = (index) => {
    setMilestones((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Project name is required.");
      return;
    }
    if (memberIds.length === 0) {
      alert("A project must include at least one team member.");
      return;
    }
    if (!projectLeadId || !memberIds.includes(projectLeadId)) {
      alert("Choose a valid project lead from the selected team members.");
      return;
    }
    setSaving(true);
    const res = await addProject({
      name: name.trim(),
      description: description.trim() || null,
      memberIds,
      projectLeadId: projectLeadId || memberIds[0],
      startDate: startDate || null,
      targetEndDate: targetEndDate || null,
      milestones: milestones.filter((m) => m.title.trim() && m.dueDate).map((m) => ({ title: m.title.trim(), dueDate: m.dueDate })),
    });
    setSaving(false);
    onSaved(res.data);
    onClose();
    setName("");
    setDescription("");
    setStartDate("");
    setTargetEndDate("");
    setProjectLeadId(currentEmployee?.id || "");
    setMemberIds(currentEmployee?.id ? [currentEmployee.id] : []);
    setMilestones([{ title: "", dueDate: "" }]);
  };

  return (
    <Modal isOpen={isOpen} title="Create Project" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project purpose / description")}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Start date")}
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Target end date")}
            <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project lead")}
          <select value={projectLeadId} onChange={(e) => setProjectLeadId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
            {employees.filter((employee) => memberIds.includes(employee.id)).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel(`Team Members (${memberIds.length} selected)`) }
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search team members"
            style={{ ...inputStyle(), marginBottom: "6px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", maxHeight: "180px", overflowY: "auto" }}>
            {visibleMembers.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--subtext)" }}>No matching team members.</div>
            ) : (
              visibleMembers.map((employee) => (
                <label key={employee.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "6px", cursor: "pointer" }}>
                  <input type="checkbox" checked={memberIds.includes(employee.id)} onChange={() => toggleMember(employee.id)} />
                  <span>{employee.name}</span>
                  {projectLeadId === employee.id && <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, white)", borderRadius: "999px", padding: "2px 6px" }}>Lead</span>}
                </label>
              ))
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {fieldLabel("Milestones")}
            <button type="button" onClick={addMilestoneRow} style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--primary)", fontWeight: 700, fontSize: "12px", cursor: "pointer", borderRadius: "6px", padding: "5px 8px" }}>+ Add milestone</button>
          </div>
          {milestones.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--subtext)" }}>No milestones added yet.</div>
          ) : (
            milestones.map((milestone, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: "8px", alignItems: "center" }}>
                <input value={milestone.title} onChange={(e) => updateMilestone(index, "title", e.target.value)} placeholder="Milestone title" style={inputStyle()} />
                <input type="date" value={milestone.dueDate} onChange={(e) => updateMilestone(index, "dueDate", e.target.value)} style={inputStyle()} />
                <button
                  type="button"
                  onClick={() => removeMilestoneRow(index)}
                  aria-label={`Remove milestone ${index + 1}`}
                  style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--red)", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || memberIds.length === 0}>{saving ? "Creating..." : "Create Project"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AddMilestoneModal({ isOpen, onClose, project, onSaved }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    const res = await addMilestone(project.id, title.trim(), dueDate);
    setSaving(false);
    onSaved(project.id, res.data);
    onClose();
    setTitle(""); setDueDate("");
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} title={`Add Milestone — ${project.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Milestone Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Due Date *")}
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding..." : "Add Milestone"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ProjectsTab({
  projects,
  employees,
  currentEmployee,
  onProjectAdded,
  onMilestoneAdded,
  canWrite,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [milestoneTarget, setMilestoneTarget] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Projects</h2>
        {canWrite && (
          <PrimaryButton onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Project
          </PrimaryButton>
        )}
      </div>
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {projects.map((p) => {
            const taskCount = p.taskCount ?? 0;
            const doneCount = p.doneTaskCount ?? 0;
            const progress = p.progress ?? 0;
            return (
              <div key={p.id} style={{ ...cardStyle, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", margin: 0 }}>{p.name}</h3>
                  <span title={p.leadName ? `Lead: ${p.leadName}` : "No project lead assigned"} style={{ display: "inline-block", flexShrink: 0, maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "10px", fontWeight: 700, background: "color-mix(in srgb, var(--primary) 12%, white)", color: "var(--primary)", borderRadius: "999px", padding: "3px 7px" }}>{p.leadName ? `Lead: ${p.leadName}` : "No lead assigned"}</span>
                </div>
                {p.description && <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "8px" }}>{p.description}</p>}
                <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "10px" }}>
                  {p.members.length} member(s) • {doneCount}/{taskCount} tasks done{p.startDate || p.targetEndDate ? ` • ${p.startDate ? fmtDate(p.startDate) : "TBD"} → ${p.targetEndDate ? fmtDate(p.targetEndDate) : "TBD"}` : ""}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div role="progressbar" aria-label={`${p.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ height: "8px", background: "var(--background)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "var(--primary)", borderRadius: "inherit", transition: "width 0.2s ease" }} />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)" }}>{progress}%</span>
                </div>
                {p.milestones.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                    {p.milestones.map((m) => (
                      <span key={m.id} style={{ fontSize: "11.5px", color: "var(--subtext)" }}>• {m.title} • due {fmtDate(m.dueDate)}</span>
                    ))}
                  </div>
                )}
                {canWrite && (
                  <button
                    onClick={() => setMilestoneTarget(p)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      border: "none",
                      background: "none",
                      cursor: "pointer"
                    }}
                  >
                    + Add milestone
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={onProjectAdded}
        employees={employees}
        currentEmployee={currentEmployee}
      />
      <AddMilestoneModal isOpen={!!milestoneTarget} onClose={() => setMilestoneTarget(null)} project={milestoneTarget} onSaved={onMilestoneAdded} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "kanban", label: "Kanban Board", icon: KanbanSquare },
  { key: "calendar", label: "Calendar View", icon: CalendarDays },
  { key: "projects", label: "Projects", icon: FolderKanban },
];

export default function Tasks() {
  const { permissions = [], role } = useAuth();

  const can = (permission) =>
    permissions.includes(permission);

  const normalizedRole = String(role || "").toUpperCase();
  const isAdmin = normalizedRole === "ADMIN";
  const canRead = can("tasks:read") || isAdmin;
  const canWrite = can("tasks:write") || isAdmin;

  const isEmployee = normalizedRole === "EMPLOYEE";
  const canManageTasks = canWrite && !isEmployee;

  const canMoveTask = (task, targetStatus) => {
    if (!canWrite) return false;
    if (
      task.status === "Done" &&
      targetStatus !== "Done" &&
      !isAdmin &&
      task.projectLeadId !== taskMeta.currentEmployee?.id
    ) return false;

    // Admin / HR / Manager
    if (!isEmployee) return true;

    // Employee → only assigned task
    return task.assigneeId === taskMeta.currentEmployee?.id;
  };


  const [activeTab, setActiveTab] = useState("kanban");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orphaned, setOrphaned] = useState([]);

  const [taskMeta, setTaskMeta] = useState({
    statuses: [],
    priorities: [],
    statusMeta: {},
    priorityMeta: {},
    employees: [],
    currentEmployee: null,
  });
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [blockedState, setBlockedState] = useState(null); // { task, openBlockers, openSubtasks }

  const selectedTask = detailTask
    ? tasks.find((t) => t.id === detailTask.id)
    : null;

  const canLogTime = (task) => {
    if (!task || !canWrite) return false;

    if (!isEmployee) return true;

    return task.assigneeId === taskMeta.currentEmployee?.id;
  };

  useEffect(() => {
    if (!canRead) return undefined;
    Promise.all([
      getProjects(),
      getTasks(),
      canManageTasks
        ? getOrphanedTasks()
        : Promise.resolve({ data: [] }),
      getTaskMeta(),
    ])
      .then(([p, t, o, m]) => {
        setProjects(p.data);
        setTasks(t.data);
        setOrphaned(o.data);
        setTaskMeta(m.data);
      })
      .catch((error) => {
        console.error("Failed to load task management data:", error);
        setProjects([]);
        setTasks([]);
        setOrphaned([]);
      })
      .finally(() => setLoading(false));
  }, [canRead, canManageTasks]);


  if (!canRead) {
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Access Denied"
          subtitle="You do not have permission to view Task Management."
        />
      </MainLayout>
    );
  }

 const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(taskId); // 👈 Service call

      // UI update: remove deleted task from state and close modal
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDetailTask(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Error deleting task");
    }
  };

  const handleTaskMoved = (updated) => {
    const taskObj = updated?.data || updated;
    if (!taskObj?.id) return;

    setTasks((prev) =>
      Array.isArray(prev)
        ? prev.map((t) => (t?.id === taskObj.id ? { ...t, ...taskObj } : t))
        : []
    );
    getProjects()
      .then((response) => setProjects(response.data))
      .catch((error) => console.error("Failed to refresh project progress:", error));
  };
  const handleTaskAdded = (task) => {
    setTasks((prev) => [task, ...prev]);
    getProjects()
      .then((response) => setProjects(response.data))
      .catch((error) => console.error("Failed to refresh project progress:", error));
  };

  const handleReassigned = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setOrphaned((prev) => prev.filter((t) => t.id !== updated.id));
  };

  const handleProjectAdded = (project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const handleMilestoneAdded = (projectId, milestone) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, milestones: [...p.milestones, milestone] } : p)));
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
        <PageHeader title="Task Management" subtitle="Projects, milestones, tasks and time tracking" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <OrphanedTasksBanner orphaned={orphaned} employees={taskMeta.employees} onReassigned={handleReassigned} canWrite={canManageTasks} />

        {canManageTasks &&
          (activeTab === "kanban" || activeTab === "calendar") && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
              <PrimaryButton onClick={() => setShowCreateTask(true)}>
                <Plus size={16} /> Create Task
              </PrimaryButton>
            </div>
          )}

        {activeTab === "kanban" && (
          <KanbanTab
            tasks={tasks}
            statuses={taskMeta.statuses}
            priorityMeta={taskMeta.priorities}
            onOpen={setDetailTask}
            onMove={handleTaskMoved}
            onBlockedAttempt={(task, openBlockers, openSubtasks) =>
              setBlockedState({ task, openBlockers, openSubtasks })
            }
            canMoveTask={canMoveTask}
          />
        )}

        {activeTab === "calendar" && <CalendarTab
          tasks={tasks}
          statusMeta={taskMeta.statusMeta}
          onOpen={setDetailTask}
        />}

        {activeTab === "projects" && (
          <ProjectsTab
              projects={projects}
              employees={taskMeta.employees}
            currentEmployee={taskMeta.currentEmployee}
            onProjectAdded={handleProjectAdded}
            onMilestoneAdded={handleMilestoneAdded}
            canWrite={canManageTasks}
          />
        )}

        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          projects={projects}
          tasks={tasks}
          employees={taskMeta.employees}
          priorities={taskMeta.priorities}
          currentEmployee={taskMeta.currentEmployee}
          onSaved={handleTaskAdded}
        />

        <TaskDetailModal 
          isOpen={!!detailTask} 
          onClose={() => setDetailTask(null)} 
          task={detailTask ? tasks.find((t) => t.id === detailTask.id) : null} 
          statusMeta={taskMeta.statusMeta} 
          canWrite={canWrite} 
          canLogTime={canLogTime(selectedTask)} 
          currentEmployee={taskMeta.currentEmployee} 
          onDelete={handleDeleteTask} 
          priorities={taskMeta.priorities}
          onSaved={(updated) => {
            handleTaskMoved(updated);
            setDetailTask((prev) => (prev && updated?.id ? { ...prev, ...updated } : prev));
          }}
        />

        <ForceCloseModal
          isOpen={!!blockedState}
          onClose={() => setBlockedState(null)}
          task={blockedState?.task}
          openBlockers={blockedState?.openBlockers || []}
          onResolved={(updated) => { handleTaskMoved(updated); setBlockedState(null); }}
          canWrite={canManageTasks}
          currentEmployee={taskMeta.currentEmployee}
        />
      </div>
    </MainLayout>
  );
}