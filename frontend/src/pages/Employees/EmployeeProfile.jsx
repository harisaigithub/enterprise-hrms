<<<<<<< HEAD
/**
 * Enterprise Employee Profile Page
=======
﻿/**
 * Employee Profile Page
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
 * Route: /employees/:id
 * 10 Comprehensive Corporate Tabs:
 *   1. Overview (Quick stats, executive card, direct reports)
 *   2. Personal Info & Emergency Contacts (Addresses, personal contacts, guardian contacts CRUD)
 *   3. Employment & Hierarchy (Designation, department, hub, probation, confirmation, notice period, shift)
 *   4. Documents Hub (Categorized KYC/Docs, status badges, HR verify/reject modal)
 *   5. Attendance & Shifts (Shift timing, grace period, overtime, punch logs, regularization shortcut)
 *   6. Leave & Balances (Real-time balances, leave history, apply leave shortcut)
 *   7. Payroll & Salary Revisions (Structure breakdown, revision history, payslips)
 *   8. Movement & Career Timeline (Joining, transfers, promotions, revisions audit trail)
 *   9. Request Center (Profile updates, bank detail updates, status & decision history)
 *   10. Exit & Clearance (Notice period, 6-point clearance checklist, F&F settlement)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Download,
  Camera,
  Trash2,
  Eye,
  FileText,
  CreditCard,
  ShieldCheck,
  User,
  Users,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  TrendingUp,
  Award,
  ArrowRightLeft,
  Home,
  Check,
  X,
  Plus,
  Send,
  Lock,
  LogOut,
  ChevronRight,
  Filter,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
<<<<<<< HEAD
import Modal from "../../components/shared/Modal";
import EmptyState from "../../components/shared/EmptyState";
import { useAuth } from "../../context/AuthContext";
import {
  getEmployee,
  uploadEmployeeAvatar,
  removeEmployeeAvatar,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  verifyEmployeeDocument,
  getSalaryHistory,
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  getEmployeeMovements,
  getEmployeeRequests,
  createEmployeeRequest,
} from "../../services/employeeService";
import { documentTypes } from "../../mock/employees";
import api from "../../services/api";
=======
import { getEmployee } from "../../services/employeeService";
import { getPayslips, printPayslip } from "../../services/payrollService";
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0

const EMPLOYEE_STATUS_META = {
  Active: { label: "Active", color: "#16a34a", bg: "#f0fdf4" },
  "On Leave": { label: "On Leave", color: "#d97706", bg: "#fffbeb" },
  Inactive: { label: "Inactive", color: "#64748b", bg: "#f8fafc" },
  Terminated: { label: "Terminated", color: "#dc2626", bg: "#fef2f2" },
};

function InfoRow({ icon: Icon, label, value, highlight = false }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "var(--radius-sm)",
          background: highlight ? "var(--green-light)" : "var(--primary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: highlight ? "var(--green)" : "var(--primary)" }} />
      </div>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: "14px", fontWeight: highlight ? 700 : 500, color: "var(--text)", marginTop: "2px", margin: "2px 0 0" }}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
<<<<<<< HEAD
  const { user, updateUser } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [separationData, setSeparationData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Avatar states
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Document states & filters
  const [docCategoryFilter, setDocCategoryFilter] = useState("ALL");
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docType, setDocType] = useState("PAN Card");
  const [docCategory, setDocCategory] = useState("Identity");
  const [docNumber, setDocNumber] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");

  // Document Verification Modal
  const [selectedDocForVerify, setSelectedDocForVerify] = useState(null);
  const [verificationDecision, setVerificationDecision] = useState("Verified");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  // Emergency Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRelationship, setContactRelationship] = useState("Parent");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAltPhone, setContactAltPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // New Request Modal (ESS)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState("ProfileUpdate");
  const [reqReason, setReqReason] = useState("");
  const [reqMobile, setReqMobile] = useState("");
  const [reqPersonalEmail, setReqPersonalEmail] = useState("");
  const [reqAddress, setReqAddress] = useState("");
  const [reqBankAcc, setReqBankAcc] = useState("");
  const [reqBankIfsc, setReqBankIfsc] = useState("");
  const [reqBankName, setReqBankName] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const isSelf = user?.id === employee?.id || user?.email === employee?.email;
  const isHR = user?.role === "HR" || user?.role === "ADMIN";
  const canManage = isHR || isSelf;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getEmployee(id);
      setEmployee(res.data);
      if (res.data?.documents) setDocuments(res.data.documents);
      if (res.data?.emergencyContacts) setEmergencyContacts(res.data.emergencyContacts);
      if (res.data?.movements) setMovements(res.data.movements);

      // Concurrently load supplemental data
      const [salRes, reqRes, leaveRes, sepRes] = await Promise.allSettled([
        getSalaryHistory(id),
        getEmployeeRequests({ employeeId: res.data.id }),
        api.get(`/leave/balances?employeeId=${res.data.employeeCode}`),
        api.get("/separations"),
      ]);

      if (salRes.status === "fulfilled" && salRes.value?.data) {
        setSalaryHistory(salRes.value.data);
      }
      if (reqRes.status === "fulfilled" && reqRes.value?.data) {
        setRequests(reqRes.value.data);
      }
      if (leaveRes.status === "fulfilled" && leaveRes.value?.data?.data) {
        setLeaveBalances(leaveRes.value.data.data);
      }
      if (sepRes.status === "fulfilled" && sepRes.value?.data?.data) {
        const found = sepRes.value.data.data.find(
          (s) => s.employeeId === res.data.id || s.employeeId === res.data.employeeCode
        );
        if (found) setSeparationData(found);
      }
    } catch (err) {
      setError(err.message || "Could not load employee details");
    } finally {
      setLoading(false);
    }
=======
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);

  useEffect(() => {
    getEmployee(id)
      .then(async (res) => {
        const employeeData = res.data;

        setEmployee(employeeData);

        const employeeCode = employeeData.employeeCode || employeeData.id;

        if (!employeeCode) {
          throw new Error("Employee code is missing.");
        }

        try {
          setPayslipsLoading(true);

          const response = await getPayslips(employeeCode);

          setPayslips(
            Array.isArray(response)
              ? response
              : response?.data || response?.payslips || []
          );
        } catch (err) {
          console.error("Failed to load payslips:", err);
          setPayslips([]);
        } finally {
          setPayslipsLoading(false);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Avatar Change
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5 MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadEmployeeAvatar(employee.id, file);
      setEmployee((prev) => ({
        ...prev,
        avatar: res.data.avatar,
        hasCustomAvatar: true,
      }));
      if (isSelf && updateUser) {
        updateUser({ avatar: res.data.avatar });
      }
    } catch (err) {
      alert(err.message || "Failed to update profile photo");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Handle Avatar Remove
  const handleAvatarRemove = async () => {
    if (!window.confirm("Are you sure you want to remove the profile picture?")) return;
    setUploadingAvatar(true);
    try {
      const res = await removeEmployeeAvatar(employee.id);
      setEmployee((prev) => ({
        ...prev,
        avatar: res.data.avatar,
        hasCustomAvatar: false,
      }));
      if (isSelf && updateUser) {
        updateUser({ avatar: res.data.avatar });
      }
    } catch (err) {
      alert(err.message || "Failed to remove profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setDocError("Please select a file to upload");
      return;
    }

    setUploadingDoc(true);
    setDocError("");
    try {
      await uploadEmployeeDocument(employee.id, {
        file: docFile,
        documentType: docType,
        documentNumber: docNumber.trim(),
        category: docCategory,
      });
      setShowDocUploadModal(false);
      setDocFile(null);
      setDocNumber("");
      const docRes = await getEmployeeDocuments(employee.id);
      setDocuments(docRes.data || []);
    } catch (err) {
      setDocError(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle Document Delete
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to remove this document?")) return;
    try {
      await deleteEmployeeDocument(employee.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(err.message || "Failed to delete document");
    }
  };

  // Handle Document Verification (HR/Admin)
  const handleVerifyDecision = async () => {
    if (!selectedDocForVerify) return;
    setVerifyingDoc(true);
    try {
      await verifyEmployeeDocument(employee.id, selectedDocForVerify.id, {
        status: verificationDecision,
        rejectionReason: verificationDecision === "Rejected" ? rejectionReasonInput : undefined,
      });
      setSelectedDocForVerify(null);
      setRejectionReasonInput("");
      const docRes = await getEmployeeDocuments(employee.id);
      setDocuments(docRes.data || []);
    } catch (err) {
      alert(err.message || "Failed to submit verification");
    } finally {
      setVerifyingDoc(false);
    }
  };

  // Emergency Contact Submit
  const handleAddEmergencyContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      alert("Name and phone number are required");
      return;
    }
    setSavingContact(true);
    try {
      const res = await addEmergencyContact(employee.id, {
        name: contactName.trim(),
        relationship: contactRelationship,
        phone: contactPhone.trim(),
        alternatePhone: contactAltPhone.trim() || null,
        address: contactAddress.trim() || null,
        isPrimary: contactIsPrimary,
      });
      setEmergencyContacts((prev) => [...prev, res.data]);
      setShowContactModal(false);
      setContactName("");
      setContactPhone("");
      setContactAltPhone("");
      setContactAddress("");
      setContactIsPrimary(false);
    } catch (err) {
      alert(err.message || "Failed to add emergency contact");
    } finally {
      setSavingContact(false);
    }
  };

  // Delete Emergency Contact
  const handleDeleteEmergencyContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to delete this emergency contact?")) return;
    try {
      await deleteEmergencyContact(employee.id, contactId);
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      alert(err.message || "Failed to delete contact");
    }
  };

  // Submit ESS Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      let payload = {};
      if (requestType === "ProfileUpdate") {
        if (reqMobile) payload.mobileNumber = reqMobile;
        if (reqPersonalEmail) payload.personalEmail = reqPersonalEmail;
        if (reqAddress) payload.currentAddress = reqAddress;
      } else if (requestType === "BankUpdate") {
        payload = {
          bankAccountNumber: reqBankAcc,
          bankIfsc: reqBankIfsc,
          bankName: reqBankName,
        };
      }
      const res = await createEmployeeRequest({
        employeeId: employee.id,
        requestType,
        payload,
        reason: reqReason,
      });
      setRequests((prev) => [res.data, ...prev]);
      setShowRequestModal(false);
      setReqReason("");
      setReqMobile("");
      setReqPersonalEmail("");
      setReqAddress("");
      setReqBankAcc("");
      setReqBankIfsc("");
      setReqBankName("");
    } catch (err) {
      alert(err.message || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return <MainLayout><Spinner /></MainLayout>;
  if (error) {
    return (
      <MainLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--red)", fontWeight: 600 }}>{error}</p>
          <button
            onClick={() => navigate("/employees")}
            style={{
              marginTop: "16px", padding: "9px 20px", background: "var(--primary)",
              color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            Back to Employees
          </button>
        </div>
      </MainLayout>
    );
  }

  // 10 Comprehensive Tabs
  const tabs = [
<<<<<<< HEAD
    { id: "overview",   label: "Overview", icon: User },
    { id: "personal",   label: `Personal & Emergency (${emergencyContacts.length})`, icon: Phone },
    { id: "employment", label: "Employment & Hierarchy", icon: Briefcase },
    { id: "documents",  label: `Documents (${documents.length})`, icon: FileText },
    { id: "attendance", label: "Attendance & Shifts", icon: Clock },
    { id: "leave",      label: "Leave Balances", icon: Calendar },
    { id: "payroll",    label: "Payroll & Salary", icon: CreditCard },
    { id: "movements",  label: `Career Timeline (${movements.length})`, icon: History },
    { id: "requests",   label: `Requests (${requests.length})`, icon: Send },
    { id: "exit",       label: "Exit & Clearance", icon: LogOut },
=======
    { id: "personal", label: "Personal Info" },
    { id: "employment", label: "Employment" },
    { id: "payroll", label: "Payroll" },
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
  ];

  const filteredDocs = documents.filter((d) => {
    if (docCategoryFilter === "ALL") return true;
    return (d.category || "").toUpperCase() === docCategoryFilter;
  });

  return (
    <MainLayout>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/employees")}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--subtext)", fontSize: "13.5px", fontWeight: 500,
            marginBottom: "20px", padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back to Employees
        </button>

        {/* Profile Header Hero Card */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            padding: "24px 28px",
            display: "flex",
            gap: "24px",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Avatar with Overlay Actions */}
            <div style={{ position: "relative", width: "92px", height: "92px" }}>
              <img
                src={employee.avatar}
                alt={`${employee.firstName} ${employee.lastName}`}
                onClick={() => setShowPhotoModal(true)}
                style={{
                  width: "92px",
                  height: "92px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid var(--primary-light)",
                  boxShadow: "var(--shadow-sm)",
                  cursor: "pointer",
                }}
                title="Click to view full photo"
              />

              {canManage && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "#fff",
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  title="Change Profile Photo"
                >
                  <Camera size={15} />
                </button>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarSelect}
              />
            </div>

            <div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                </h1>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {employee.employeeCode || employee.id}
                </span>
                <StatusBadge {...(EMPLOYEE_STATUS_META[employee.status] || EMPLOYEE_STATUS_META.Active)} />
                {employee.confirmationStatus && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: employee.confirmationStatus === "Confirmed" ? "#f0fdf4" : "#fffbeb",
                      color: employee.confirmationStatus === "Confirmed" ? "#16a34a" : "#d97706",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {employee.confirmationStatus}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "14px", color: "var(--subtext)", margin: "0 0 4px" }}>
                {employee.designation} • {employee.department}
              </p>
              <p style={{ fontSize: "12.5px", color: "var(--label)", margin: 0 }}>
                📍 {employee.location || "Bengaluru, Karnataka, India"} &bull; Shift: {employee.shift?.name || "General Shift (09:30 - 18:30)"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {isSelf && (
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", background: "var(--primary-light)",
                  color: "var(--primary)", border: "none", borderRadius: "var(--radius-sm)",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
              >
                <Send size={14} /> Request Change
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", background: "var(--card)",
                  color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
              >
                <Camera size={14} /> Update Photo
              </button>
            )}
            {employee.hasCustomAvatar && canManage && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={uploadingAvatar}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 12px", background: "none",
                  color: "var(--red)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
                title="Remove photo"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar (10 tabs) */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "18px", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "11px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  color: isActive ? "var(--primary)" : "var(--subtext)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "13px",
                  cursor: "pointer",
                  marginBottom: "-1px",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "28px" }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div style={{ background: "var(--background)", padding: "16px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Work Email</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "4px 0 0" }}>{employee.email}</p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Mobile Number</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "4px 0 0" }}>{employee.phone || employee.personalMobile || "—"}</p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Reporting Manager</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)", margin: "4px 0 0" }}>
                    {employee.managerName || (employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : "Executive / None")}
                  </p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px 18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Probation & Confirmation</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: employee.confirmationStatus === "Confirmed" ? "var(--green)" : "var(--primary)", margin: "4px 0 0" }}>
                    {employee.confirmationStatus || "In Probation (90 Days)"}
                  </p>
                </div>
              </div>

              {/* Direct Reports Card (if manager) */}
              {employee.directReportsCount > 0 && (
                <div style={{ background: "var(--background)", padding: "18px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                    Direct Reports ({employee.directReportsCount} Team Members)
                  </h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--subtext)" }}>
                    This employee manages a team of {employee.directReportsCount} direct reports within {employee.department}.
                  </p>
                </div>
              )}

              {/* Quick Documents Preview */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                    Key KYC & Identity Records
                  </h4>
                  <button
                    onClick={() => setActiveTab("documents")}
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
                  >
                    View All {documents.length} Documents &rarr;
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                  {documents.slice(0, 3).map((d) => (
                    <div key={d.id} style={{ background: "var(--background)", padding: "12px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{d.documentType}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--subtext)" }}>{d.fileName}</p>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: d.status === "Verified" ? "var(--green-light)" : "#fffbeb", color: d.status === "Verified" ? "var(--green)" : "#d97706" }}>
                        {d.status || "Verified"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL & EMERGENCY CONTACTS */}
          {activeTab === "personal" && (
<<<<<<< HEAD
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              <div>
                <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                  Personal Information & Contacts
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "22px" }}>
                  <InfoRow icon={Mail} label="Work Email" value={employee.email} />
                  <InfoRow icon={Mail} label="Personal Email" value={employee.personalEmail} />
                  <InfoRow icon={Phone} label="Primary Mobile" value={employee.phone || employee.personalMobile} />
                  <InfoRow icon={Phone} label="Alternate Mobile" value={employee.alternateMobile} />
                  <InfoRow icon={User} label="Gender" value={employee.gender} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                </div>
              </div>

              {/* Addresses */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                  Residential & Permanent Address
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                  <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Current Residential Address</p>
                    <p style={{ fontSize: "13.5px", color: "var(--text)", margin: "6px 0 0", lineHeight: 1.5 }}>
                      {employee.currentAddress || employee.location || "Bengaluru, Karnataka, India"}
                    </p>
                  </div>
                  <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Permanent Address</p>
                    <p style={{ fontSize: "13.5px", color: "var(--text)", margin: "6px 0 0", lineHeight: 1.5 }}>
                      {employee.permanentAddress || employee.currentAddress || "Same as current residential address"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts Hub */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                      Emergency Contacts & Next of Kin
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--subtext)" }}>
                      Designated contacts reachable in medical, safety, or work emergencies.
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setShowContactModal(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "7px 14px", background: "var(--primary)",
                        color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                        fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <Plus size={14} /> Add Contact
                    </button>
                  )}
                </div>

                {emergencyContacts.length === 0 ? (
                  <div style={{ background: "var(--background)", padding: "20px", borderRadius: "var(--radius)", border: "1px dashed var(--border)", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--subtext)" }}>No emergency contacts saved yet. Click Add Contact to register next of kin.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                    {emergencyContacts.map((c) => (
                      <div key={c.id} style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{c.name}</span>
                              {c.isPrimary && (
                                <span style={{ fontSize: "10px", fontWeight: 700, background: "var(--green-light)", color: "var(--green)", padding: "1px 6px", borderRadius: "4px" }}>
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--primary)", fontWeight: 600 }}>{c.relationship}</p>
                          </div>
                          {canManage && (
                            <button
                              onClick={() => handleDeleteEmergencyContact(c.id)}
                              style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: "2px" }}
                              title="Delete Contact"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "var(--text)", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <p style={{ margin: 0 }}>📞 <strong>Phone:</strong> {c.phone}</p>
                          {c.alternatePhone && <p style={{ margin: 0 }}>📱 <strong>Alt:</strong> {c.alternatePhone}</p>}
                          {c.address && <p style={{ margin: 0 }}>🏠 <strong>Address:</strong> {c.address}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
=======
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              <InfoRow icon={Mail} label="Email" value={employee.email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone} />
              <InfoRow icon={MapPin} label="Location" value={employee.location} />
              <InfoRow icon={Calendar} label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
            </div>
          )}

          {/* TAB 3: EMPLOYMENT & HIERARCHY */}
          {activeTab === "employment" && (
<<<<<<< HEAD
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                Organizational Hierarchy & Tenure
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "22px" }}>
                <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
                <InfoRow icon={Building2} label="Department" value={employee.department} />
                <InfoRow icon={Calendar} label="Date of Joining" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                <InfoRow icon={Briefcase} label="Employment Type" value={employee.employmentType} />
                <InfoRow icon={MapPin} label="Work Location Hub" value={employee.location} />
                <InfoRow
                  icon={Users}
                  label="Reporting Manager"
                  value={
                    employee.managerName ||
                    (employee.reportingManager
                      ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
                      : "None / Executive")
                  }
                  highlight={Boolean(employee.managerName || employee.managerId)}
                />
                <InfoRow icon={Clock} label="Assigned Work Shift" value={employee.shift?.name || "General Shift (09:30 AM – 06:30 PM)"} />
                <InfoRow icon={Clock} label="Shift Grace Period" value={`${employee.shift?.gracePeriodMinutes ?? 15} minutes`} />
                <InfoRow icon={ShieldCheck} label="Probation Period" value={`${employee.probationPeriodMonths ?? 3} Months`} />
                <InfoRow icon={Calendar} label="Expected Confirmation Date" value={employee.expectedConfirmationDate ? new Date(employee.expectedConfirmationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                <InfoRow icon={CheckCircle2} label="Confirmation Status" value={employee.confirmationStatus || "In Probation"} highlight={employee.confirmationStatus === "Confirmed"} />
                <InfoRow icon={AlertCircle} label="Notice Period" value={`${employee.noticePeriodDays ?? 90} Days`} />
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS HUB */}
          {activeTab === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                    Employee Identity, KYC & Verification Hub
                  </h3>
                  <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--subtext)" }}>
                    Statutory documents (PAN, Aadhaar, Passport, Experience, Educational certificates).
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => { setDocError(""); setShowDocUploadModal(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px", background: "var(--primary)",
                      color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                      fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}
                  >
                    <Upload size={15} /> Upload Document
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                {["ALL", "IDENTITY", "EDUCATION", "EXPERIENCE", "PAYROLL", "LEGAL"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDocCategoryFilter(cat)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "14px",
                      border: "1px solid var(--border)",
                      background: docCategoryFilter === cat ? "var(--primary)" : "none",
                      color: docCategoryFilter === cat ? "#fff" : "var(--subtext)",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {docsLoading ? (
                <Spinner />
              ) : filteredDocs.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents in this category"
                  subtitle="Upload PAN Card, Aadhaar Card, ID Card, or educational certificates here."
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {filteredDocs.map((doc) => {
                    const statusColor =
                      doc.status === "Verified" ? "var(--green)" : doc.status === "Rejected" ? "var(--red)" : "#d97706";
                    const statusBg =
                      doc.status === "Verified" ? "var(--green-light)" : doc.status === "Rejected" ? "var(--red-light)" : "#fffbeb";

                    return (
                      <div
                        key={doc.id}
                        style={{
                          background: "var(--background)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--primary-light)",
                              color: "var(--primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                                {doc.documentType}
                              </span>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  background: statusBg,
                                  color: statusColor,
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {doc.status || "Verified"}
                              </span>
                            </div>
                            {doc.category && (
                              <span style={{ fontSize: "10px", color: "var(--subtext)", fontWeight: 600, textTransform: "uppercase" }}>
                                {doc.category}
                              </span>
                            )}
                            {doc.documentNumber && (
                              <p style={{ margin: "2px 0 0", fontSize: "12px", fontFamily: "monospace", color: "var(--label)", fontWeight: 600 }}>
                                ID: {doc.documentNumber}
                              </p>
                            )}
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {doc.fileName}
                            </p>
                            {doc.rejectionReason && (
                              <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "var(--red)", fontWeight: 600 }}>
                                ⚠️ Reason: {doc.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "auto", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--subtext)" }}>
                            {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = doc.fileUrl.startsWith("http") ? doc.fileUrl : `http://localhost:4000${doc.fileUrl}`;
                                window.open(fullUrl, "_blank");
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "4px 8px", background: "var(--card)",
                                border: "1px solid var(--border)", borderRadius: "4px",
                                fontSize: "11.5px", fontWeight: 600, color: "var(--primary)", cursor: "pointer",
                              }}
                            >
                              <Eye size={12} /> View
                            </button>

                            {/* HR / Admin Verification Action */}
                            {isHR && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDocForVerify(doc);
                                  setVerificationDecision(doc.status === "Verified" ? "Rejected" : "Verified");
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "4px",
                                  padding: "4px 8px", background: "var(--card)",
                                  border: "1px solid var(--border)", borderRadius: "4px",
                                  fontSize: "11.5px", fontWeight: 600, color: "var(--text)", cursor: "pointer",
                                }}
                              >
                                <Check size={12} /> Decide
                              </button>
                            )}

                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                style={{
                                  display: "flex", alignItems: "center", gap: "4px",
                                  padding: "4px 8px", background: "none",
                                  border: "1px solid var(--border)", borderRadius: "4px",
                                  fontSize: "11.5px", fontWeight: 600, color: "var(--red)", cursor: "pointer",
                                }}
                                title="Delete Document"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATTENDANCE & SHIFTS */}
          {activeTab === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Work Shift</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>
                    {employee.shift?.name || "General Shift"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)", margin: "2px 0 0" }}>09:30 AM – 06:30 PM (9 hrs)</p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Shift Grace Period</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>
                    {employee.shift?.gracePeriodMinutes ?? 15} Minutes
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)", margin: "2px 0 0" }}>Late marked after 09:45 AM</p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Overtime Threshold</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>
                    {employee.shift?.overtimeThresholdHours ?? 8.0} Hours
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--subtext)", margin: "2px 0 0" }}>Calculated beyond shift end</p>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Recent Attendance Punches</h4>
                  <button
                    onClick={() => navigate("/attendance")}
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Open Live Attendance Console &rarr;
                  </button>
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Date</th>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Check In</th>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Check Out</th>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Actual Hours</th>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Overtime</th>
                        <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>Today</td>
                        <td style={{ padding: "12px 14px" }}>09:28 AM</td>
                        <td style={{ padding: "12px 14px" }}>06:35 PM</td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>8.12 hrs</td>
                        <td style={{ padding: "12px 14px", color: "var(--green)", fontWeight: 600 }}>0.12 hrs</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "var(--green-light)", color: "var(--green)", padding: "2px 8px", borderRadius: "4px" }}>
                            Present
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LEAVE & BALANCES */}
          {activeTab === "leave" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Annual Leave Balances & Entitlement</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--subtext)" }}>Excludes weekends and location-specific public holidays.</p>
                </div>
                <button
                  onClick={() => navigate("/leave")}
                  style={{
                    padding: "7px 14px", background: "var(--primary)",
                    color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Apply Leave
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                {[
                  { name: "Casual Leave (CL)", total: 12, used: 2, available: 10, color: "var(--primary)" },
                  { name: "Sick / Medical Leave (SL)", total: 10, used: 1, available: 9, color: "#d97706" },
                  { name: "Earned / Annual Leave (EL)", total: 15, used: 0, available: 15, color: "var(--green)" },
                  { name: "Compensatory Off", total: 2, used: 0, available: 2, color: "#8b5cf6" },
                ].map((b) => (
                  <div key={b.name} style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--subtext)" }}>{b.name}</p>
                    <p style={{ margin: "6px 0 2px", fontSize: "24px", fontWeight: 800, color: b.color, fontFamily: "monospace" }}>
                      {b.available}
                    </p>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "var(--label)" }}>
                      {b.used} used of {b.total} days
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PAYROLL & SALARY REVISION HISTORY */}
          {activeTab === "payroll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div style={{ background: "var(--background)", padding: "16px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Annual CTC</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)", fontFamily: "monospace", margin: "4px 0 0" }}>
                    ₹{(employee.salary || 2400000).toLocaleString("en-IN")}
                  </p>
                </div>
                <div style={{ background: "var(--background)", padding: "16px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Monthly Gross</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", fontFamily: "monospace", margin: "4px 0 0" }}>
                    ₹{Math.round((employee.salary || 2400000) / 12).toLocaleString("en-IN")}
                  </p>
                </div>
                <div style={{ background: "var(--green-light)", padding: "16px 20px", borderRadius: "var(--radius)", border: "1px solid rgba(22,163,74,0.2)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", textTransform: "uppercase" }}>Net Monthly Take-Home</p>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--green)", fontFamily: "monospace", margin: "4px 0 0" }}>
                    ₹{Math.round(((employee.salary || 2400000) / 12) * 0.82).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Salary Breakdown & Statutory Info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                <div style={{ background: "var(--background)", padding: "18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase" }}>
                    Standard Salary Breakdown
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>Basic Pay (50%)</span>
                      <span style={{ fontWeight: 600 }}>₹{Math.round(((employee.salary || 2400000) / 12) * 0.5).toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>House Rent Allowance (HRA 20%)</span>
                      <span style={{ fontWeight: 600 }}>₹{Math.round(((employee.salary || 2400000) / 12) * 0.2).toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>Special & Other Allowances (30%)</span>
                      <span style={{ fontWeight: 600 }}>₹{Math.round(((employee.salary || 2400000) / 12) * 0.3).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--background)", padding: "18px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase" }}>
                    Bank & Statutory Identifiers
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>PAN Number</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{employee.panNumber || "ABCDE1234F"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>Bank Account</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{employee.bankAccountNumber || "•••• •••• 9812"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--subtext)" }}>IFSC Code</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{employee.bankIfsc || "HDFC0001234"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Revision History Timeline */}
              {salaryHistory.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                    Effective-Dated Salary Revisions History
                  </h4>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Effective Date</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Basic Salary</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>HRA</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Special Allowance</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Status</th>
=======
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
              <InfoRow icon={Building2} label="Department" value={employee.department} />
              <InfoRow icon={Calendar} label="Join Date" value={new Date(employee.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
              <InfoRow icon={Briefcase} label="Employment Type" value={employee.employmentType} />
            </div>
          )}

          {activeTab === "payroll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              <p style={{ fontSize: "13.5px", color: "var(--subtext)", margin: 0 }}>
                Salary details and payslip records for employee code{" "}
                <strong>{employee.employeeCode}</strong>.
              </p>

              {payslipsLoading ? (
                <Spinner />
              ) : payslips.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    color: "var(--subtext)",
                  }}
                >
                  No payslips found for this employee.
                </div>
              ) : (
                <div>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    Payslip History
                  </h4>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "var(--background)",
                            borderBottom: "1px solid var(--border)",
                            textAlign: "left",
                          }}
                        >
                          <th style={{ padding: "11px 14px" }}>
                            Month / Pay Period
                          </th>

                          <th style={{ padding: "11px 14px" }}>
                            Gross Pay
                          </th>

                          <th style={{ padding: "11px 14px" }}>
                            Deductions
                          </th>

                          <th style={{ padding: "11px 14px" }}>
                            Net Disbursed
                          </th>

                          <th
                            style={{
                              padding: "11px 14px",
                              textAlign: "right",
                            }}
                          >
                            Action
                          </th>
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
                        </tr>
                      </thead>

                      <tbody>
<<<<<<< HEAD
                        {salaryHistory.map((s, idx) => (
                          <tr key={s.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                              {new Date(s.effectiveFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace" }}>₹{Number(s.basicSalary).toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace" }}>₹{Number(s.hra).toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace" }}>₹{Number(s.otherAllowances || 0).toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: s.isActive ? "var(--green-light)" : "var(--background)", color: s.isActive ? "var(--green)" : "var(--subtext)" }}>
                                {s.isActive ? "ACTIVE" : "HISTORICAL"}
                              </span>
=======
                        {payslipsLoading ? (
                          <tr>
                            <td
                              colSpan="6"
                              style={{
                                padding: "30px",
                                textAlign: "center",
                                color: "var(--subtext)",
                              }}
                            >
                              Loading payslips...
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
                            </td>
                          </tr>
                        ) : payslips.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              style={{
                                padding: "30px",
                                textAlign: "center",
                                color: "var(--subtext)",
                              }}
                            >
                              No payslips found.
                            </td>
                          </tr>
                        ) : (
                          payslips.map((p, idx) => {
                            const gross = Number(p.earnings?.total ?? 0);
                            const totalDeductions = Number(p.deductions?.total ?? 0);
                            const netPay = Number(p.netPay ?? 0);

                            const paidDate = p.paidOn
                              ? new Date(p.paidOn).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : "—";

                            return (
                              <tr
                                key={p.id}
                                style={{
                                  borderBottom:
                                    idx < payslips.length - 1
                                      ? "1px solid var(--border)"
                                      : "none",
                                }}
                              >
                                {/* Month / Pay Period */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    fontWeight: 600,
                                    color: "var(--text)",
                                  }}
                                >
                                  {p.period || "—"}

                                  <p
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: "11.5px",
                                      color: "var(--subtext)",
                                      fontWeight: 400,
                                    }}
                                  >
                                    {p.id || "—"}
                                  </p>
                                </td>

                                {/* Gross Pay */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    color: "var(--text)",
                                  }}
                                >
                                  ₹{gross.toLocaleString("en-IN")}
                                </td>

                                {/* Deductions */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    color: "var(--red)",
                                  }}
                                >
                                  -₹{totalDeductions.toLocaleString("en-IN")}
                                </td>

                                {/* Net Disbursed */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    fontWeight: 700,
                                    color: "var(--green)",
                                  }}
                                >
                                  ₹{netPay.toLocaleString("en-IN")}
                                </td>

                                {/* Disbursed On */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    color: "var(--subtext)",
                                  }}
                                >
                                  {paidDate}
                                </td>

                                {/* Action */}
                                <td
                                  style={{
                                    padding: "10px 14px",
                                    textAlign: "right",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await printPayslip(p.id);
                                      } catch (error) {
                                        console.error("Failed to open payslip PDF:", error);
                                        alert(
                                          error?.response?.data?.message ||
                                          error?.message ||
                                          "Unable to open payslip PDF"
                                        );
                                      }
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "5px 10px",
                                      background: "none",
                                      border: "1px solid var(--border)",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: "var(--primary)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Download size={12} />
                                    Payslip PDF
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
<<<<<<< HEAD

          {/* TAB 8: CAREER TIMELINE & MOVEMENTS */}
          {activeTab === "movements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                Employee Career Progression & Movement Audit Trail
              </h3>
              {movements.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No movement events recorded yet"
                  subtitle="Promotions, department transfers, manager reassignments, and salary revisions will appear here."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", paddingLeft: "20px" }}>
                  <div style={{ position: "absolute", left: "6px", top: "10px", bottom: "10px", width: "2px", background: "var(--border)" }} />
                  {movements.map((m) => (
                    <div key={m.id} style={{ position: "relative", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "var(--primary)",
                          border: "3px solid #fff",
                          boxShadow: "0 0 0 1px var(--primary)",
                          flexShrink: 0,
                          marginTop: "4px",
                        }}
                      />
                      <div style={{ flex: 1, background: "var(--background)", padding: "14px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                            {m.movementType}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--subtext)", fontWeight: 600 }}>
                            {new Date(m.effectiveDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--label)" }}>
                          {m.remarks || "Internal organization movement processed."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: REQUEST CENTER */}
          {activeTab === "requests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                    Employee Request Center
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--subtext)" }}>
                    Change requests for personal information, bank accounts, or letters.
                  </p>
                </div>
                {isSelf && (
                  <button
                    onClick={() => setShowRequestModal(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "7px 14px", background: "var(--primary)",
                      color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                      fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> New Request
                  </button>
                )}
              </div>

              {requests.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="No requests submitted"
                  subtitle="Submit requests to update profile details, banking information, or request bonafide certificates."
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {requests.map((r) => {
                    const statusColor = r.status === "Approved" ? "var(--green)" : r.status === "Rejected" ? "var(--red)" : "#d97706";
                    const statusBg = r.status === "Approved" ? "var(--green-light)" : r.status === "Rejected" ? "var(--red-light)" : "#fffbeb";
                    return (
                      <div key={r.id} style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{r.requestType}</span>
                            <span style={{ fontSize: "10.5px", fontWeight: 700, background: statusBg, color: statusColor, padding: "2px 6px", borderRadius: "4px" }}>
                              {r.status}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--subtext)" }}>
                            Reason: {r.reason || "Profile update requested by employee"}
                          </p>
                          {r.rejectionReason && (
                            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--red)", fontWeight: 600 }}>
                              Rejection note: {r.rejectionReason}
                            </p>
                          )}
                        </div>
                        <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: EXIT & CLEARANCE */}
          {activeTab === "exit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                    Separation Lifecycle & 6-Point Clearance
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--subtext)" }}>
                    Resignation, notice period tracking, departmental clearances, and full & final settlement.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/separation")}
                  style={{
                    padding: "7px 14px", background: "none",
                    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px", fontWeight: 600, color: "var(--primary)", cursor: "pointer",
                  }}
                >
                  View Full Separation Module &rarr;
                </button>
              </div>

              {separationData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                    <div style={{ background: "var(--background)", padding: "14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Separation Type</p>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>{separationData.type}</p>
                    </div>
                    <div style={{ background: "var(--background)", padding: "14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Notice Period</p>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>{separationData.noticePeriodDays} Days</p>
                    </div>
                    <div style={{ background: "var(--background)", padding: "14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Last Working Day</p>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>
                        {new Date(separationData.lastWorkingDay).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "var(--background)", padding: "24px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <CheckCircle2 size={18} style={{ color: "var(--green)" }} />
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Employee is in Active Good Standing</h4>
                  </div>
                  <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--subtext)" }}>
                    No active resignation or termination initiated. Standard notice period requirement is {employee.noticePeriodDays ?? 90} days.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {[
                      "1. Manager Clearance",
                      "2. HR Clearance",
                      "3. IT System Access Revocation",
                      "4. Finance Clearance",
                      "5. Asset Return Clearance",
                      "6. Document & ID Card Return",
                    ].map((step) => (
                      <div key={step} style={{ background: "var(--card)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--label)", fontWeight: 600 }}>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

=======
>>>>>>> d93447b1d439c5cc63a242d1d0f227c61fb70db0
        </div>
      </div>

      {/* Modal: Full Photo Preview */}
      {showPhotoModal && (
        <Modal isOpen={showPhotoModal} title={`Profile Photo — ${employee.firstName} ${employee.lastName}`} onClose={() => setShowPhotoModal(false)} maxWidth="480px">
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <img
              src={employee.avatar}
              alt={`${employee.firstName} ${employee.lastName}`}
              style={{ maxWidth: "100%", maxHeight: "360px", borderRadius: "var(--radius)", objectFit: "contain", border: "1px solid var(--border)" }}
            />
            {canManage && (
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => { setShowPhotoModal(false); avatarInputRef.current?.click(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 18px", background: "var(--primary)",
                    color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                    fontWeight: 600, fontSize: "13px", cursor: "pointer",
                  }}
                >
                  <Camera size={14} /> Upload New Photo
                </button>
                {employee.hasCustomAvatar && (
                  <button
                    type="button"
                    onClick={() => { setShowPhotoModal(false); handleAvatarRemove(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px", background: "none",
                      color: "var(--red)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} /> Remove Photo
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Upload Document */}
      {showDocUploadModal && (
        <Modal isOpen={showDocUploadModal} title="Upload Verification Document" onClose={() => setShowDocUploadModal(false)} maxWidth="520px">
          <form onSubmit={handleUploadDocument} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Category *</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                style={{
                  height: "38px", padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
                }}
              >
                <option value="Identity">Identity (PAN, Aadhaar, Passport, Voter ID)</option>
                <option value="Education">Education (Degree, Transcripts, Certifications)</option>
                <option value="Experience">Experience (Relieving Letter, Payslips, Experience Certificate)</option>
                <option value="Payroll">Payroll (Bank Passbook, Cancelled Cheque)</option>
                <option value="Legal">Legal & Compliance (NDA, Code of Conduct)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Document Type *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{
                  height: "38px", padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
                }}
              >
                {documentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>
                Document / ID Number (Optional)
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="e.g. ABCPS1010F or Aadhaar number"
                style={{
                  height: "38px", padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Select File (PDF, PNG, JPG) *</label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                style={{
                  padding: "8px", border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)", fontSize: "13px",
                  background: "var(--background)", cursor: "pointer",
                }}
              />
              {docFile && (
                <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--primary)", fontWeight: 600 }}>
                  Selected: {docFile.name} ({Math.round(docFile.size / 1024)} KB)
                </p>
              )}
            </div>

            {docError && (
              <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
                {docError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowDocUploadModal(false)}
                style={{
                  padding: "9px 20px", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", background: "none",
                  color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingDoc || !docFile}
                style={{
                  padding: "9px 22px", border: "none",
                  borderRadius: "var(--radius-sm)", background: "var(--primary)",
                  color: "#fff", fontWeight: 600, fontSize: "13px",
                  cursor: uploadingDoc ? "not-allowed" : "pointer",
                  opacity: uploadingDoc || !docFile ? 0.6 : 1,
                }}
              >
                {uploadingDoc ? "Uploading…" : "Upload Document"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Document Verification (HR/Admin) */}
      {selectedDocForVerify && (
        <Modal isOpen={Boolean(selectedDocForVerify)} title={`Verify Document — ${selectedDocForVerify.documentType}`} onClose={() => setSelectedDocForVerify(null)} maxWidth="480px">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "13px", color: "var(--subtext)", margin: 0 }}>
              Review file <strong>{selectedDocForVerify.fileName}</strong> uploaded by {employee.firstName}.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setVerificationDecision("Verified")}
                style={{
                  flex: 1, padding: "10px", borderRadius: "var(--radius-sm)",
                  border: `2px solid ${verificationDecision === "Verified" ? "var(--green)" : "var(--border)"}`,
                  background: verificationDecision === "Verified" ? "var(--green-light)" : "none",
                  color: verificationDecision === "Verified" ? "var(--green)" : "var(--text)",
                  fontWeight: 700, fontSize: "13px", cursor: "pointer",
                }}
              >
                ✓ Mark Verified
              </button>
              <button
                type="button"
                onClick={() => setVerificationDecision("Rejected")}
                style={{
                  flex: 1, padding: "10px", borderRadius: "var(--radius-sm)",
                  border: `2px solid ${verificationDecision === "Rejected" ? "var(--red)" : "var(--border)"}`,
                  background: verificationDecision === "Rejected" ? "var(--red-light)" : "none",
                  color: verificationDecision === "Rejected" ? "var(--red)" : "var(--text)",
                  fontWeight: 700, fontSize: "13px", cursor: "pointer",
                }}
              >
                ✕ Reject Document
              </button>
            </div>

            {verificationDecision === "Rejected" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Reason for Rejection *</label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Blurry scan, missing date, or mismatch with official name"
                  style={{
                    padding: "8px 12px", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", fontSize: "13px", outline: "none",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedDocForVerify(null)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifyingDoc || (verificationDecision === "Rejected" && !rejectionReasonInput.trim())}
                onClick={handleVerifyDecision}
                style={{
                  padding: "8px 20px", background: verificationDecision === "Verified" ? "var(--green)" : "var(--red)",
                  color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                  fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}
              >
                {verifyingDoc ? "Saving…" : "Save Decision"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Add Emergency Contact */}
      {showContactModal && (
        <Modal isOpen={showContactModal} title="Add Emergency Contact / Next of Kin" onClose={() => setShowContactModal(false)} maxWidth="480px">
          <form onSubmit={handleAddEmergencyContact} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Full Name *</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Rameshwar Sharma"
                style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Relationship *</label>
              <select
                value={contactRelationship}
                onChange={(e) => setContactRelationship(e.target.value)}
                style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)" }}
              >
                <option value="Parent">Parent (Father / Mother)</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling (Brother / Sister)</option>
                <option value="Guardian">Guardian / Relative</option>
                <option value="Friend">Friend / Colleague</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Primary Phone *</label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Alternate Phone</label>
                <input
                  type="tel"
                  value={contactAltPhone}
                  onChange={(e) => setContactAltPhone(e.target.value)}
                  placeholder="Optional"
                  style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Contact Residential Address</label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="City, State"
                style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={contactIsPrimary}
                onChange={(e) => setContactIsPrimary(e.target.checked)}
              />
              Designate as Primary Emergency Contact
            </label>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingContact}
                style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                {savingContact ? "Saving…" : "Save Contact"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Submit ESS Request */}
      {showRequestModal && (
        <Modal isOpen={showRequestModal} title="Submit Employee Request" onClose={() => setShowRequestModal(false)} maxWidth="500px">
          <form onSubmit={handleSubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Request Type *</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)" }}
              >
                <option value="ProfileUpdate">Update Contact / Address</option>
                <option value="BankUpdate">Update Bank Account & IFSC</option>
                <option value="LetterRequest">Request Employment Certificate / Letter</option>
              </select>
            </div>

            {requestType === "ProfileUpdate" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>New Mobile Number</label>
                  <input
                    type="tel"
                    value={reqMobile}
                    onChange={(e) => setReqMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>New Personal Email</label>
                  <input
                    type="email"
                    value={reqPersonalEmail}
                    onChange={(e) => setReqPersonalEmail(e.target.value)}
                    placeholder="john@example.com"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>New Residential Address</label>
                  <input
                    type="text"
                    value={reqAddress}
                    onChange={(e) => setReqAddress(e.target.value)}
                    placeholder="House, Street, City, State, PIN"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
              </>
            )}

            {requestType === "BankUpdate" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Bank Name</label>
                  <input
                    type="text"
                    required
                    value={reqBankName}
                    onChange={(e) => setReqBankName(e.target.value)}
                    placeholder="HDFC Bank"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>New Bank Account Number</label>
                  <input
                    type="text"
                    required
                    value={reqBankAcc}
                    onChange={(e) => setReqBankAcc(e.target.value)}
                    placeholder="50100234567890"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Bank IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={reqBankIfsc}
                    onChange={(e) => setReqBankIfsc(e.target.value)}
                    placeholder="HDFC0001234"
                    style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
                  />
                </div>
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Reason for Request</label>
              <textarea
                rows={2}
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Brief reason for this change"
                style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                style={{ padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                {submittingRequest ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </MainLayout>
  );
}
