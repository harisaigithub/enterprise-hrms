/**
 * Task Management Page � Module 13
 * Views: Kanban Board � Calendar (deadline) View � Projects
 */

import { useState, useEffect, useMemo } from "react";
import {
  KanbanSquare,
  CalendarDays,
  FolderKanban,
  Plus,
  Clock,
  AlertTriangle,
  UserX,
  History,
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
} from "../../services/taskService";
import { TASK_STATUSES, TASK_PRIORITIES, taskStatusMeta, priorityMeta, employeeDirectory } from "../../mock/tasks";

const ME = { id: "EMP001", name: "Matsya Singh" };
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

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

function CreateTaskModal({ isOpen, onClose, projects, onSaved }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [milestoneId, setMilestoneId] = useState("");
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(ME.id);
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const assignableEmployees = employeeDirectory.filter((e) => e.isActive && (project ? project.members.includes(e.id) : true));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !dueDate) return;
    setSaving(true);
    const res = await addTask({ projectId, milestoneId: milestoneId || null, title: title.trim(), assigneeId, priority, dueDate });
    setSaving(false);
    onSaved(res.data);
    onClose();
    setTitle(""); setDueDate(""); setMilestoneId(""); setPriority("Medium");
  };

  return (
    <Modal isOpen={isOpen} title="Create Task" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project *")}
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setMilestoneId(""); }} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
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
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Due Date *")}
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Creating�" : "Create Task"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------- Force-close modal ---------------------------------- */

