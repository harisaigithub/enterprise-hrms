import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getEmployees } from "../../services/employeeService";
import {
  getBgvCases,
  getBgvCase,
  initiateBgvCase,
  assignBgvCaseVerifier,
  unassignBgvCaseVerifier,
  changeBgvCaseStatus,
  setFinalBgvDecision,
  getBgvCaseStatusHistory,
  getBgvCaseAuditTrail,
  getBgvCaseAssignmentHistory,
  createBgvVerification,
  startBgvVerification,
  submitBgvVerification,
  completeBgvVerification,
  markBgvVerificationDiscrepancy,
  requestBgvCandidateAction,
  holdBgvVerification,
  cancelBgvVerification,
  createBgvReview,
  getLatestBgvReview,
  getBgvReviewHistory,
  reviewBgvDiscrepancy,
  resolveBgvDiscrepancy,
  reopenBgvDiscrepancy,
  verifyBgvDocument,
  rejectBgvDocument,
  expireBgvDocument,
  assignBgvVerification,
  unassignBgvVerification,
} from "../../services/bgvService";

import BgvVerificationEvidenceCard
  from "./BgvVerificationEvidenceCard";

import BgvCandidateProfileEditor
  from "./BgvCandidateProfileEditor";

const CASE_STATUSES = [
  "DRAFT",
  "INITIATED",
  "CANDIDATE_ACTION_REQUIRED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "DISCREPANCY",
  "ESCALATED",
  "CLEARED",
  "CONCERN",
  "UNABLE_TO_VERIFY",
  "ON_HOLD",
  "CANCELLED",
  "CLOSED",
];

const PRIORITIES = ["NORMAL", "HIGH", "CRITICAL"];

const FINAL_RESULTS = [
  "CLEARED",
  "CLEARED_WITH_DISCREPANCY",
  "CONCERN",
  "UNABLE_TO_VERIFY",
  "EXCEPTION",
  "REJECTED",
];

const FINAL_DECISIONS = ["PROCEED", "HOLD", "ESCALATE", "CLOSE"];

const statusMeta = {
  DRAFT: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
  INITIATED: { label: "Initiated", color: "#0284c7", bg: "#f0f9ff" },
  CANDIDATE_ACTION_REQUIRED: { label: "Candidate Action", color: "#d97706", bg: "#fffbeb" },
  IN_PROGRESS: { label: "In Progress", color: "#7c3aed", bg: "#f5f3ff" },
  UNDER_REVIEW: { label: "Under Review", color: "#0891b2", bg: "#ecfeff" },
  DISCREPANCY: { label: "Discrepancy", color: "#dc2626", bg: "#fef2f2" },
  ESCALATED: { label: "Escalated", color: "#b91c1c", bg: "#fef2f2" },
  CLEARED: { label: "Cleared", color: "#16a34a", bg: "#f0fdf4" },
  CONCERN: { label: "Concern", color: "#ca8a04", bg: "#fefce8" },
  UNABLE_TO_VERIFY: { label: "Unable to Verify", color: "#9333ea", bg: "#faf5ff" },
  ON_HOLD: { label: "On Hold", color: "#c2410c", bg: "#fff7ed" },
  CANCELLED: { label: "Cancelled", color: "#64748b", bg: "#f1f5f9" },
  CLOSED: { label: "Closed", color: "#475569", bg: "#f8fafc" },
};

const card = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-sm)",
};

const button = {
  border: 0,
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  background: "var(--primary)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const secondaryButton = {
  ...button,
  background: "var(--card)",
  color: "var(--label)",
  border: "1px solid var(--border)",
};

const dangerButton = {
  ...button,
  background: "#b91c1c",
};

const ghostButton = {
  ...secondaryButton,
  background: "transparent",
};

