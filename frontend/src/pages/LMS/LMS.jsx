/**
 * LMS Page — Module 11
 * Tabs: Course Catalog · My Learning · Compliance Dashboard
 */

import { useState, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Plus,
  CheckCircle2,
  XCircle,
  Lock,
  Award,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getCourses,
  addCourse,
  publishCourse,
  getEnrollments,
  getAllEnrollments,
  assignCourse,
  submitQuiz,
} from "../../services/lmsService";
import { courseStatusMeta, enrollmentStatusMeta, MAX_ATTEMPTS } from "../../mock/lms";
import { colleagues } from "../../mock/Recruitment";

const ME = { id: "EMP001", name: "Matsya Singh" };
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

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

/* ---------------------------------- Course Catalog tab ---------------------------------- */

function CreateCourseModal({ isOpen, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modulesText, setModulesText] = useState("");
  const [isCompliance, setIsCompliance] = useState(false);
  const [expiryMonths, setExpiryMonths] = useState("12");
  const [passThreshold, setPassThreshold] = useState(70);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const course = {
      id: `co-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      contentModules: modulesText.split("\n").map((s) => s.trim()).filter(Boolean),
      isCompliance,
      expiryMonths: isCompliance ? Number(expiryMonths) || null : null,
      passThreshold: Number(passThreshold) || 70,
      status: "Draft",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const res = await addCourse(course);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setTitle(""); setDescription(""); setModulesText(""); setIsCompliance(false); setExpiryMonths("12"); setPassThreshold(70);
  };

  return (
    <Modal isOpen={isOpen} title="Create Course" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Description")}
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Content Modules (one per line)")}
          <textarea rows={3} value={modulesText} onChange={(e) => setModulesText(e.target.value)} placeholder={"Intro\nCore concepts\nAssessment"} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Pass Threshold (%)")}
            <input type="number" min={1} max={100} value={passThreshold} onChange={(e) => setPassThreshold(e.target.value)} style={inputStyle(false)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", justifyContent: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer", height: "38px" }}>
              <input type="checkbox" checked={isCompliance} onChange={(e) => setIsCompliance(e.target.checked)} />
              Mandatory compliance course
            </label>
          </div>
        </div>
        {isCompliance && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Renewal / Expiry (months) *")}
            <input type="number" min={1} value={expiryMonths} onChange={(e) => setExpiryMonths(e.target.value)} style={inputStyle(false)} />
            <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>Required before this course can be published, since it's a compliance course.</p>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save as Draft"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AssignCourseModal({ isOpen, onClose, course, onSaved }) {
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) return;
    setSaving(true);
    const emp = [{ id: ME.id, name: ME.name }, ...colleagues].find((c) => c.id === employeeId);
    const res = await assignCourse(course.id, emp.id, emp.name);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setEmployeeId("");
  };

  if (!course) return null;

  return (
    <Modal isOpen={isOpen} title={`Assign — ${course.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Employee *")}
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            <option value="">Select employee</option>
            {[{ id: ME.id, name: ME.name }, ...colleagues].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Assigning…" : "Assign Course"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CatalogTab({ courses, onCourseAdded, onCourseUpdated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [publishError, setPublishError] = useState({});

  const handlePublish = async (id) => {
    const res = await publishCourse(id);
    if (res.data?.error) {
      setPublishError((p) => ({ ...p, [id]: res.data.error }));
      return;
    }
    setPublishError((p) => ({ ...p, [id]: null }));
    onCourseUpdated(res.data.course);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Course Catalog</h2>
        <PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Create Course</PrimaryButton>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {courses.map((c) => {
            const meta = courseStatusMeta[c.status];
            return (
              <div key={c.id} style={{ ...cardStyle, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>{c.title}</h3>
                  <StatusBadge label={c.status} color={meta.color} bg={meta.bg} />
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>{c.description}</p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {c.isCompliance && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: "99px" }}>Compliance · renews {c.expiryMonths}mo</span>}
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>{c.contentModules.length} modules</span>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Pass ≥ {c.passThreshold}%</span>
                </div>
                {publishError[c.id] && <p style={{ fontSize: "11px", color: "var(--red)", marginBottom: "8px" }}>{publishError[c.id]}</p>}
                <div style={{ display: "flex", gap: "12px" }}>
                  {c.status === "Draft" && (
                    <button onClick={() => handlePublish(c.id)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Publish</button>
                  )}
                  {c.status === "Published" && (
                    <button onClick={() => setAssignTarget(c)} style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Assign to employee</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateCourseModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSaved={onCourseAdded} />
      <AssignCourseModal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} course={assignTarget} onSaved={() => {}} />
    </div>
  );
}

/* ---------------------------------- My Learning tab ---------------------------------- */

function QuizModal({ isOpen, onClose, enrollment, course, onSaved }) {
  const totalQuestions = 10;
  const [correct, setCorrect] = useState(7);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await submitQuiz(enrollment.id, Number(correct), totalQuestions);
    setSaving(false);
    setResult(res.data);
    onSaved(res.data);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  if (!enrollment || !course) return null;

  return (
    <Modal isOpen={isOpen} title={`Quiz — ${course.title}`} onClose={handleClose}>
      {!result ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", margin: 0 }}>
            {totalQuestions} questions · pass threshold {course.passThreshold}% · attempt {enrollment.attempts + 1} of {MAX_ATTEMPTS}
          </p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: 0, fontStyle: "italic" }}>
            (Demo: choose how many you'd answer correctly — scoring is computed here, standing in for a server-side check.)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel(`Correct answers (0–${totalQuestions})`)}
            <input type="range" min={0} max={totalQuestions} value={correct} onChange={(e) => setCorrect(e.target.value)} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{correct} / {totalQuestions}</span>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <SecondaryButton type="button" onClick={handleClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit Quiz"}</PrimaryButton>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          {result.status === "Passed" ? (
            <CheckCircle2 size={40} style={{ color: "var(--green)", marginBottom: "10px" }} />
          ) : (
            <XCircle size={40} style={{ color: "var(--red)", marginBottom: "10px" }} />
          )}
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{result.status === "Passed" ? "Passed!" : result.status === "Locked" ? "Not passed — attempts used up" : "Not passed"}</h3>
          <p style={{ fontSize: "13px", color: "var(--subtext)", marginTop: "4px" }}>Score: {result.score}% (needed {course.passThreshold}%)</p>
          {result.status === "Failed" && <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "6px" }}>{MAX_ATTEMPTS - result.attempts} attempt(s) remaining.</p>}
          {result.certifiedAt && <p style={{ fontSize: "12px", color: "var(--green)", marginTop: "6px", fontWeight: 600 }}>Certified — {result.expiresAt ? `renews by ${fmtDate(result.expiresAt)}` : "no expiry"}</p>}
          <div style={{ marginTop: "18px" }}>
            <PrimaryButton onClick={handleClose}>Done</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MyLearningCard({ enrollment, course, onQuiz }) {
  const meta = enrollmentStatusMeta[enrollment.status];
  const canAttempt = ["Not Started", "In Progress", "Failed"].includes(enrollment.status);

  return (
    <div style={{ ...cardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
        <div>
          <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text)" }}>{course.title}</h3>
          {course.isCompliance && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed" }}>Mandatory compliance training</span>}
        </div>
        <StatusBadge label={enrollment.status} color={meta.color} bg={meta.bg} />
      </div>

      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>{course.description}</p>

      {enrollment.score != null && (
        <p style={{ fontSize: "12px", color: "var(--text)", marginBottom: "6px" }}>Last score: <strong>{enrollment.score}%</strong> ({enrollment.attempts}/{MAX_ATTEMPTS} attempts used)</p>
      )}
      {enrollment.certifiedAt && (
        <p style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
          <Award size={13} /> Certified {fmtDate(enrollment.certifiedAt)}{enrollment.expiresAt ? ` · renews by ${fmtDate(enrollment.expiresAt)}` : ""}
        </p>
      )}

      <div style={{ marginTop: "10px" }}>
        {canAttempt ? (
          <PrimaryButton onClick={() => onQuiz(enrollment)} style={{ padding: "7px 14px", fontSize: "12px" }}>
            {enrollment.status === "Not Started" ? "Start & Take Quiz" : "Retake Quiz"}
          </PrimaryButton>
        ) : enrollment.status === "Locked" ? (
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--red)", fontWeight: 600 }}>
            <Lock size={13} /> Max attempts reached — contact L&D
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MyLearningTab({ enrollments, courses, onQuizResult }) {
  const [quizTarget, setQuizTarget] = useState(null);
  if (enrollments.length === 0) return <EmptyState icon={GraduationCap} title="No courses assigned yet" />;

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>My Learning</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
        {enrollments.map((en) => {
          const course = courses.find((c) => c.id === en.courseId);
          if (!course) return null;
          return <MyLearningCard key={en.id} enrollment={en} course={course} onQuiz={setQuizTarget} />;
        })}
      </div>
      <QuizModal
        isOpen={!!quizTarget}
        onClose={() => setQuizTarget(null)}
        enrollment={quizTarget}
        course={quizTarget ? courses.find((c) => c.id === quizTarget.courseId) : null}
        onSaved={onQuizResult}
      />
    </div>
  );
}

/* ---------------------------------- Compliance Dashboard tab ---------------------------------- */

function ComplianceTab({ courses, allEnrollments }) {
  const complianceCourses = courses.filter((c) => c.isCompliance && c.status === "Published");
  if (complianceCourses.length === 0) return <EmptyState icon={ShieldAlert} title="No compliance courses published" />;

  const today = new Date();

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>Compliance Dashboard</h2>
      {complianceCourses.map((course) => {
        const relevant = allEnrollments.filter((e) => e.courseId === course.id);
        const completed = relevant.filter((e) => e.status === "Passed").length;
        const overdue = relevant.filter((e) => {
          if (e.status === "Passed") return false;
          return true; // not started / failed / locked all count as not-yet-compliant
        });
        const expiringSoon = relevant.filter((e) => e.expiresAt && new Date(e.expiresAt) - today < 1000 * 60 * 60 * 24 * 30 && new Date(e.expiresAt) > today);

        return (
          <div key={course.id} style={{ ...cardStyle, padding: "18px 20px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{course.title}</h3>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{completed}/{relevant.length} completed</span>
            </div>

            <div style={{ height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ height: "100%", width: `${relevant.length ? (completed / relevant.length) * 100 : 0}%`, background: "var(--green)", borderRadius: "99px" }} />
            </div>

            {overdue.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                  Overdue / not completed — escalates to employee + manager
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {overdue.map((e) => (
                    <span key={e.id} style={{ fontSize: "11.5px", color: "var(--red)", background: "#fef2f2", padding: "3px 10px", borderRadius: "99px" }}>{e.employeeName}</span>
                  ))}
                </div>
              </div>
            )}

            {expiringSoon.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                  Certification expiring within 30 days
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {expiringSoon.map((e) => (
                    <span key={e.id} style={{ fontSize: "11.5px", color: "var(--amber)", background: "#fffbeb", padding: "3px 10px", borderRadius: "99px" }}>{e.employeeName} — renews {fmtDate(e.expiresAt)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "catalog", label: "Course Catalog", icon: BookOpen },
  { key: "myLearning", label: "My Learning", icon: GraduationCap },
  { key: "compliance", label: "Compliance Dashboard", icon: ShieldAlert },
];

export default function LMS() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCourses(), getEnrollments(ME.id), getAllEnrollments()])
      .then(([c, mine, all]) => {
        setCourses(c.data);
        setMyEnrollments(mine.data);
        setAllEnrollments(all.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleQuizResult = (updatedEnrollment) => {
    setMyEnrollments((prev) => prev.map((e) => (e.id === updatedEnrollment.id ? updatedEnrollment : e)));
    setAllEnrollments((prev) => prev.map((e) => (e.id === updatedEnrollment.id ? updatedEnrollment : e)));
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
        <PageHeader title="Learning Management" subtitle="Courses, compliance training and certifications" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "catalog" && (
          <CatalogTab
            courses={courses}
            onCourseAdded={(c) => setCourses((prev) => [c, ...prev])}
            onCourseUpdated={(c) => setCourses((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
          />
        )}

        {activeTab === "myLearning" && (
          <MyLearningTab enrollments={myEnrollments} courses={courses} onQuizResult={handleQuizResult} />
        )}

        {activeTab === "compliance" && <ComplianceTab courses={courses} allEnrollments={allEnrollments} />}
      </div>
    </MainLayout>
  );
}