function ForceCloseModal({ isOpen, onClose, task, openBlockers, onResolved }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleForceClose = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    const res = await updateTaskStatus(task.id, "Done", { force: true, reason: reason.trim() });
    setSaving(false);
    onResolved(res.data.task);
    onClose();
    setReason("");
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} title={`Force-close � ${task.title}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <AlertTriangle size={16} style={{ color: "var(--amber, #d97706)", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
            This task has open blocker(s): <strong>{openBlockers.map((b) => b.title).join(", ")}</strong>. Only a Project Lead should force-close past this � a reason is logged to Task History.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Reason for force-close *")}
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle(), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleForceClose} disabled={saving || !reason.trim()}>{saving ? "Closing�" : "Force-close as Done"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Task detail / time log modal ---------------------------------- */

function TaskDetailModal({ isOpen, onClose, task, onSaved }) {
  const [entries, setEntries] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (task) {
      getTimeEntries(task.id).then((res) => setEntries(res.data));
      getTaskHistory(task.id).then((res) => setTaskHistory(res.data));
    }
  }, [task]);

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!hours) return;
    setLogging(true);
    const entry = await logTimeEntry({
      taskId: task.id, employeeId: ME.id, employeeName: ME.name,
      date: new Date().toISOString().slice(0, 10), hours, note: note.trim(),
    });
    setEntries((prev) => [entry.data, ...prev]);
    setLogging(false);
    setHours(""); setNote("");
  };

  if (!task) return null;
  const meta = taskStatusMeta[task.status];

  return (
    <Modal isOpen={isOpen} title={task.title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <StatusBadge label={task.status} color={meta.color} bg={meta.bg} />
          <span style={{ fontSize: "12px", color: "var(--subtext)" }}>Due {fmtDate(task.dueDate)} � {task.assigneeName}</span>
        </div>

        <div>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--label)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={13} /> Log time ({totalHours}h logged)
          </h4>
          <form onSubmit={handleLogTime} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <input type="number" step="0.5" min="0.5" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} style={{ ...inputStyle(), width: "90px" }} />
            <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle()} />
            <PrimaryButton type="submit" disabled={logging || !hours} style={{ padding: "9px 14px" }}>{logging ? "�" : "Log"}</PrimaryButton>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "110px", overflowY: "auto" }}>
            {entries.map((e) => (
              <div key={e.id} style={{ fontSize: "12px", color: "var(--subtext)" }}>
                {fmtDate(e.date)} � <strong>{e.hours}h</strong> � {e.employeeName}{e.note ? ` � ${e.note}` : ""}
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
                {fmtDate(h.date)} � <strong>{h.action}</strong> � {h.detail}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Orphaned tasks banner ---------------------------------- */

function OrphanedTasksBanner({ orphaned, onReassigned }) {
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
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b" }}>Orphaned tasks � assignee no longer active</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {orphaned.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12.5px", color: "#991b1b" }}>
              <strong>{t.title}</strong> � was assigned to {t.assigneeName}
            </span>
            <button onClick={() => setReassignTarget(t)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
              Reassign
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={!!reassignTarget} title={`Reassign � ${reassignTarget?.title || ""}`} onClose={() => setReassignTarget(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("New assignee *")}
            <select value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)} style={{ ...inputStyle(), height: "38px", cursor: "pointer" }}>
              <option value="">Select employee</option>
              {employeeDirectory.filter((e) => e.isActive).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <SecondaryButton onClick={() => setReassignTarget(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleReassign} disabled={saving || !newAssigneeId}>{saving ? "Reassigning�" : "Reassign"}</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------------- Kanban view ---------------------------------- */

function TaskCard({ task, onOpen, onMove, onBlockedAttempt }) {
  const meta = priorityMeta[task.priority];
  const currentIndex = TASK_STATUSES.indexOf(task.status);

  const handleMove = async (direction) => {
    const nextStatus = TASK_STATUSES[currentIndex + direction];
    if (!nextStatus) return;
    const res = await updateTaskStatus(task.id, nextStatus);
    if (res.data?.error === "blocked") {
      onBlockedAttempt(task, res.data.openBlockers);
      return;
    }
    onMove(res.data.task);
  };

  return (
    <div style={{ ...cardStyle, padding: "12px 14px", cursor: "pointer" }} onClick={() => onOpen(task)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{task.title}</h4>
        <span style={{ fontSize: "10px", fontWeight: 700, color: meta.color, background: meta.bg, padding: "2px 7px", borderRadius: "99px", whiteSpace: "nowrap" }}>{task.priority}</span>
      </div>
      <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginBottom: "8px" }}>{task.assigneeName} � due {fmtDate(task.dueDate)}</p>
      {task.blockedByTaskIds.length > 0 && task.status !== "Done" && (
        <p style={{ fontSize: "10.5px", color: "var(--amber, #d97706)", marginBottom: "8px" }}>? {task.blockedByTaskIds.length} blocker(s)</p>
      )}
      {task.forceClosed && (
        <p style={{ fontSize: "10.5px", color: "var(--red)", marginBottom: "8px" }}>Force-closed: {task.forceCloseReason}</p>
      )}
      <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
        {currentIndex > 0 && (
          <button onClick={() => handleMove(-1)} style={{ fontSize: "11px", fontWeight: 600, color: "var(--subtext)", border: "none", background: "none", cursor: "pointer" }}>? {TASK_STATUSES[currentIndex - 1]}</button>
        )}
        {currentIndex < TASK_STATUSES.length - 1 && (
          <button onClick={() => handleMove(1)} style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>{TASK_STATUSES[currentIndex + 1]} ?</button>
        )}
      </div>
    </div>
  );
}

function KanbanTab({ tasks, onOpen, onMove, onBlockedAttempt }) {
  if (tasks.length === 0) return <EmptyState icon={KanbanSquare} title="No tasks yet" />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(220px, 1fr))", gap: "14px", overflowX: "auto" }}>
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status}>
            <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>
              {status} ({columnTasks.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {columnTasks.map((t) => (
                <TaskCard key={t.id} task={t} onOpen={onOpen} onMove={onMove} onBlockedAttempt={onBlockedAttempt} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Calendar (deadline) view ---------------------------------- */

function CalendarTab({ tasks, onOpen }) {
  const grouped = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const map = new Map();
    sorted.forEach((t) => {
      if (!map.has(t.dueDate)) map.set(t.dueDate, []);
      map.get(t.dueDate).push(t);
    });
    return Array.from(map.entries());
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState icon={CalendarDays} title="No tasks yet" />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {grouped.map(([date, dayTasks]) => {
        const isOverdue = date < today;
        return (
          <div key={date}>
            <h3 style={{ fontSize: "12.5px", fontWeight: 700, color: isOverdue ? "var(--red)" : "var(--subtext)", marginBottom: "8px" }}>
              {fmtDate(date)}{isOverdue ? " � overdue" : ""}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dayTasks.map((t) => {
                const meta = taskStatusMeta[t.status];
                return (
                  <div key={t.id} onClick={() => onOpen(t)} style={{ ...cardStyle, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{t.title} <span style={{ fontWeight: 400, color: "var(--subtext)" }}>� {t.assigneeName}</span></span>
                    <StatusBadge label={t.status} color={meta.color} bg={meta.bg} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Projects tab ---------------------------------- */

function CreateProjectModal({ isOpen, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState([ME.id]);
  const [saving, setSaving] = useState(false);

  const toggleMember = (id) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await addProject({ name: name.trim(), memberIds });
    setSaving(false);
    onSaved(res.data);
    onClose();
    setName(""); setMemberIds([ME.id]);
  };

  return (
    <Modal isOpen={isOpen} title="Create Project" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Project Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Team Members")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {employeeDirectory.filter((e) => e.isActive).map((e) => (
              <label key={e.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--label)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: "99px", cursor: "pointer" }}>
                <input type="checkbox" checked={memberIds.includes(e.id)} onChange={() => toggleMember(e.id)} />
                {e.name}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Creating�" : "Create Project"}</PrimaryButton>
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
    <Modal isOpen={isOpen} title={`Add Milestone � ${project.name}`} onClose={onClose}>
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
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding�" : "Add Milestone"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ProjectsTab({ projects, tasks, onProjectAdded, onMilestoneAdded }) {
  const [showCreate, setShowCreate] = useState(false);
  const [milestoneTarget, setMilestoneTarget] = useState(null);

  if (projects.length === 0) return <EmptyState icon={FolderKanban} title="No projects yet" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Projects</h2>
        <PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Create Project</PrimaryButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
        {projects.map((p) => {
          const projectTasks = tasks.filter((t) => t.projectId === p.id);
          const doneCount = projectTasks.filter((t) => t.status === "Done").length;
          return (
            <div key={p.id} style={{ ...cardStyle, padding: "18px 20px" }}>
              <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>{p.name}</h3>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "10px" }}>
                {p.members.length} member(s) � {doneCount}/{projectTasks.length} tasks done
              </p>
              {p.milestones.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
                  {p.milestones.map((m) => (
                    <span key={m.id} style={{ fontSize: "11.5px", color: "var(--subtext)" }}>? {m.title} � due {fmtDate(m.dueDate)}</span>
                  ))}
                </div>
              )}
              <button onClick={() => setMilestoneTarget(p)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>
                + Add milestone
              </button>
            </div>
          );
        })}
      </div>
      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSaved={onProjectAdded} />
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
  const [activeTab, setActiveTab] = useState("kanban");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orphaned, setOrphaned] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [blockedState, setBlockedState] = useState(null); // { task, openBlockers }

  useEffect(() => {
    setLoading(true);
    Promise.all([getProjects(), getTasks(), getOrphanedTasks()])
      .then(([p, t, o]) => {
        setProjects(p.data);
        setTasks(t.data);
        setOrphaned(o.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTaskMoved = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTaskAdded = (task) => {
    setTasks((prev) => [task, ...prev]);
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

        <OrphanedTasksBanner orphaned={orphaned} onReassigned={handleReassigned} />

        {(activeTab === "kanban" || activeTab === "calendar") && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
            <PrimaryButton onClick={() => setShowCreateTask(true)}><Plus size={16} /> Create Task</PrimaryButton>
          </div>
        )}

        {activeTab === "kanban" && (
          <KanbanTab
            tasks={tasks}
            onOpen={setDetailTask}
            onMove={handleTaskMoved}
            onBlockedAttempt={(task, openBlockers) => setBlockedState({ task, openBlockers })}
          />
        )}

        {activeTab === "calendar" && <CalendarTab tasks={tasks} onOpen={setDetailTask} />}

        {activeTab === "projects" && (
          <ProjectsTab projects={projects} tasks={tasks} onProjectAdded={handleProjectAdded} onMilestoneAdded={handleMilestoneAdded} />
        )}

        <CreateTaskModal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} projects={projects} onSaved={handleTaskAdded} />
        <TaskDetailModal isOpen={!!detailTask} onClose={() => setDetailTask(null)} task={detailTask ? tasks.find((t) => t.id === detailTask.id) : null} />
        <ForceCloseModal
          isOpen={!!blockedState}
          onClose={() => setBlockedState(null)}
          task={blockedState?.task}
          openBlockers={blockedState?.openBlockers || []}
          onResolved={(updated) => { handleTaskMoved(updated); setBlockedState(null); }}
        />
      </div>
    </MainLayout>
  );
}