function ActionButton({ children, icon: Icon, variant = "secondary", ...props }) {
  const styles = {
    primary: button,
    danger: dangerButton,
    ghost: ghostButton,
    secondary: secondaryButton,
  }[variant] || secondaryButton;

  return (
    <button {...props} style={styles}>
      {Icon ? <Icon size={14} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta.DRAFT;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function candidateName(item) {
  if (!item) return "Unknown candidate";
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || "Unknown candidate";
}

function employeeDisplayName(item) {
  if (!item) return "";
  return (
    [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
    item.name ||
    item.employeeCode ||
    item.email ||
    item.id ||
    ""
  );
}

function isFinalClear(caseItem) {
  return (
    caseItem?.status === "CLEARED" &&
    caseItem?.finalResult === "CLEARED" &&
    caseItem?.finalDecision === "PROCEED"
  );
}

export default function BgvTab({ mode = "recruitment" }) {
  const { role, user } = useAuth();
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [finalResult, setFinalResult] = useState("CLEARED");
  const [finalDecision, setFinalDecision] = useState("PROCEED");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [history, setHistory] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [latestReview, setLatestReview] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [verificationForm, setVerificationForm] = useState({
    type: "IDENTITY",
    candidateDocumentId: "",
    dueAt: "",
    source: "",
  });

  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationAssignees, setVerificationAssignees] = useState({});

  const isManager = mode === "manager";
  const isRecruitment = mode === "recruitment";

  const canOperate = role === "HR" || role === "ADMIN";

  // /me may expose employeeCode as user.id while BGV relations use
  // the Employee table UUID. Resolve both forms so individual assignments
  // work even when employeeId is not present in the auth user object.
  const currentEmployeeCode =
    user?.employeeCode ||
    user?.id ||
    user?.employee?.employeeCode ||
    "";

  const authEmployeeIds = [
    user?.employeeId,
    user?.dbId,
    user?.employee?.id,
    user?.employee?.dbId,
  ].filter(Boolean);

  const resolvedCurrentEmployeeId = useMemo(() => {
    if (authEmployeeIds.length) return String(authEmployeeIds[0]);

    const employee = employees.find(
      (item) =>
        String(item.id || "") === String(currentEmployeeCode) ||
        String(item.employeeCode || "") === String(currentEmployeeCode) ||
        String(item.dbId || "") === String(currentEmployeeCode)
    );

    return employee?.dbId || employee?.id || "";
  }, [employees, currentEmployeeCode, authEmployeeIds.join("|")]);

  const currentEmployeeId = resolvedCurrentEmployeeId;

  const resolveAssignedVerifier = (caseItem) => {
    if (!caseItem) return null;

    if (caseItem.assignedVerifier) {
      return caseItem.assignedVerifier;
    }

    const assignedId = caseItem.assignedVerifierId;
    if (!assignedId) return null;

    return (
      employees.find(
        (employee) =>
          employee.dbId === assignedId ||
          employee.id === assignedId ||
          employee.employeeCode === assignedId
      ) || null
    );
  };

  const assignedVerifierName = (caseItem) => {
    const verifier = resolveAssignedVerifier(caseItem);
    return employeeDisplayName(verifier) || (caseItem?.assignedVerifierId ? "Assigned" : "Unassigned");
  };

  const isAdminOrHr =
    role === "HR" || role === "ADMIN";

  // Case assignment is the primary responsibility assignment.
  // Individual verification assignment can optionally narrow/reassign a check.
  const isCaseAssignedToEmployee = (caseItem) => {
    if (!caseItem) return false;

    const verifier = caseItem.assignedVerifier;

    return Boolean(currentEmployeeId || currentEmployeeCode) && (
      String(caseItem.assignedVerifierId || "") === String(currentEmployeeId) ||
      String(caseItem.assignedVerifierId || "") === String(currentEmployeeCode) ||
      String(verifier?.id || "") === String(currentEmployeeId) ||
      String(verifier?.id || "") === String(currentEmployeeCode) ||
      String(verifier?.dbId || "") === String(currentEmployeeId) ||
      String(verifier?.dbId || "") === String(currentEmployeeCode) ||
      String(verifier?.employeeCode || "") === String(currentEmployeeId) ||
      String(verifier?.employeeCode || "") === String(currentEmployeeCode)
    );
  };

  const isVerificationAssignedToEmployee = (verification) => {
    if (!verification) return false;

    const assignee = verification.assignedTo;

    return Boolean(currentEmployeeId || currentEmployeeCode) && (
      String(verification.assignedToId || "") === String(currentEmployeeId) ||
      String(verification.assignedToId || "") === String(currentEmployeeCode) ||
      String(assignee?.id || "") === String(currentEmployeeId) ||
      String(assignee?.id || "") === String(currentEmployeeCode) ||
      String(assignee?.dbId || "") === String(currentEmployeeId) ||
      String(assignee?.dbId || "") === String(currentEmployeeCode) ||
      String(assignee?.employeeCode || "") === String(currentEmployeeId) ||
      String(assignee?.employeeCode || "") === String(currentEmployeeCode)
    );
  };

  const isCaseRelevantToCurrentEmployee = (caseItem) => {
    if (isAdminOrHr) return true;
    if (isCaseAssignedToEmployee(caseItem)) return true;

    return (caseItem?.verifications || []).some(
      (verification) => isVerificationAssignedToEmployee(verification)
    );
  };

  const isCaseAssignedToCurrentEmployee =
    isCaseAssignedToEmployee(selected);

  // HR/Admin can manage everything.
  // A verifier assigned to the case can operate the whole case,
  // including verification assignment/reassignment.
  const canOperateCase =
    isAdminOrHr || isCaseAssignedToCurrentEmployee;

  const canManageVerificationAssignments =
    isAdminOrHr || isCaseAssignedToCurrentEmployee;

  const canViewVerification = (verification) => {
    if (isAdminOrHr) return true;

    // Case verifier can view and operate every verification in the case.
    if (isCaseAssignedToCurrentEmployee) return true;

    // An individually assigned verifier can only access that verification.
    return isVerificationAssignedToEmployee(verification);
  };

  const canOperateAssignedVerification = (verification) =>
    canViewVerification(verification);

  const visibleVerifications = useMemo(() => {
    const all = selected?.verifications || [];

    if (isAdminOrHr || isCaseAssignedToCurrentEmployee) return all;

    return all.filter((verification) =>
      isVerificationAssignedToEmployee(verification)
    );
  }, [
    selected?.verifications,
    selected?.assignedVerifierId,
    selected?.assignedVerifier,
    isAdminOrHr,
    currentEmployeeId,
    currentEmployeeCode,
  ]);

  const assignedVerificationCount = useMemo(
    () => visibleVerifications.length,
    [visibleVerifications]
  );

  const loadCases = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getBgvCases({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        page: 1,
        limit: 100,
      });

      setCases(
        Array.isArray(response.data)
          ? response.data
          : response.data?.data || []
      );
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load BGV cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("========== BGV AUTH DEBUG ==========");
    console.log("AUTH USER:", user);
    console.log("EMPLOYEE ID:", user?.employeeId);
    console.log("ROLE:", user?.role);
  }, [user]);

  useEffect(() => {
    loadCases();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    // Also load employees for individual verifiers: /me can expose EMPxxx
    // while BGV assignedToId is the Employee table UUID.
    getEmployees()
      .then((response) => {
        const employeesData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        setEmployees(employeesData);
      })
      .catch((error) => {
        console.error("FAILED TO LOAD EMPLOYEES:", error);
        setEmployees([]);
      });
  }, []);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return cases;

    return cases.filter((item) => {
      const candidate = candidateName(item.candidate).toLowerCase();
      const email = String(item.candidate?.email || "").toLowerCase();
      const employee = String(item.employee?.employeeCode || "").toLowerCase();

      return (
        candidate.includes(q) ||
        email.includes(q) ||
        employee.includes(q) ||
        String(item.id).toLowerCase().includes(q)
      );
    });
  }, [cases, search]);

  const openCase = async (id) => {
    setSelected(null);
    setDetailLoading(true);
    setError("");
    setNotice("");

    try {
      const [
        caseResponse,
        historyResponse,
        auditResponse,
        assignmentHistoryResponse,
        latestReviewResponse,
        reviewHistoryResponse,
      ] = await Promise.all([
        getBgvCase(id),
        getBgvCaseStatusHistory(id).catch(() => ({ data: [] })),
        getBgvCaseAuditTrail(id).catch(() => ({ data: [] })),
        getBgvCaseAssignmentHistory(id).catch(() => ({ data: [] })),
        getLatestBgvReview(id).catch(() => ({ data: null })),
        getBgvReviewHistory(id).catch(() => ({ data: [] })),
      ]);

      const item = caseResponse.data?.data || caseResponse.data;
      setSelected(item);
      setAssignTo(item?.assignedVerifierId || "");
      setFinalResult(item?.finalResult || "CLEARED");
      setFinalDecision(item?.finalDecision || "PROCEED");
      setReviewRemarks(item?.reviewRemarks || "");
      setHistory(
        Array.isArray(historyResponse.data)
          ? historyResponse.data
          : historyResponse.data?.data || []
      );

      setAuditTrail(
        Array.isArray(auditResponse.data)
          ? auditResponse.data
          : auditResponse.data?.data || []
      );

      setAssignmentHistory(
        Array.isArray(assignmentHistoryResponse.data)
          ? assignmentHistoryResponse.data
          : assignmentHistoryResponse.data?.data || []
      );

      setLatestReview(
        latestReviewResponse.data?.data ||
        latestReviewResponse.data ||
        null
      );

      setReviewHistory(
        Array.isArray(reviewHistoryResponse.data)
          ? reviewHistoryResponse.data
          : reviewHistoryResponse.data?.data || []
      );
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load BGV case");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (selected?.id) await openCase(selected.id);
    await loadCases();
  };

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(successMessage);
      await refreshSelected();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "BGV action failed");
    } finally {
      setBusy("");
    }
  };

  const handleAssign = () => {
    if (!selected || !assignTo) return;

    runAction(
      "assign",
      () => assignBgvCaseVerifier(selected.id, { assignedToId: assignTo }),
      "BGV verifier assigned successfully."
    );
  };

  const handleUnassign = () => {
    if (!selected) return;

    runAction(
      "unassign",
      () => unassignBgvCaseVerifier(selected.id),
      "BGV verifier unassigned."
    );
  };

  const handleStatus = (status) => {
    if (!selected) return;

    runAction(
      `status-${status}`,
      () => changeBgvCaseStatus(selected.id, { status }),
      `BGV status changed to ${status}.`
    );
  };

  const handleInitiate = () => {
    if (!selected) return;

    runAction(
      "initiate",
      () => initiateBgvCase(selected.id),
      "BGV case initiated."
    );
  };

  const handleFinalDecision = () => {
    if (!selected) return;

    if (!finalResult || !finalDecision) {
      setError("Final result and final decision are required.");
      return;
    }

    runAction(
      "final",
      () =>
        setFinalBgvDecision(selected.id, {
          finalResult,
          finalDecision,
          reviewRemarks: reviewRemarks.trim() || undefined,
        }),
      "Final BGV decision saved."
    );
  };

  const runVerificationAction = async (verification, action) => {
    setBusy(`verification-${verification.id}`);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(`Verification ${verification.type} updated successfully.`);
      await refreshSelected();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Verification action failed");
    } finally {
      setBusy("");
    }
  };

  const handleAssignVerification = (verification) => {
    if (!verification) return;

    const selectedAssignee =
      verificationAssignees[verification.id] ||
      verification.assignedToId ||
      "";

    if (!selectedAssignee) {
      setError("Please select a verifier.");
      return;
    }

    const assignedEmployee = employees.find(
      (employee) =>
        employee.dbId === selectedAssignee ||
        employee.id === selectedAssignee ||
        employee.employeeCode === selectedAssignee
    );

    if (!assignedEmployee?.dbId) {
      setError("Selected verifier employee could not be resolved.");
      return;
    }

    const assigningEmployee = employees.find(
      (employee) =>
        employee.dbId === currentEmployeeId ||
        employee.id === currentEmployeeId ||
        employee.employeeCode === currentEmployeeId ||
        employee.dbId === currentEmployeeCode ||
        employee.id === currentEmployeeCode ||
        employee.employeeCode === currentEmployeeCode
    );

    if (!assigningEmployee?.dbId) {
      setError("Authenticated employee could not be resolved.");
      return;
    }

    runVerificationAction(
      verification,
      () =>
        assignBgvVerification(verification.id, {
          assignedToId: assignedEmployee.dbId,
          assignedById: assigningEmployee.dbId,
        })
    );
  };

  const handleUnassignVerification = (verification) => {
    if (!verification) return;

    runVerificationAction(
      verification,
      () => unassignBgvVerification(verification.id)
    );
  };

  const addReview = async () => {

    console.log("AUTH USER FOR REVIEW:", user);
    console.log("ALL EMPLOYEES FOR REVIEW:", employees);

    if (!selected || !canOperate) return;

    const decision = window.prompt(
      "Review decision: APPROVE / REJECT / REQUEST_MORE_INFORMATION / ESCALATE",
      "APPROVE"
    );
    if (!decision) return;

    const normalizedDecision = decision.trim().toUpperCase();
    if (![
      "APPROVE",
      "REJECT",
      "REQUEST_MORE_INFORMATION",
      "ESCALATE",
    ].includes(normalizedDecision)) {
      setError("Invalid review decision.");
      return;
    }

    const remarks = window.prompt("Review remarks", "");
    setBusy("create-review");
    setError("");
    setNotice("");

    try {
      const reviewer = employees.find(
        (employee) =>
          employee.dbId === currentEmployeeId ||
          employee.id === currentEmployeeId ||
          employee.employeeCode === currentEmployeeId ||
          employee.id === currentEmployeeCode ||
          employee.employeeCode === currentEmployeeCode
      );

      if (!reviewer?.dbId) {
        setError("Authenticated employee could not be resolved.");
        return;
      }

      await createBgvReview({
        caseId: selected.id,
        reviewerId: reviewer.dbId,
        decision: normalizedDecision,
        remarks: remarks?.trim() || "BGV review recorded.",
      });
      setNotice("BGV review recorded successfully.");
      await refreshSelected();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to create BGV review");
    } finally {
      setBusy("");
    }
  };


  const addVerification = async () => {
    if (!selected) return;

    if (!verificationForm.type) {
      setError("Verification type is required.");
      return;
    }

    if (!verificationForm.candidateDocumentId) {
      setError("Please select a candidate document.");
      return;
    }

    setBusy("create-verification");
    setError("");
    setNotice("");

    try {
      await createBgvVerification({
        caseId: selected.id,
        type: verificationForm.type,
        candidateDocumentId: verificationForm.candidateDocumentId,
        dueAt: verificationForm.dueAt || undefined,
        source: verificationForm.source.trim() || undefined,
      });

      setNotice(
        `${verificationForm.type} verification created successfully.`
      );

      setVerificationForm({
        type: "IDENTITY",
        candidateDocumentId: "",
        dueAt: "",
        source: "",
      });

      setShowVerificationForm(false);

      await refreshSelected();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        e.message ||
        "Failed to create verification"
      );
    } finally {
      setBusy("");
    }
  };

  const handleDiscrepancyReview = (item) => {
    if (!canOperate) return;

    const remarks = window.prompt("Discrepancy review remarks", item.resolution || "");
    if (remarks === null) return;

    runAction(
      `discrepancy-review-${item.id}`,
      () => reviewBgvDiscrepancy(item.id, { remarks: remarks.trim() || undefined }),
      "Discrepancy sent for review."
    );
  };

  const handleDiscrepancyResolve = (item) => {
    if (!canOperate) return;

    const status = window.prompt(
      "Resolution status: RESOLVED / ACCEPTED / REJECTED",
      "RESOLVED"
    );
    if (!status) return;

    const normalizedStatus = status.trim().toUpperCase();
    if (!["RESOLVED", "ACCEPTED", "REJECTED"].includes(normalizedStatus)) {
      setError("Invalid discrepancy resolution status.");
      return;
    }

    const resolution = window.prompt("Resolution", "");
    if (!resolution?.trim()) return;

    runAction(
      `discrepancy-resolve-${item.id}`,
      () => {
        if (!currentEmployeeId) {
          throw new Error("Authenticated employee ID is not available.");
        }
        return resolveBgvDiscrepancy(item.id, {
          status: normalizedStatus,
          resolvedById: currentEmployeeId,
          resolution: resolution.trim(),
        });
      },
      "Discrepancy resolution saved."
    );
  };

  const handleDiscrepancyReopen = (item) => {
    if (!canOperate) return;

    const reason = window.prompt("Reason for reopening discrepancy", "");
    if (reason === null) return;

    runAction(
      `discrepancy-reopen-${item.id}`,
      () => reopenBgvDiscrepancy(item.id, { reason: reason.trim() || undefined }),
      "Discrepancy reopened."
    );
  };

  const handleDocumentVerify = (doc) => {
    if (!canOperate) return;

    runAction(
      `document-verify-${doc.id}`,
      () => {
        if (!currentEmployeeId) {
          throw new Error("Authenticated employee ID is not available.");
        }
        return verifyBgvDocument(doc.id, { verifiedById: currentEmployeeId });
      },
      "BGV document verified."
    );
  };

  const handleDocumentReject = (doc) => {
    if (!canOperate) return;

    const reason = window.prompt("Document rejection reason", "");
    if (!reason?.trim()) return;

    runAction(
      `document-reject-${doc.id}`,
      () => {
        if (!currentEmployeeId) {
          throw new Error("Authenticated employee ID is not available.");
        }
        return rejectBgvDocument(doc.id, {
          verifiedById: currentEmployeeId,
          rejectionReason: reason.trim(),
        });
      },
      "BGV document rejected."
    );
  };

  const handleDocumentExpire = (doc) => {
    if (!canOperate) return;

    runAction(
      `document-expire-${doc.id}`,
      () => expireBgvDocument(doc.id),
      "BGV document marked expired."
    );
  };

  const counts = useMemo(() => {
    return {
      total: cases.length,
      pending: cases.filter((x) =>
        ["DRAFT", "INITIATED", "CANDIDATE_ACTION_REQUIRED", "IN_PROGRESS", "ON_HOLD"].includes(x.status)
      ).length,
      review: cases.filter((x) =>
        ["UNDER_REVIEW", "DISCREPANCY", "ESCALATED"].includes(x.status)
      ).length,
      cleared: cases.filter((x) => x.status === "CLEARED").length,
      concern: cases.filter((x) =>
        ["CONCERN", "UNABLE_TO_VERIFY"].includes(x.status)
      ).length,
    };
  }, [cases]);

  return (
    <div className="bgv-shell" style={{ minWidth: 0 }}>
      <style>{`
        .bgv-shell * { box-sizing: border-box; }
        .bgv-shell button, .bgv-shell select, .bgv-shell input, .bgv-shell textarea {
          font: inherit;
        }
        .bgv-shell button {
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease, background .15s ease;
        }
        .bgv-shell button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(15, 23, 42, .08);
        }
        .bgv-shell button:disabled { opacity: .55; cursor: not-allowed; }
        .bgv-shell input:focus, .bgv-shell select:focus, .bgv-shell textarea:focus {
          outline: none;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .bgv-table-row:hover { background: rgba(59, 130, 246, 0.03); }
        .bgv-verification-card {
          border: 1px solid var(--border);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .bgv-verification-card:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
        .bgv-scroll { scrollbar-width: thin; }
        @media (max-width: 760px) {
          .bgv-filter-grid { grid-template-columns: 1fr !important; }
          .bgv-drawer { width: 100% !important; max-width: 100% !important; padding: 14px !important; }
          .bgv-detail-grid { grid-template-columns: 1fr 1fr !important; }
          .bgv-mobile-stack { flex-direction: column !important; align-items: stretch !important; }
          .bgv-mobile-stack > * { width: 100% !important; min-width: 0 !important; }
          .bgv-action-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .bgv-detail-grid { grid-template-columns: 1fr !important; }
          .bgv-stat { padding: 12px !important; }
          .bgv-table-wrap table { min-width: 720px; }
        }
      `}</style>
      {isRecruitment ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 15,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(59, 130, 246, 0.10)", color: "var(--primary)" }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Background Verification</h2>
                  <p style={{ color: "var(--subtext)", margin: "5px 0 0" }}>
                    Candidate BGV overview and verification progress.
                  </p>
                </div>
              </div>
            </div>

            <ActionButton icon={RefreshCw} onClick={loadCases} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </ActionButton>
          </div>

          {notice && (
            <div style={{ ...card, padding: 12, marginBottom: 14, color: "#047857", background: "#ecfdf5" }}>
              {notice}
            </div>
          )}

          {error && (
            <div style={{ ...card, padding: 12, marginBottom: 14, color: "#b91c1c", background: "#fef2f2" }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              ["Total Cases", counts.total, ShieldCheck],
              ["Pending", counts.pending, Clock3],
              ["Review", counts.review, AlertTriangle],
              ["Cleared", counts.cleared, CheckCircle2],
              ["Concern", counts.concern, XCircle],
            ].map(([label, value, Icon]) => (
              <div key={label} className="bgv-stat" style={{ ...card, padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--subtext)", fontSize: 12, fontWeight: 600 }}>{label}</span>
                  <Icon size={17} />
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ ...card, padding: 30, textAlign: "center" }}>Loading BGV cases...</div>
          ) : filteredCases.length === 0 ? (
            <div style={{ ...card, padding: 35, textAlign: "center", color: "var(--subtext)" }}>
              No BGV cases found.
            </div>
          ) : (
            <div style={{ ...card, overflow: "hidden" }}>
              <div className="bgv-table-wrap bgv-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                      {["Candidate", "BGV Status", "Checks", "Discrepancies", "Priority", "Created"].map((head) => (
                        <th
                          key={head}
                          style={{
                            padding: "11px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            color: "var(--subtext)",
                            textTransform: "uppercase",
                            letterSpacing: ".4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: index < filteredCases.length - 1 ? "1px solid var(--border)" : "none" }}
                      >
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ fontWeight: 700 }}>{candidateName(item.candidate)}</div>
                          <div style={{ fontSize: 11, color: "var(--subtext)" }}>
                            {item.candidate?.email || item.employee?.employeeCode || item.id}
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          {item.verifications?.length || 0}
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          {item.discrepancies?.length || 0}
                        </td>
                        <td style={{ padding: "13px 14px", fontWeight: 700 }}>
                          {item.priority}
                        </td>
                        <td style={{ padding: "13px 14px", fontSize: 12 }}>
                          {formatDate(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 15,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(59, 130, 246, 0.10)", color: "var(--primary)" }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19 }}>BGV Manager</h2>
                  <p style={{ color: "var(--subtext)", margin: "5px 0 0" }}>
                    Manage BGV cases, verifications, discrepancies, reviews and final decisions.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginTop: 9 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px", borderRadius: 999, background: "var(--background)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 700 }}>
                  <ShieldCheck size={13} />
                  {isAdminOrHr ? "Manager access" : "My assigned work"}
                </span>
                {!isAdminOrHr && (
                  <span style={{ color: "var(--subtext)", fontSize: 11 }}>
                    Cases assigned to you include all verification checks; individual checks may also be assigned separately.
                  </span>
                )}
              </div>
            </div>

            <ActionButton icon={RefreshCw} onClick={loadCases} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </ActionButton>
          </div>

          {notice && (
            <div style={{ ...card, padding: 12, marginBottom: 14, color: "#047857", background: "#ecfdf5" }}>
              {notice}
            </div>
          )}

          {error && (
            <div style={{ ...card, padding: 12, marginBottom: 14, color: "#b91c1c", background: "#fef2f2" }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              ["Total Cases", counts.total, ShieldCheck],
              ["Pending", counts.pending, Clock3],
              ["Review", counts.review, AlertTriangle],
              ["Cleared", counts.cleared, CheckCircle2],
              ["Concern", counts.concern, XCircle],
            ].map(([label, value, Icon]) => (
              <div key={label} className="bgv-stat" style={{ ...card, padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--subtext)", fontSize: 12, fontWeight: 600 }}>{label}</span>
                  <Icon size={17} />
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, padding: 14, marginBottom: 14 }}>
            <div
              className="bgv-filter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1fr) 180px 180px",
                gap: 10,
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--subtext)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidate, email, employee code or case ID"
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 35px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "9px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
              >
                <option value="">All statuses</option>
                {CASE_STATUSES.map((status) => (
                  <option key={status} value={status}>{statusMeta[status]?.label || status}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  padding: "9px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--card)",
                  color: "var(--text)",
                }}
              >
                <option value="">All priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ ...card, padding: 30, textAlign: "center" }}>Loading BGV cases...</div>
          ) : filteredCases.length === 0 ? (
            <div style={{ ...card, padding: 35, textAlign: "center", color: "var(--subtext)" }}>
              No BGV cases found.
            </div>
          ) : (
            <div style={{ ...card, overflow: "hidden" }}>
              <div className="bgv-table-wrap bgv-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                      {["Candidate", "Status", "Priority", "Verifier", "Checks", "Discrepancies", "Created", "Action"].map((head) => (
                        <th
                          key={head}
                          style={{
                            padding: "11px 14px",
                            textAlign: "left",
                            fontSize: 11,
                            color: "var(--subtext)",
                            textTransform: "uppercase",
                            letterSpacing: ".4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCases.map((item, index) => (
                      <tr key={item.id} className="bgv-table-row" style={{ borderBottom: index < filteredCases.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ fontWeight: 700 }}>{candidateName(item.candidate)}</div>
                          <div style={{ fontSize: 11, color: "var(--subtext)" }}>
                            {item.candidate?.email || item.employee?.employeeCode || item.id}
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px" }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: "13px 14px", fontWeight: 700 }}>{item.priority}</td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ fontWeight: 700 }}>
                            {assignedVerifierName(item)}
                          </div>
                          {item.assignedVerifierId && (
                            <div style={{ fontSize: 10, color: "var(--subtext)", marginTop: 2 }}>
                              Assigned
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "13px 14px" }}>{item.verifications?.length || 0}</td>
                        <td style={{ padding: "13px 14px" }}>{item.discrepancies?.length || 0}</td>
                        <td style={{ padding: "13px 14px", fontSize: 12 }}>{formatDate(item.createdAt)}</td>
                        <td style={{ padding: "13px 14px" }}>
                          <ActionButton icon={Eye} onClick={() => openCase(item.id)}>
                            Open
                          </ActionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(selected || detailLoading) && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(15, 23, 42, .45)",
                display: "flex",
                justifyContent: "flex-end",
              }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSelected(null);
              }}
            >
              <div
                className="bgv-drawer bgv-scroll"
                style={{
                  width: "min(900px, 96vw)",
                  height: "100%",
                  overflowY: "auto",
                  background: "var(--card)",
                  padding: 22,
                  boxSizing: "border-box",
                }}
              >
                {detailLoading ? (
                  <div style={{ padding: 30, textAlign: "center" }}>Loading case...</div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 18 }}>
                          {candidateName(selected?.candidate)}
                        </h2>
                        <BgvCandidateProfileEditor
                          candidate={selected?.candidate}
                          canOperate={canOperate}
                          onSaved={refreshSelected}
                        />
                        <p style={{ margin: "5px 0", color: "var(--subtext)", fontSize: 12 }}>
                          Case ID: {selected?.id}
                        </p>
                        <StatusBadge status={selected?.status} />
                      </div>

                      <ActionButton icon={X} onClick={() => setSelected(null)}>
                        Close
                      </ActionButton>
                    </div>

                    <div
                      className="bgv-detail-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 10,
                        marginTop: 18,
                      }}
                    >
                      {[
                        ["Priority", selected?.priority || "-"],
                        ["Verifier", assignedVerifierName(selected)],
                        ["Vendor", selected?.vendor?.name || "-"],
                        ["Final Result", selected?.finalResult || "Pending"],
                        ["Final Decision", selected?.finalDecision || "Pending"],
                        ["Due", formatDate(selected?.dueAt)],
                      ].map(([label, value]) => (
                        <div key={label} style={{ ...card, padding: 12 }}>
                          <div style={{ fontSize: 10, color: "var(--subtext)", textTransform: "uppercase" }}>{label}</div>
                          <div style={{ marginTop: 5, fontWeight: 700, fontSize: 13 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {!isAdminOrHr && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "11px 13px",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "rgba(59, 130, 246, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          color: "var(--text)",
                          fontSize: 12,
                        }}
                      >
                        <UserRound size={16} />
                        <span>
                          <b>Your assigned work:</b> {assignedVerificationCount} verification
                          {assignedVerificationCount === 1 ? "" : "s"} available in this case.
                        </span>
                      </div>
                    )}

                    {canOperateCase && (
                      <>
                        <div style={{ ...card, padding: 15, marginTop: 14 }}>
                          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Case Actions</h3>

                          <div className="bgv-mobile-stack" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {selected?.status === "DRAFT" && (
                              <ActionButton icon={Play} variant="primary" onClick={handleInitiate} disabled={busy === "initiate"}>
                                Initiate BGV
                              </ActionButton>
                            )}

                            {["INITIATED", "CANDIDATE_ACTION_REQUIRED", "ON_HOLD"].includes(selected?.status) && (
                              <button style={button} onClick={() => handleStatus("IN_PROGRESS")} disabled={busy === "status-IN_PROGRESS"}>
                                Move to In Progress
                              </button>
                            )}

                            {!["CLOSED", "CANCELLED", "CLEARED", "CONCERN", "UNABLE_TO_VERIFY"].includes(selected?.status) && (
                              <ActionButton icon={XCircle} onClick={() => handleStatus("CANCELLED")} disabled={busy === "status-CANCELLED"}>
                                Cancel Case
                              </ActionButton>
                            )}

                            {selected?.status === "IN_PROGRESS" && (
                              <ActionButton icon={Eye} variant="primary" onClick={() => handleStatus("UNDER_REVIEW")} disabled={busy === "status-UNDER_REVIEW"}>
                                Move to Review
                              </ActionButton>
                            )}

                            {["UNDER_REVIEW", "DISCREPANCY", "ESCALATED"].includes(selected?.status) && (
                              <>
                                <ActionButton icon={AlertTriangle} variant="danger" onClick={() => handleStatus("ESCALATED")}>
                                  Escalate
                                </ActionButton>
                              </>
                            )}
                          </div>

                          {selected?.status === "DRAFT" && (
                            <p style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 0 }}>
                              Assigning a verifier also starts the case automatically on the backend.
                            </p>
                          )}
                        </div>

                        <div style={{ ...card, padding: 15, marginTop: 14 }}>
                          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Verifier Assignment</h3>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <select
                              value={assignTo}
                              onChange={(e) => setAssignTo(e.target.value)}
                              style={{
                                flex: 1,
                                minWidth: 220,
                                padding: "9px 12px",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--card)",
                                color: "var(--text)",
                              }}
                            >
                              <option value="">Select verifier</option>
                              {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName || ""} - {employee.employeeCode}
                                </option>
                              ))}
                            </select>

                            <ActionButton icon={UserCheck} variant="primary" onClick={handleAssign} disabled={!assignTo || busy === "assign"}>
                              Assign
                            </ActionButton>

                            {selected?.assignedVerifierId && (
                              <ActionButton icon={X} onClick={handleUnassign} disabled={busy === "unassign"}>
                                Unassign
                              </ActionButton>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 14 }}>
                          Verifications ({isAdminOrHr ? (selected?.verifications?.length || 0) : assignedVerificationCount})
                        </h3>

                        {canOperateCase && (
                          <button
                            style={secondaryButton}
                            onClick={() => setShowVerificationForm(true)}
                            disabled={busy === "create-verification"}
                          >
                            + Add Verification
                          </button>
                        )}
                      </div>


                      {showVerificationForm && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 15,
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            background: "var(--background)",
                          }}
                        >
                          <h4 style={{ margin: "0 0 14px", fontSize: 13 }}>
                            Create Verification
                          </h4>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: 10,
                            }}
                          >
                            {/* Type */}
                            <div>
                              <label style={{ display: "block", fontSize: 11, marginBottom: 5 }}>
                                Verification Type
                              </label>

                              <select
                                value={verificationForm.type}
                                onChange={(e) =>
                                  setVerificationForm((prev) => ({
                                    ...prev,
                                    type: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "9px 10px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--card)",
                                  color: "var(--text)",
                                }}
                              >
                                <option value="IDENTITY">Identity</option>
                                <option value="ADDRESS">Address</option>
                                <option value="EMPLOYMENT">Employment</option>
                                <option value="EDUCATION">Education</option>
                                <option value="CRIMINAL">Criminal</option>
                                <option value="REFERENCE">Reference</option>
                                <option value="DOCUMENT">Document</option>
                                <option value="CUSTOM">Custom</option>
                              </select>
                            </div>

                            {/* Candidate Document */}
                            <div>
                              <label style={{ display: "block", fontSize: 11, marginBottom: 5 }}>
                                Candidate Document
                              </label>

                              <select
                                value={verificationForm.candidateDocumentId}
                                onChange={(e) =>
                                  setVerificationForm((prev) => ({
                                    ...prev,
                                    candidateDocumentId: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "9px 10px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--card)",
                                  color: "var(--text)",
                                }}
                              >
                                <option value="">Select document</option>

                                {selected?.application?.documents?.map((doc) => (
                                  <option key={doc.id} value={doc.id}>
                                    {doc.fileName}
                                    {doc.documentType ? ` - ${doc.documentType}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Due Date */}
                            <div>
                              <label style={{ display: "block", fontSize: 11, marginBottom: 5 }}>
                                Due Date
                              </label>

                              <input
                                type="datetime-local"
                                value={verificationForm.dueAt}
                                onChange={(e) =>
                                  setVerificationForm((prev) => ({
                                    ...prev,
                                    dueAt: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "9px 10px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--card)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>

                            {/* Source */}
                            <div>
                              <label style={{ display: "block", fontSize: 11, marginBottom: 5 }}>
                                Source / Vendor Reference
                              </label>

                              <input
                                type="text"
                                placeholder="Optional"
                                value={verificationForm.source}
                                onChange={(e) =>
                                  setVerificationForm((prev) => ({
                                    ...prev,
                                    source: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "9px 10px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--card)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 14,
                            }}
                          >
                            <button
                              style={button}
                              onClick={addVerification}
                              disabled={busy === "create-verification"}
                            >
                              {busy === "create-verification"
                                ? "Creating..."
                                : "Create Verification"}
                            </button>

                            <button
                              style={secondaryButton}
                              onClick={() => {
                                setShowVerificationForm(false);
                                setError("");
                              }}
                              disabled={busy === "create-verification"}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}


                      {!visibleVerifications.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>
                          No verification checks are available to you in this case.
                        </p>
                      ) : (
                        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                          {visibleVerifications.map((verification) => (
                            <div key={verification.id} className="bgv-verification-card" style={{ padding: 14, background: "var(--background)", borderRadius: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", background: "var(--card)", color: "var(--primary)", flexShrink: 0 }}>
                                    <FileCheck2 size={16} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <b style={{ display: "block", fontSize: 13 }}>{verification.type}</b>
                                    <span style={{ display: "block", color: "var(--subtext)", fontSize: 10 }}>
                                      {verification.assignedTo
                                        ? `Assigned to ${verification.assignedTo.firstName || ""} ${verification.assignedTo.lastName || ""}`.trim()
                                        : isCaseAssignedToCurrentEmployee
                                          ? "Covered by case assignment"
                                          : "Not assigned"}
                                    </span>
                                  </div>
                                </div>
                                <StatusBadge status={verification.status} />
                              </div>

                              {verification.candidateDocument && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginTop: 8,
                                    fontSize: 11,
                                  }}
                                >
                                  <span style={{ color: "var(--subtext)" }}>
                                    Document: {verification.candidateDocument.fileName}
                                  </span>

                                  <button
                                    type="button"
                                    style={secondaryButton}
                                    onClick={() => {
                                      const fileUrl =
                                        verification.candidateDocument.fileUrl || "";

                                      if (!fileUrl) {
                                        setError("Document URL is not available.");
                                        return;
                                      }

                                      const apiUrl =
                                        import.meta.env.VITE_API_URL || "";

                                      const baseUrl = apiUrl.replace(/\/api\/?$/, "");

                                      const url = fileUrl.startsWith("http")
                                        ? fileUrl
                                        : `${baseUrl}${fileUrl}`;

                                      window.open(
                                        url,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    }}
                                  >
                                    <Eye size={14} />
                                    View Document
                                  </button>
                                </div>
                              )}

                              <BgvVerificationEvidenceCard
                                verification={verification}
                                candidate={selected?.candidate}
                                canOperate={canOperateAssignedVerification(verification)}
                                onRefresh={refreshSelected}
                                onViewDocument={(document) => {
                                  const fileUrl = document?.fileUrl || "";

                                  if (!fileUrl) {
                                    setError("Document URL is not available.");
                                    return;
                                  }

                                  const apiUrl = import.meta.env.VITE_API_URL || "";
                                  const baseUrl = apiUrl.replace(/\/api\/?$/, "");

                                  const url = fileUrl.startsWith("http")
                                    ? fileUrl
                                    : `${baseUrl}${fileUrl}`;

                                  window.open(url, "_blank", "noopener,noreferrer");
                                }}
                              />

                              <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 5 }}>
                                Result: {verification.result || "Pending"}
                                {" - "}
                                Due: {formatDate(verification.dueAt)}
                                {verification.assignedTo
                                  ? ` - ${verification.assignedTo.firstName || ""} ${verification.assignedTo.lastName || ""}`
                                  : ""}
                              </div>

                              {canManageVerificationAssignments && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 7,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    marginTop: 9,
                                  }}
                                >
                                  <select
                                    value={
                                      verificationAssignees[verification.id] ||
                                      verification.assignedToId ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setVerificationAssignees((prev) => ({
                                        ...prev,
                                        [verification.id]: e.target.value,
                                      }))
                                    }
                                    disabled={
                                      busy === `verification-${verification.id}` ||
                                      ["COMPLETED", "FAILED", "UNABLE_TO_VERIFY", "CANCELLED"].includes(
                                        verification.status
                                      )
                                    }
                                    style={{
                                      minWidth: 220,
                                      padding: "7px 10px",
                                      border: "1px solid var(--border)",
                                      borderRadius: "var(--radius-sm)",
                                      background: "var(--card)",
                                      color: "var(--text)",
                                      fontSize: 12,
                                    }}
                                  >
                                    <option value="">Select verifier</option>

                                    {employees.map((employee) => (
                                      <option key={employee.dbId} value={employee.dbId}>
                                        {employee.firstName} {employee.lastName || ""} - {employee.employeeCode}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    style={secondaryButton}
                                    disabled={
                                      !(
                                        verificationAssignees[verification.id] ||
                                        verification.assignedToId
                                      ) ||
                                      busy === `verification-${verification.id}` ||
                                      ["COMPLETED", "FAILED", "UNABLE_TO_VERIFY", "CANCELLED"].includes(
                                        verification.status
                                      )
                                    }
                                    onClick={() => handleAssignVerification(verification)}
                                  >
                                    {verification.assignedToId ? "Reassign" : "Assign"}
                                  </button>

                                  {verification.assignedToId && (
                                    <button
                                      style={secondaryButton}
                                      disabled={
                                        busy === `verification-${verification.id}` ||
                                        ["COMPLETED", "FAILED", "UNABLE_TO_VERIFY", "CANCELLED"].includes(
                                          verification.status
                                        )
                                      }
                                      onClick={() => handleUnassignVerification(verification)}
                                    >
                                      Unassign
                                    </button>
                                  )}
                                </div>
                              )}

                              {verification.remarks && (
                                <div style={{ marginTop: 5, fontSize: 12 }}>{verification.remarks}</div>
                              )}

                              {canOperateAssignedVerification(verification) && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                                  {verification.status === "ASSIGNED" && (
                                    <button
                                      style={secondaryButton}
                                      disabled={busy === `verification-${verification.id}`}
                                      onClick={() =>
                                        runVerificationAction(
                                          verification,
                                          () => startBgvVerification(verification.id)
                                        )
                                      }
                                    >
                                      <Play size={14} /> Start
                                    </button>
                                  )}

                                  {["IN_PROGRESS", "CANDIDATE_ACTION_REQUIRED"].includes(verification.status) && (
                                    <button
                                      style={secondaryButton}
                                      disabled={busy === `verification-${verification.id}`}
                                      onClick={() => {
                                        const result = window.prompt(
                                          "Result: CLEAR / CONCERN / DISCREPANCY / FAILED / UNABLE_TO_VERIFY",
                                          verification.result || "CLEAR"
                                        );

                                        if (!result) return;

                                        const normalizedResult = result.trim().toUpperCase();

                                        if (![
                                          "CLEAR",
                                          "CONCERN",
                                          "DISCREPANCY",
                                          "FAILED",
                                          "UNABLE_TO_VERIFY",
                                        ].includes(normalizedResult)) {
                                          setError("Invalid verification result.");
                                          return;
                                        }

                                        const remarks = window.prompt("Submission remarks (optional)", "");

                                        return runVerificationAction(
                                          verification,
                                          () =>
                                            submitBgvVerification(verification.id, {
                                              result: normalizedResult,
                                              remarks: remarks?.trim() || undefined,
                                            })
                                        );
                                      }}
                                    >
                                      <CheckCircle2 size={14} /> Submit
                                    </button>
                                  )}

                                  {["SUBMITTED", "UNDER_REVIEW", "DISCREPANCY"].includes(verification.status) && (
                                    <button
                                      style={button}
                                      disabled={busy === `verification-${verification.id}`}
                                      onClick={() => {
                                        const result = window.prompt(
                                          "Result: CLEAR / CONCERN / DISCREPANCY / FAILED / UNABLE_TO_VERIFY",
                                          verification.result || "CLEAR"
                                        );

                                        if (!result) return;

                                        const normalizedResult = result.trim().toUpperCase();

                                        if (![
                                          "CLEAR",
                                          "CONCERN",
                                          "DISCREPANCY",
                                          "FAILED",
                                          "UNABLE_TO_VERIFY",
                                        ].includes(normalizedResult)) {
                                          setError("Invalid verification result.");
                                          return;
                                        }

                                        const remarks = window.prompt("Completion remarks (optional)", "");

                                        return runVerificationAction(
                                          verification,
                                          () =>
                                            completeBgvVerification(verification.id, {
                                              result: normalizedResult,
                                              remarks: remarks?.trim() || undefined,
                                            })
                                        );
                                      }}
                                    >
                                      <CheckCircle2 size={14} /> Complete
                                    </button>
                                  )}

                                  {["IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"].includes(verification.status) && (
                                    <button
                                      style={{ ...button, background: "#dc2626" }}
                                      disabled={busy === `verification-${verification.id}`}
                                      onClick={() => {
                                        const level = window.prompt("Discrepancy level: MINOR / MAJOR / CRITICAL", "MAJOR");
                                        if (!level) return;
                                        const remarks = window.prompt("Discrepancy remarks", "");
                                        return runVerificationAction(
                                          verification,
                                          () =>
                                            markBgvVerificationDiscrepancy(
                                              verification.id,
                                              {
                                                discrepancyLevel: level.trim().toUpperCase(),
                                                remarks: remarks || undefined,
                                              }
                                            )
                                        );
                                      }}
                                    >
                                      <AlertTriangle size={14} /> Discrepancy
                                    </button>
                                  )}

                                  {!["COMPLETED", "FAILED", "UNABLE_TO_VERIFY", "CANCELLED"].includes(verification.status) && (
                                    <>
                                      <button
                                        style={secondaryButton}
                                        disabled={busy === `verification-${verification.id}`}
                                        onClick={() => {
                                          const remarks = window.prompt("Why does the candidate need to act?", "");
                                          return runVerificationAction(
                                            verification,
                                            () => requestBgvCandidateAction(verification.id, { remarks: remarks || undefined })
                                          );
                                        }}
                                      >
                                        <UserRound size={14} /> Candidate Action
                                      </button>

                                      <button
                                        style={secondaryButton}
                                        disabled={busy === `verification-${verification.id}`}
                                        onClick={() => {
                                          const remarks = window.prompt("Hold reason (optional)", "");
                                          return runVerificationAction(
                                            verification,
                                            () => holdBgvVerification(verification.id, { remarks: remarks || undefined })
                                          );
                                        }}
                                      >
                                        Hold
                                      </button>

                                      <button
                                        style={dangerButton}
                                        disabled={busy === `verification-${verification.id}`}
                                        onClick={() => {
                                          const remarks = window.prompt("Cancellation reason (optional)", "");
                                          return runVerificationAction(
                                            verification,
                                            () => cancelBgvVerification(verification.id, { remarks: remarks || undefined })
                                          );
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
                        Discrepancies ({selected?.discrepancies?.length || 0})
                      </h3>

                      {!selected?.discrepancies?.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>No discrepancies recorded.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {selected.discrepancies.map((item) => (
                            <div key={item.id} style={{ padding: 11, background: "var(--background)", borderRadius: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <b>{item.level}</b>
                                <span style={{ fontSize: 11, fontWeight: 700 }}>{item.status}</span>
                              </div>
                              <div style={{ marginTop: 5, fontSize: 12 }}>{item.description}</div>
                              {(item.expectedValue || item.actualValue) && (
                                <div style={{ marginTop: 5, fontSize: 11, color: "var(--subtext)" }}>
                                  Expected: {item.expectedValue || "-"} - Actual: {item.actualValue || "-"}
                                </div>
                              )}
                              {item.resolution && (
                                <div style={{ marginTop: 5, fontSize: 11 }}>
                                  Resolution: {item.resolution}
                                </div>
                              )}

                              {canOperate && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                  {item.status === "OPEN" && (
                                    <>
                                      <button style={secondaryButton} onClick={() => handleDiscrepancyReview(item)}>
                                        Review
                                      </button>
                                      <button style={button} onClick={() => handleDiscrepancyResolve(item)}>
                                        Resolve
                                      </button>
                                    </>
                                  )}
                                  {["RESOLVED", "ACCEPTED", "REJECTED"].includes(item.status) && (
                                    <button style={secondaryButton} onClick={() => handleDiscrepancyReopen(item)}>
                                      Reopen
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Candidate Documents */}
                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
                        Candidate Documents
                      </h3>

                      {!selected?.application?.documents?.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>
                          No candidate documents uploaded.
                        </p>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {selected.application.documents.map((doc) => {
                            const fileUrl = doc.fileUrl || doc.documentUrl;

                            return (
                              <div
                                key={doc.id}
                                style={{
                                  padding: 11,
                                  background: "var(--background)",
                                  borderRadius: 8,
                                }}
                              >
                                <b>{doc.documentType}</b>

                                <div style={{ fontSize: 12, marginTop: 4 }}>
                                  {doc.fileName}
                                </div>

                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--subtext)",
                                    marginTop: 4,
                                  }}
                                >
                                  Status: {doc.status}
                                </div>
                                <button
                                  type="button"
                                  style={{ ...secondaryButton, marginTop: 8 }}
                                  onClick={() => {
                                    const apiUrl = import.meta.env.VITE_API_URL || "";
                                    const baseUrl = apiUrl.replace(/\/api\/?$/, "");

                                    const fileUrl = doc.fileUrl || doc.documentUrl || "";

                                    if (!fileUrl) {
                                      alert("Document URL is missing");
                                      return;
                                    }

                                    window.open(
                                      `${baseUrl}${fileUrl}`,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }}
                                >
                                  <Eye size={14} />
                                  View Document
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 14 }}>BGV Reviews</h3>
                        {canOperate && (
                          <ActionButton
                            icon={FileCheck2}
                            onClick={addReview}
                            disabled={busy === "create-review"}
                          >
                            Add Review
                          </ActionButton>
                        )}
                      </div>

                      {latestReview ? (
                        <div style={{ marginTop: 10, fontSize: 12 }}>
                          <b>Latest:</b> {latestReview.decision}
                          {latestReview.remarks ? ` - ${latestReview.remarks}` : ""}
                          {latestReview.createdAt ? ` - ${formatDate(latestReview.createdAt)}` : ""}
                        </div>
                      ) : (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>
                          No review recorded yet.
                        </p>
                      )}

                      {!!reviewHistory.length && (
                        <div style={{ marginTop: 10 }}>
                          {reviewHistory.map((review) => (
                            <div key={review.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                              <b>{review.decision}</b>
                              {review.remarks ? ` - ${review.remarks}` : ""}
                              <span style={{ color: "var(--subtext)", marginLeft: 8 }}>
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canOperate && ["UNDER_REVIEW", "DISCREPANCY", "ESCALATED"].includes(selected?.status) && (
                      <div style={{ ...card, padding: 15, marginTop: 14 }}>
                        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Final BGV Decision</h3>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                          }}
                        >
                          <select
                            value={finalResult}
                            onChange={(e) => setFinalResult(e.target.value)}
                            style={{
                              padding: "9px 12px",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--card)",
                              color: "var(--text)",
                            }}
                          >
                            {FINAL_RESULTS.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>

                          <select
                            value={finalDecision}
                            onChange={(e) => setFinalDecision(e.target.value)}
                            style={{
                              padding: "9px 12px",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--card)",
                              color: "var(--text)",
                            }}
                          >
                            {FINAL_DECISIONS.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          rows={3}
                          value={reviewRemarks}
                          onChange={(e) => setReviewRemarks(e.target.value)}
                          placeholder="Review remarks / final justification"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            marginTop: 10,
                            padding: "9px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--card)",
                            color: "var(--text)",
                            resize: "vertical",
                          }}
                        />

                        <button
                          style={{ ...button, marginTop: 10 }}
                          onClick={handleFinalDecision}
                          disabled={busy === "final"}
                        >
                          <ShieldCheck size={14} />
                          Save Final Decision
                        </button>

                        <p style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 0 }}>
                          Employee creation requires Status = CLEARED, Result = CLEARED and Decision = PROCEED.
                        </p>
                      </div>
                    )}

                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Assignment History</h3>
                      {!assignmentHistory.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>No assignment history found.</p>
                      ) : (
                        assignmentHistory.map((item) => (
                          <div key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                            <b>{item.assignedTo?.firstName || "Unassigned"} {item.assignedTo?.lastName || ""}</b>
                            <span style={{ color: "var(--subtext)", marginLeft: 8 }}>
                              {formatDate(item.assignedAt)}
                            </span>
                            {item.endedAt && (
                              <span style={{ color: "var(--subtext)", marginLeft: 8 }}>
                                -&gt; {formatDate(item.endedAt)}
                              </span>
                            )}
                            {item.reason && <div style={{ marginTop: 3 }}>{item.reason}</div>}
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ ...card, padding: 15, marginTop: 14 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Status History</h3>
                      {!history.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>No status history found.</p>
                      ) : (
                        history.map((item) => (
                          <div key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                            <b>{item.fromStatus || "-"} -&gt; {item.toStatus}</b>
                            <span style={{ color: "var(--subtext)", marginLeft: 8 }}>{formatDate(item.createdAt)}</span>
                            {item.reason && <div style={{ marginTop: 3 }}>{item.reason}</div>}
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ ...card, padding: 15, marginTop: 14, marginBottom: 25 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Audit Trail</h3>
                      {!auditTrail.length ? (
                        <p style={{ color: "var(--subtext)", fontSize: 12 }}>No audit entries found.</p>
                      ) : (
                        auditTrail.map((item) => (
                          <div key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                            <b>{item.action}</b>
                            <span style={{ color: "var(--subtext)", marginLeft: 8 }}>{formatDate(item.createdAt)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {isFinalClear(selected) && (
                      <div style={{ ...card, padding: 14, marginBottom: 25, color: "#047857", background: "#ecfdf5" }}>
                        <b>OK BGV cleared.</b> This candidate is eligible for employee creation.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}