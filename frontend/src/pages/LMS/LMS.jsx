/**
 * LMS Page  •  Module 11
 * Tabs: Course Catalog  •  My Learning  •  Compliance Dashboard
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
  Download,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { saveBlobAsFile } from "../../utils/certificateDownload";
import {
  getCourses,
  addCourse,
  publishCourse,
  createCourseVersion,
  updateCourseVersion,
  getMyEnrollments,
  getAllEnrollments,
  assignCourse,
  submitQuiz,
  getQuizQuestions,
  downloadCertificate,
  addCourseContent,
  getEnrollmentContent,
  startCourseContent,
  completeCourseContent,
  uploadCourseContentFile,
  uploadCourseThumbnail,
} from "../../services/lmsService";

import { getEmployees } from "../../services/employeeService";
import CourseContentViewer from "../../pages/LMS/CourseContentViewer";
import { getFileUrl } from "../../utils/uploadFileUrl";
import CertificateManagement from "./CertificateManagement";
import { useAuth } from "../../context/AuthContext";
import { _getCourses, _getEnrollments } from "../../mock/lms";




const courseStatusMeta = {
  DRAFT: { color: "var(--subtext)", bg: "var(--background)" },
  Draft: { color: "var(--subtext)", bg: "var(--background)" },
  PUBLISHED: { color: "var(--green)", bg: "#ecfdf5" },
  Published: { color: "var(--green)", bg: "#ecfdf5" },
  ARCHIVED: { color: "var(--subtext)", bg: "#f3f4f6" },
  Archived: { color: "var(--subtext)", bg: "#f3f4f6" },
};

const getCourseStatusMeta = (status) => {
  const key = String(status || "").trim();
  const upper = key.toUpperCase();
  if (upper === "PUBLISHED") return { color: "var(--green)", bg: "#ecfdf5" };
  if (upper === "ARCHIVED") return { color: "var(--subtext)", bg: "#f3f4f6" };
  return { color: "var(--subtext)", bg: "var(--background)" };
};

const enrollmentStatusMeta = {
  NOT_STARTED: { color: "var(--subtext)", bg: "var(--background)" },
  "Not Started": { color: "var(--subtext)", bg: "var(--background)" },
  IN_PROGRESS: { color: "var(--primary)", bg: "#eff6ff" },
  "In Progress": { color: "var(--primary)", bg: "#eff6ff" },
  FAILED: { color: "var(--red)", bg: "#fef2f2" },
  Failed: { color: "var(--red)", bg: "#fef2f2" },
  PASSED: { color: "var(--green)", bg: "#ecfdf5" },
  Passed: { color: "var(--green)", bg: "#ecfdf5" },
  COMPLETED: { color: "var(--green)", bg: "#ecfdf5" },
  Completed: { color: "var(--green)", bg: "#ecfdf5" },
  LOCKED: { color: "var(--red)", bg: "#fef2f2" },
  Locked: { color: "var(--red)", bg: "#fef2f2" },
};

const getEnrollmentStatusMeta = (status) => {
  const key = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "PASSED" || key === "COMPLETED") return { color: "var(--green)", bg: "#ecfdf5" };
  if (key === "IN_PROGRESS") return { color: "var(--primary)", bg: "#eff6ff" };
  if (key === "FAILED" || key === "LOCKED") return { color: "var(--red)", bg: "#fef2f2" };
  return { color: "var(--subtext)", bg: "var(--background)" };
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


const emptyQuestion = () => ({
  question: "",
  options: [
    {
      optionText: "",
      isCorrect: false,
    },
    {
      optionText: "",
      isCorrect: false,
    },
    {
      optionText: "",
      isCorrect: false,
    },
    {
      optionText: "",
      isCorrect: false,
    },
  ],
});

function CreateCourseModal({
  isOpen,
  onClose,
  onSaved,
  editingCourse = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modulesText, setModulesText] = useState("");
  const [isCompliance, setIsCompliance] = useState(false);
  const [expiryMonths, setExpiryMonths] = useState("12");
  const [passThreshold, setPassThreshold] = useState(70);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([
    emptyQuestion(),
  ]);
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setModulesText("");
    setIsCompliance(false);
    setExpiryMonths("12");
    setPassThreshold(70);

    setThumbnailFile(null);
    setThumbnailPreview("")

    setQuestions([
      emptyQuestion(),
    ]);
  };


  useEffect(() => {
    if (!isOpen) return;

    if (editingCourse) {
      setTitle(editingCourse.title || "");

      setDescription(
        editingCourse.description || ""
      );

      setThumbnailPreview(
        editingCourse.thumbnailUrl
          ? getFileUrl(editingCourse.thumbnailUrl)
          : ""
      );

      setThumbnailFile(null);

      setModulesText(
        Array.isArray(editingCourse.contentModules)
          ? editingCourse.contentModules.join("\n")
          : ""
      );

      setIsCompliance(
        Boolean(editingCourse.isCompliance)
      );

      setExpiryMonths(
        editingCourse.expiryMonths?.toString() || "12"
      );

      setPassThreshold(
        editingCourse.passThreshold ?? 70
      );

      setQuestions(
        editingCourse.questions?.length
          ? editingCourse.questions.map((q) => ({
            question: q.question,

            options: q.options.map((option) => ({
              optionText: option.optionText,
              isCorrect: option.isCorrect,
            })),
          }))
          : [emptyQuestion()]
      );
    } else {
      resetForm();
    }
  }, [isOpen, editingCourse]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      emptyQuestion(),
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const updateQuestion = (index, value) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
            ...q,
            question: value,
          }
          : q
      )
    );
  };

  const updateOption = (
    questionIndex,
    optionIndex,
    value
  ) => {
    setQuestions((prev) =>
      prev.map((q, qi) => {
        if (qi !== questionIndex) {
          return q;
        }

        return {
          ...q,
          options: q.options.map((option, oi) =>
            oi === optionIndex
              ? {
                ...option,
                optionText: value,
              }
              : option
          ),
        };
      })
    );
  };

  const setCorrectOption = (
    questionIndex,
    optionIndex
  ) => {
    setQuestions((prev) =>
      prev.map((q, qi) => {
        if (qi !== questionIndex) {
          return q;
        }

        return {
          ...q,
          options: q.options.map(
            (option, oi) => ({
              ...option,
              isCorrect:
                oi === optionIndex,
            })
          ),
        };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Course title is required.");
      return;
    }

    if (!modulesText.trim()) {
      alert("At least one content module is required.");
      return;
    }

    if (!questions.length) {
      alert("At least one quiz question is required.");
      return;
    }

    for (const [questionIndex, q] of questions.entries()) {
      if (!q.question.trim()) {
        alert(`Question ${questionIndex + 1} is required.`);
        return;
      }

      if (q.options.length !== 4) {
        alert(
          `Question ${questionIndex + 1} must have exactly 4 options.`
        );
        return;
      }

      if (q.options.some((o) => !o.optionText.trim())) {
        alert(
          `All options of question ${questionIndex + 1} are required.`
        );
        return;
      }

      const correctAnswers = q.options.filter(
        (o) => o.isCorrect
      );

      if (correctAnswers.length !== 1) {
        alert(
          `Question ${questionIndex + 1} must have exactly one correct answer.`
        );
        return;
      }
    }

    if (isCompliance) {
      const expiry = Number(expiryMonths);

      if (!expiry || expiry <= 0) {
        alert("Compliance course requires expiry period.");
        return;
      }
    }

    setSaving(true);

    try {
      const course = {
        title: title.trim(),

        description: description.trim(),

        contentModules: modulesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),

        isCompliance,

        expiryMonths: isCompliance
          ? Number(expiryMonths)
          : null,

        passThreshold: Number(passThreshold) || 70,

        versionGroupId:
          editingCourse?.versionGroupId ||
          editingCourse?.id ||
          undefined,

        questions: questions.map((q) => ({
          question: q.question.trim(),

          options: q.options.map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
          })),
        })),
      };

      const res = editingCourse
        ? await updateCourseVersion(
          editingCourse.id,
          course
        )
        : await addCourse(course);

      let savedCourse = res.data;

      /*
       * Upload thumbnail AFTER course exists.
       */
      if (thumbnailFile) {
        const thumbnailRes = await uploadCourseThumbnail(
          savedCourse.id,
          thumbnailFile
        );

        savedCourse = {
          ...savedCourse,
          thumbnailUrl:
            thumbnailRes.data.thumbnailUrl,
        };
      }

      onSaved(savedCourse);

      resetForm();

      onClose();
    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Unable to save course"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={
        editingCourse
          ? `Create New Version — Version ${(editingCourse.version || 1) + 1
          }`
          : "Create Course"
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Title *")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Description")}
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>

        {/* COURSE THUMBNAIL */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {fieldLabel("Course Thumbnail")}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selectedFile =
                e.target.files?.[0] || null;

              setThumbnailFile(selectedFile);

              if (selectedFile) {
                setThumbnailPreview(
                  URL.createObjectURL(selectedFile)
                );
              } else {
                setThumbnailPreview("");
              }
            }}
          />

          {thumbnailPreview && (
            <img
              src={thumbnailPreview}
              alt="Course thumbnail preview"
              style={{
                width: "100%",
                maxWidth: "420px",
                height: "180px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            />
          )}

          {thumbnailFile && (
            <p
              style={{
                fontSize: "11px",
                color: "var(--subtext)",
                margin: 0,
              }}
            >
              Selected: {thumbnailFile.name}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Content Modules (one per line)")}
          <textarea rows={3} value={modulesText} onChange={(e) => setModulesText(e.target.value)} placeholder={"Intro\nCore concepts\nAssessment"} style={{ ...inputStyle(false), resize: "vertical" }} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {fieldLabel("Quiz Questions *")}

            <SecondaryButton
              type="button"
              onClick={addQuestion}
            >
              + Add Question
            </SecondaryButton>
          </div>

          {questions.map((q, questionIndex) => (
            <div
              key={questionIndex}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "14px",
                background: "var(--background)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <strong
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  Question {questionIndex + 1}
                </strong>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeQuestion(questionIndex)
                    }
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                value={q.question}
                onChange={(e) =>
                  updateQuestion(
                    questionIndex,
                    e.target.value
                  )
                }
                placeholder="Enter question"
                style={inputStyle(false)}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                {q.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="radio"
                      name={`correct-${questionIndex}`}
                      checked={option.isCorrect}
                      onChange={() =>
                        setCorrectOption(
                          questionIndex,
                          optionIndex
                        )
                      }
                    />

                    <input
                      value={option.optionText}
                      onChange={(e) =>
                        updateOption(
                          questionIndex,
                          optionIndex,
                          e.target.value
                        )
                      }
                      placeholder={`Option ${String.fromCharCode(65 + optionIndex)
                        }`}
                      style={inputStyle(false)}
                    />
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: "11px",
                  color: "var(--subtext)",
                  margin: "8px 0 0",
                }}
              >
                Select the radio button next to the correct answer.
              </p>
            </div>
          ))}
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
          <PrimaryButton type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingCourse
                ? `Create Version ${(editingCourse.version || 1) + 1}`
                : "Save as Draft"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AddContentModal({
  isOpen,
  onClose,
  course,
  onSaved,
}) {
  const [moduleName, setModuleName] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("TEXT");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [order, setOrder] = useState(1);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const resetForm = () => {
    setModuleName("");
    setTitle("");
    setType("TEXT");
    setContent("");
    setFileUrl("");
    setOrder(1);
    setFile(null);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // -------------------------
    // BASIC VALIDATION
    // -------------------------

    if (!moduleName.trim()) {
      setError("Module name is required.");
      return;
    }

    if (!title.trim()) {
      setError("Content title is required.");
      return;
    }

    if (type === "TEXT" && !content.trim()) {
      setError("Text content is required.");
      return;
    }

    // LINK requires URL
    if (type === "LINK" && !fileUrl.trim()) {
      setError("Content URL is required.");
      return;
    }

    // PDF / VIDEO require actual file
    if (["PDF", "VIDEO"].includes(type) && !file) {
      setError(
        `Please select a ${type === "PDF" ? "PDF" : "video"
        } file.`
      );
      return;
    }

    if (!order || Number(order) < 1) {
      setError("Content order must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      // This will contain the final URL
      // for PDF / VIDEO after upload.
      let uploadedFileUrl = fileUrl;

      // -------------------------
      // UPLOAD PDF / VIDEO
      // -------------------------

      if (["PDF", "VIDEO"].includes(type)) {
        setUploading(true);

        const uploadRes =
          await uploadCourseContentFile(
            course.id,
            file
          );

        uploadedFileUrl =
          uploadRes.data.fileUrl;

        setFileUrl(uploadedFileUrl);

        setUploading(false);
      }

      // -------------------------
      // CREATE COURSE CONTENT
      // -------------------------

      const payload = {
        moduleName: moduleName.trim(),

        title: title.trim(),

        type,

        content:
          type === "TEXT"
            ? content.trim()
            : null,

        fileUrl:
          type !== "TEXT"
            ? uploadedFileUrl.trim()
            : null,

        order: Number(order),
      };

      const res = await addCourseContent(
        course.id,
        payload
      );

      onSaved(res.data);

      handleClose();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add course content."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!course) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Add Content — ${course.title}`}
      onClose={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >

        {/* ERROR */}

        {error && (
          <p
            style={{
              color: "var(--red)",
              fontSize: "12px",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {/* MODULE NAME */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Module Name *")}

          <input
            value={moduleName}
            onChange={(e) =>
              setModuleName(e.target.value)
            }
            placeholder="Example: React Hooks"
            style={inputStyle(false)}
          />
        </div>

        {/* CONTENT TITLE */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Content Title *")}

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Example: Introduction to useEffect"
            style={inputStyle(false)}
          />
        </div>

        {/* CONTENT TYPE */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Content Type *")}

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setContent("");
              setFileUrl("");
              setFile(null);
              setError("");
            }}
            style={{
              ...inputStyle(false),
              height: "38px",
            }}
          >
            <option value="TEXT">
              Text Lesson
            </option>

            <option value="PDF">
              PDF
            </option>

            <option value="VIDEO">
              Video
            </option>

            <option value="LINK">
              External Link
            </option>
          </select>
        </div>

        {/* TEXT CONTENT */}

        {type === "TEXT" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("Lesson Content *")}

            <textarea
              rows={8}
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              placeholder="Write the lesson content here..."
              style={{
                ...inputStyle(false),
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </div>
        )}

        {/* LINK */}

        {type === "LINK" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {fieldLabel("URL *")}

            <input
              value={fileUrl}
              onChange={(e) =>
                setFileUrl(e.target.value)
              }
              placeholder="https://example.com/lesson"
              style={inputStyle(false)}
            />
          </div>
        )}

        {/* PDF / VIDEO FILE */}

        {["PDF", "VIDEO"].includes(type) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {fieldLabel(
              type === "PDF"
                ? "PDF File *"
                : "Video File *"
            )}

            <input
              type="file"
              accept={
                type === "PDF"
                  ? ".pdf,application/pdf"
                  : "video/mp4,video/webm,video/quicktime"
              }
              onChange={(e) => {
                setFile(
                  e.target.files?.[0] || null
                );
              }}
            />

            {file && (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--subtext)",
                  margin: 0,
                }}
              >
                Selected: {file.name}
              </p>
            )}
          </div>
        )}

        {/* ORDER */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          {fieldLabel("Order *")}

          <input
            type="number"
            min={1}
            value={order}
            onChange={(e) =>
              setOrder(e.target.value)
            }
            style={inputStyle(false)}
          />
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <SecondaryButton
            type="button"
            onClick={handleClose}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            disabled={saving || uploading}
          >
            {uploading
              ? "Uploading..."
              : saving
                ? "Saving..."
                : "Add Content"}
          </PrimaryButton>
        </div>

      </form>
    </Modal>
  );
}

function AssignCourseModal({
  isOpen,
  onClose,
  course,
  onSaved,
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const loadEmployees = async () => {
      setLoadingEmployees(true);
      setError("");

      try {
        const result = await getEmployees();

        const employeeList = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

        setEmployees(employeeList);
      } catch (err) {
        console.error("EMPLOYEE API ERROR:", err);

        setError(
          err.response?.data?.message ||
          "Unable to load employees"
        );

        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await assignCourse(
        course.id,
        employeeId
      );

      onSaved(res.data);

      setEmployeeId("");
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to assign course"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!course) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Assign — ${course.title}`}
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
        {error && (
          <p
            style={{
              color: "var(--red)",
              fontSize: "12px",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

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
            onChange={(e) =>
              setEmployeeId(e.target.value)
            }
            disabled={loadingEmployees || saving}
            style={{
              ...inputStyle(false),
              height: "38px",
              cursor:
                loadingEmployees
                  ? "wait"
                  : "pointer",
            }}
          >
            <option value="">
              {loadingEmployees
                ? "Loading employees..."
                : "Select employee"}
            </option>

            {employees.map((employee) => {
              const employeeName =
                employee.name ||
                employee.fullName ||
                [
                  employee.firstName,
                  employee.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                employee.employeeCode ||
                employee.id;

              return (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employeeName}
                  {employee.employeeCode
                    ? ` (${employee.employeeCode})`
                    : ""}
                </option>
              );
            })}
          </select>
        </div>

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
              !employeeId
            }
          >
            {saving
              ? "Assigning..."
              : "Assign Course"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CatalogTab({ courses, onCourseAdded, onCourseUpdated, isLmsManager }) {
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [contentTarget, setContentTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [publishError, setPublishError] = useState({});
  const [versioning, setVersioning] = useState({});
  const [versionError, setVersionError] = useState({});

  const handlePublish = async (id) => {
    try {
      const res = await publishCourse(id);

      setPublishError((p) => ({
        ...p,
        [id]: null,
      }));

      onCourseUpdated(res.data.course);
    } catch (error) {
      setPublishError((p) => ({
        ...p,
        [id]:
          error.response?.data?.message ||
          "Unable to publish course",
      }));
    }
  };

  const handleCreateVersion = async (course) => {
    try {
      setVersioning((prev) => ({
        ...prev,
        [course.id]: true,
      }));

      setVersionError((prev) => ({
        ...prev,
        [course.id]: null,
      }));

      const res = await createCourseVersion(course.id);

      onCourseAdded(res.data);

    } catch (error) {
      setVersionError((prev) => ({
        ...prev,
        [course.id]:
          error.response?.data?.message ||
          "Unable to create course version",
      }));
    } finally {
      setVersioning((prev) => ({
        ...prev,
        [course.id]: false,
      }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Course Catalog</h2>
        {isLmsManager && (<PrimaryButton onClick={() => setShowCreate(true)}><Plus size={16} /> Create Course</PrimaryButton>)}
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {courses.map((c) => {
            const meta = getCourseStatusMeta(c.status);
            return (
              <div
                key={c.id}
                style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: "hidden",
                }}
              >

                {/* COURSE THUMBNAIL */}
                {c.thumbnailUrl ? (
                  <img
                    src={getFileUrl(c.thumbnailUrl)}
                    alt={c.title}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      console.error(
                        "Thumbnail failed:",
                        getFileUrl(c.thumbnailUrl)
                      );
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "180px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--surface)",
                      color: "var(--subtext)",
                      fontSize: "12px",
                    }}
                  >
                    No thumbnail
                  </div>
                )}

                {/* CARD CONTENT */}
                <div
                  style={{
                    padding: "18px 20px",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <div>
                      <h3 style={{
                        fontSize: "14.5px",
                        fontWeight: 700,
                        color: "var(--text)",
                        margin: 0,
                      }}>
                        {c.title}
                      </h3>

                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--subtext)",
                          fontWeight: 600,
                        }}
                      >
                        Version {c.version ?? 1}
                      </span>
                    </div>
                    <StatusBadge label={c.status} color={meta.color} bg={meta.bg} />
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "10px" }}>{c.description}</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {c.isCompliance && <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: "99px" }}>Compliance  •  renews {c.expiryMonths}mo</span>}
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>{c.contentModules.length} modules</span>
                    <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", background: "var(--background)", padding: "2px 8px", borderRadius: "99px" }}>Pass = {c.passThreshold}%</span>
                  </div>
                  {publishError[c.id] && <p style={{ fontSize: "11px", color: "var(--red)", marginBottom: "8px" }}>{publishError[c.id]}</p>}
                  {versionError[c.id] && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--red)",
                        marginBottom: "8px",
                      }}
                    >
                      {versionError[c.id]}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {c.status === "DRAFT" && (
                      <>
                        
                        {isLmsManager && (
                          <button
                            onClick={() => setEditTarget(c)}
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--primary)",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        )}

                        {isLmsManager && (
                          <button
                            onClick={() => setContentTarget(c)}
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--primary)",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Add Content
                          </button>
                        )}

                        {isLmsManager && (
                          <button
                            onClick={() => handlePublish(c.id)}
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--primary)",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Publish
                          </button>
                        )}
                      </>
                    )}

                    {c.status === "PUBLISHED" && (
                      <>
                        {/* Assign Published Course */}

                        {isLmsManager && (
                          <button
                            onClick={() => setAssignTarget(c)}
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--primary)",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                            }}
                          >
                            Assign to employee
                          </button>
                        )}

                        {/* Create New Draft Version */}

                        {isLmsManager && (
                          <button
                            onClick={() => handleCreateVersion(c)}
                            disabled={versioning[c.id]}
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--primary)",
                              border: "none",
                              background: "none",
                              cursor: versioning[c.id]
                                ? "not-allowed"
                                : "pointer",
                              opacity: versioning[c.id] ? 0.6 : 1,
                            }}
                          >
                            {versioning[c.id]
                              ? "Creating..."
                              : "Create New Version"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>);

          })}
        </div>
      )}

      <CreateCourseModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(course) => {
          onCourseAdded(course);
          setShowCreate(false);
        }}
      />
      <CreateCourseModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        editingCourse={editTarget}
        onSaved={(updatedCourse) => {
          onCourseUpdated(updatedCourse);
          setEditTarget(null);
        }}
      />
      <AssignCourseModal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} course={assignTarget} onSaved={() => { }} />
      <AddContentModal
        isOpen={!!contentTarget}
        onClose={() => setContentTarget(null)}
        course={contentTarget}
        onSaved={(content) => {
          console.log("Course content added:", content);
        }}
      />
    </div>
  );
}

/* ---------------------------------- My Learning tab ---------------------------------- */

function CourseContentModal({
  isOpen,
  onClose,
  enrollment,
  onTakeQuiz,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !enrollment) return;

    setLoading(true);
    setError("");

    getEnrollmentContent(enrollment.id)
      .then(async (res) => {
        setData(res.data);

        if (res.data.contents?.length) {
          const firstContent = res.data.contents[0];

          setSelectedContent(firstContent);

          if (firstContent.status === "NOT_STARTED") {
            try {
              setProcessing(true);
              setError("");

              const startRes = await startCourseContent(
                enrollment.id,
                firstContent.id
              );

              const updatedFirstContent = {
                ...firstContent,
                status: "IN_PROGRESS",
                startedAt:
                  startRes.data.startedAt ??
                  firstContent.startedAt,
              };

              setData((prev) => ({
                ...prev,
                contents: prev.contents.map((item) =>
                  item.id === firstContent.id
                    ? updatedFirstContent
                    : item
                ),
              }));

              setSelectedContent(updatedFirstContent);
            } catch (err) {
              setError(
                err.response?.data?.message ||
                "Unable to start course content"
              );
            } finally {
              setProcessing(false);
            }
          }
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          "Unable to load course content"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, enrollment]);

  if (!enrollment) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={data?.course?.title || "Course"}
      onClose={onClose}
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <p
          style={{
            color: "var(--red)",
            fontSize: "13px",
          }}
        >
          {error}
        </p>
      ) : !data ? (
        <EmptyState
          icon={BookOpen}
          title="No course content available"
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Progress */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--label)",
                }}
              >
                Course Progress
              </span>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--primary)",
                }}
              >
                {data.progress.percentage}%
              </span>
            </div>

            <div
              style={{
                height: "7px",
                background: "var(--border)",
                borderRadius: "99px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${data.progress.percentage}%`,
                  background: "var(--primary)",
                  borderRadius: "99px",
                }}
              />
            </div>
          </div>

          {/* Content list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {data.contents.map((content) => (
              <button
                key={content.id}
                type="button"
                onClick={async () => {
                  setSelectedContent(content);

                  if (content.status === "NOT_STARTED") {
                    try {
                      setProcessing(true);
                      setError("");

                      const res = await startCourseContent(
                        enrollment.id,
                        content.id
                      );

                      setData((prev) => ({
                        ...prev,
                        contents: prev.contents.map((item) =>
                          item.id === content.id
                            ? {
                              ...item,
                              status: "IN_PROGRESS",
                              startedAt:
                                res.data.startedAt ??
                                item.startedAt,
                            }
                            : item
                        ),
                      }));

                      setSelectedContent((prev) =>
                        prev
                          ? {
                            ...prev,
                            status: "IN_PROGRESS",
                            startedAt:
                              res.data.startedAt ??
                              prev.startedAt,
                          }
                          : prev
                      );
                    } catch (err) {
                      setError(
                        err.response?.data?.message ||
                        "Unable to start course content"
                      );
                    } finally {
                      setProcessing(false);
                    }
                  }
                }}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background:
                    selectedContent?.id === content.id
                      ? "var(--background)"
                      : "var(--card)",
                  cursor: "pointer",
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
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {content.order}. {content.title}
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color:
                        content.status === "COMPLETED"
                          ? "var(--green)"
                          : "var(--subtext)",
                    }}
                  >
                    {content.status}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "10.5px",
                    color: "var(--subtext)",
                  }}
                >
                  {content.moduleName} • {content.type}
                </span>
              </button>
            ))}
          </div>


          {/* Selected content */}
          {selectedContent && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  color: "var(--text)",
                  marginBottom: "12px",
                }}
              >
                {selectedContent.title}
              </h3>

              <CourseContentViewer
                content={selectedContent}
              />
            </div>
          )}

          {selectedContent &&
            selectedContent.status !== "COMPLETED" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "16px",
                }}
              >
                <PrimaryButton
                  disabled={processing}
                  onClick={async () => {
                    try {
                      setProcessing(true);
                      setError("");

                      const res =
                        await completeCourseContent(
                          enrollment.id,
                          selectedContent.id
                        );

                      setData((prev) => {
                        const updatedContents =
                          prev.contents.map((item) =>
                            item.id === selectedContent.id
                              ? {
                                ...item,
                                status: "COMPLETED",
                                completedAt:
                                  res.data.completedAt,
                              }
                              : item
                          );

                        const completed =
                          updatedContents.filter(
                            (item) =>
                              item.status === "COMPLETED"
                          ).length;

                        const total =
                          updatedContents.length;

                        return {
                          ...prev,
                          contents: updatedContents,
                          progress: {
                            completed,
                            total,
                            percentage:
                              total === 0
                                ? 0
                                : Math.round(
                                  (completed / total) * 100
                                ),
                          },
                        };
                      });

                      setSelectedContent((prev) =>
                        prev
                          ? {
                            ...prev,
                            status: "COMPLETED",
                            completedAt:
                              res.data.completedAt,
                          }
                          : prev
                      );
                    } catch (err) {
                      setError(
                        err.response?.data?.message ||
                        "Unable to complete course content"
                      );
                    } finally {
                      setProcessing(false);
                    }
                  }}
                >
                  {processing
                    ? "Saving..."
                    : "Mark as Complete"}
                </PrimaryButton>
              </div>
            )}

          {selectedContent?.status === "COMPLETED" && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "#ecfdf5",
                color: "var(--green)",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              ✓ Content completed
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "4px",
            }}
          >
            <SecondaryButton onClick={onClose}>
              Close
            </SecondaryButton>

            {data.progress.percentage === 100 && (
              <PrimaryButton
                onClick={() => {
                  onClose();
                  onTakeQuiz(enrollment);
                }}
              >
                Take Quiz
              </PrimaryButton>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function QuizModal({
  isOpen,
  onClose,
  enrollment,
  course,
  onSaved,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [downloadingCertificate, setDownloadingCertificate] =
    useState(false);

  const handleDownloadCertificate = async () => {
    if (!result?.certificate?.id) {
      setError("Certificate is not available yet.");
      return;
    }

    try {
      setDownloadingCertificate(true);
      setError("");

      const response = await downloadCertificate(
        result.certificate.id
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      saveBlobAsFile(
        blob,
        `${result.certificate.certificateNumber}.pdf`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to download certificate."
      );
    } finally {
      setDownloadingCertificate(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !enrollment) return;

    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});

    getQuizQuestions(enrollment.id)
      .then((res) => {
        setQuestions(res.data.questions);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          "Unable to load quiz"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, enrollment]);

  const handleAnswerChange = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (questions.length === 0) {
      setError("No quiz questions available.");
      return;
    }

    const allAnswered = questions.every(
      (question) =>
        answers[question.id] != null
    );

    if (!allAnswered) {
      setError("Please answer all questions.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        answers: questions.map((question) => ({
          questionId: question.id,
          optionId: answers[question.id],
        })),
      };

      const res = await submitQuiz(
        enrollment.id,
        payload.answers
      );

      setResult(res.data);

      onSaved({
        ...enrollment,
        status:
          res.data.status === "Passed"
            ? "PASSED"
            : res.data.status === "Locked"
              ? "LOCKED"
              : "FAILED",

        score: res.data.score,
        attempts: res.data.attempts,
        certifiedAt: res.data.certifiedAt,
        expiresAt: res.data.expiresAt,

        certificate: res.data.certificate ?? null,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to submit quiz"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError("");
    onClose();
  };

  if (!enrollment || !course) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      title={`Quiz - ${course.title}`}
      onClose={handleClose}
    >
      {loading ? (
        <Spinner />
      ) : result ? (
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "24px 20px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Result Icon */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
              background:
                result.status === "Passed"
                  ? "#ecfdf5"
                  : "#fef2f2",
            }}
          >
            {result.status === "Passed" ? (
              <CheckCircle2
                size={42}
                style={{
                  color: "var(--green)",
                }}
              />
            ) : (
              <XCircle
                size={42}
                style={{
                  color: "var(--red)",
                }}
              />
            )}
          </div>

          {/* Result Status */}
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 6px",
            }}
          >
            {result.status === "Passed"
              ? "Passed!"
              : result.status === "Locked"
                ? "Quiz Locked"
                : "Not Passed"}
          </h3>

          {/* Score */}
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--subtext)",
              marginBottom: "20px",
            }}
          >
            Score: {result.score}%
          </div>

          {/* Statistics */}
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                padding: "14px 10px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--card)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--subtext)",
                  marginBottom: "5px",
                }}
              >
                Attempts Used
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {result.attempts}
              </div>
            </div>

            {result.attemptsRemaining != null && (
              <div
                style={{
                  padding: "14px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  background: "var(--card)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--subtext)",
                    marginBottom: "5px",
                  }}
                >
                  Attempts Remaining
                </div>

                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {result.attemptsRemaining}
                </div>
              </div>
            )}
          </div>

          {/* Certificate */}
          {result.status === "Passed" &&
            result.certificate && (
              <div
                style={{
                  width: "100%",
                  maxWidth: "380px",
                  marginBottom: "20px",
                  padding: "18px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "var(--green)",
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  <ShieldCheck size={20} />

                  Certificate Issued
                </div>

                {result.certificate.certificateNumber && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--subtext)",
                      marginBottom: "14px",
                    }}
                  >
                    Certificate No:{" "}
                    <strong>
                      {result.certificate.certificateNumber}
                    </strong>
                  </div>
                )}

                <PrimaryButton
                  type="button"
                  onClick={handleDownloadCertificate}
                  disabled={downloadingCertificate}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <Download size={16} />

                  {downloadingCertificate
                    ? "Preparing Certificate..."
                    : "Download Certificate"}
                </PrimaryButton>
              </div>
            )}

          {/* Done */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginTop: "2px",
            }}
          >
            <PrimaryButton onClick={handleClose}>
              Done
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <p
            style={{
              fontSize: "12.5px",
              color: "var(--subtext)",
              margin: 0,
            }}
          >
            Pass threshold: {course.passThreshold}%
          </p>

          {error && (
            <p
              style={{
                color: "var(--red)",
                fontSize: "12px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {questions.map((question, index) => (
            <div
              key={question.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {index + 1}. {question.question}
              </p>

              {question.options.map((option) => (
                <label
                  key={option.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12.5px",
                    color: "var(--label)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={
                      answers[question.id] === option.id
                    }
                    onChange={() =>
                      handleAnswerChange(
                        question.id,
                        option.id
                      )
                    }
                  />

                  {option.optionText}
                </label>
              ))}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
            }}
          >
            <SecondaryButton
              type="button"
              onClick={handleClose}
            >
              Cancel
            </SecondaryButton>

            <PrimaryButton
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Submitting..."
                : "Submit Quiz"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

function fmtDate(value) {
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
}
function MyLearningCard({ enrollment, course, onQuiz, onViewCourse, }) {
  const meta = getEnrollmentStatusMeta(enrollment.status);
  const canAttempt = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "FAILED",
  ].includes(enrollment.status);
  const [downloading, setDownloading] =
    useState(false);

  const handleDownload = async () => {
    if (!enrollment.certificate?.id) return;

    try {
      setDownloading(true);

      const response =
        await downloadCertificate(
          enrollment.certificate.id
        );

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${enrollment.certificate.certificateNumber}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

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


      {
        enrollment.score != null && (
          <p style={{
            fontSize: "12px",
            color: "var(--text)",
            marginBottom: "6px"
          }}>
            Last score: <strong>{enrollment.score}%</strong> (
            {enrollment.attempts} attempts used
            )
          </p>
        )
      }

      {enrollment.certifiedAt && (
        <p style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
          <Award size={13} /> Certified {fmtDate(enrollment.certifiedAt)}{enrollment.expiresAt ? `  •  renews by ${fmtDate(enrollment.expiresAt)}` : ""}
        </p>
      )}

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <SecondaryButton
          type="button"
          onClick={() => onViewCourse(enrollment)}
          style={{
            padding: "7px 14px",
            fontSize: "12px",
          }}
        >
          View Course
        </SecondaryButton>

        {/* Download Certificate */}
        {enrollment.status === "PASSED" &&
          enrollment.certificate?.status === "ISSUED" && (
            <PrimaryButton
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                padding: "7px 14px",
                fontSize: "12px",
              }}
            >
              <Download size={15} />

              {downloading
                ? "Downloading..."
                : "Download Certificate"}
            </PrimaryButton>
          )}

        {canAttempt ? (
          <PrimaryButton
            onClick={() => onQuiz(enrollment)}
            style={{
              padding: "7px 14px",
              fontSize: "12px",
            }}
          >
            {enrollment.status === "NOT_STARTED"
              ? "Start & Take Quiz"
              : "Retake Quiz"}
          </PrimaryButton>
        ) : enrollment.status === "LOCKED" ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "var(--red)",
              fontWeight: 600,
            }}
          >
            <Lock size={13} />
            Max attempts reached — contact L&D
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MyLearningTab({ enrollments, courses, onQuizResult }) {
  const [quizTarget, setQuizTarget] = useState(null);
  const [courseTarget, setCourseTarget] = useState(null);
  if (enrollments.length === 0) return <EmptyState icon={GraduationCap} title="No courses assigned yet" />;

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>My Learning</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
        {enrollments.map((en) => {
          const course = courses.find((c) => c.id === en.courseId);
          if (!course) return null;
          return (
            <MyLearningCard
              key={en.id}
              enrollment={en}
              course={course}
              onQuiz={setQuizTarget}
              onViewCourse={setCourseTarget}
            />
          );
        })}
      </div>
      <QuizModal
        isOpen={!!quizTarget}
        onClose={() => setQuizTarget(null)}
        enrollment={quizTarget}
        course={quizTarget ? courses.find((c) => c.id === quizTarget.courseId) : null}
        onSaved={onQuizResult}
      />
      <CourseContentModal
        isOpen={!!courseTarget}
        onClose={() => setCourseTarget(null)}
        enrollment={courseTarget}
        onTakeQuiz={(enrollment) => {
          setCourseTarget(null);
          setQuizTarget(enrollment);
        }}
      />
    </div>
  );
}

/* ---------------------------------- Compliance Dashboard tab ---------------------------------- */

function ComplianceTab({ courses, allEnrollments }) {
  const complianceCourses = courses.filter(
    (c) =>
      c.isCompliance &&
      c.status === "PUBLISHED"
  );
  if (complianceCourses.length === 0) return <EmptyState icon={ShieldAlert} title="No compliance courses published" />;

  const today = new Date();

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>Compliance Dashboard</h2>
      {complianceCourses.map((course) => {
        const relevant = allEnrollments.filter((e) => e.courseId === course.id);
        const completed = relevant.filter(
          (e) => e.status === "PASSED"
        ).length;
        const overdue = relevant.filter((e) => {
          if (e.status === "PASSED") return false;
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
                  Overdue / not completed  •  escalates to employee + manager
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
                    <span key={e.id} style={{ fontSize: "11.5px", color: "var(--amber)", background: "#fffbeb", padding: "3px 10px", borderRadius: "99px" }}>{e.employeeName}  •  renews {fmtDate(e.expiresAt)}</span>
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

const ALL_TABS = [
  { key: "catalog", label: "Course Catalog", icon: BookOpen },
  { key: "myLearning", label: "My Learning", icon: GraduationCap },
  { key: "compliance", label: "Compliance Dashboard", icon: ShieldAlert },
  {
    key: "certificates",
    label: "Certificate Management",
    icon: Award,
  },
];

export default function LMS() {
  const { user, role, permissions } = useAuth();

  const normalizedRole = role?.toUpperCase();

  const canReadLms = Boolean(permissions?.includes("lms:read"));

  const canWriteLms = Boolean(permissions?.includes("lms:write"));

  const isLmsManager =
    canWriteLms &&
    ["ADMIN", "HR"].includes(normalizedRole);

  const canViewCompliance =
    canReadLms &&
    ["ADMIN", "HR", "MANAGER"].includes(normalizedRole);

  const TABS = ALL_TABS.filter((tab) => {
    if (tab.key === "myLearning") {
      return true;
    }

    if (tab.key === "certificates") {
      return isLmsManager;
    }

    if (tab.key === "compliance") {
      return canViewCompliance;
    }

    return canReadLms;
  });

  const [activeTab, setActiveTab] = useState("catalog");
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCourses().catch(() => ({ data: [] })),
      getMyEnrollments().catch(() => ({ data: [] })),
      getAllEnrollments().catch(() => ({ data: [] })),
    ])
      .then(([c, mine, all]) => {
        const loadedCourses = c?.data?.length > 0 ? c.data : _getCourses();
        const loadedMine = mine?.data?.length > 0 ? mine.data : _getEnrollments(user?.id || "EMP001");
        const loadedAll = all?.data?.length > 0 ? all.data : _getEnrollments();
        setCourses(loadedCourses);
        setMyEnrollments(loadedMine);
        setAllEnrollments(loadedAll);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

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
            isLmsManager={isLmsManager}
            onCourseAdded={(c) => setCourses((prev) => [c, ...prev])}
            onCourseUpdated={(c) => setCourses((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
          />
        )}

        {activeTab === "myLearning" && (
          <MyLearningTab enrollments={myEnrollments} courses={courses} onQuizResult={handleQuizResult} />
        )}

        {activeTab === "compliance" && <ComplianceTab courses={courses} allEnrollments={allEnrollments} />}

        {activeTab === "certificates" &&
          canReadLms &&
          isLmsManager && (
            <CertificateManagement />
          )}
      </div>
    </MainLayout>
  );
}