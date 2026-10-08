/**
 * Attendance Page - Module 5 (Attendance & Time Tracking)
 * Enterprise Corporate Attendance System:
 *   - Separate Check In / Check Out buttons with strict status lifecycle
 *   - Corporate Break & Lunch session tracking with type selector
 *   - Live Today's Activity Timeline (Check In -> Breaks -> Check Out)
 *   - Full persistence across page reloads (backend sync + localStorage fallback)
 *   - Monthly attendance calendar/table with status badges & filter controls
 *   - Team attendance summary metrics
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  UserCheck,
  UserX,
  Coffee,
  Home,
  LogIn,
  LogOut,
  StopCircle,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getMyAttendance,
  getTeamSummary,
  getSummaryRows,
  checkIn,
  checkOut,
  startBreak,
  endBreak,
} from "../../services/attendanceService";
import {
  requestRegularization,
  getRegularizations,
  decideRegularization,
  resubmitRegularization,
} from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import { attendanceStatusMeta } from "../../mock/attendance";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const BREAK_OPTIONS = [
  { type: "Lunch Break",    duration: "45 min", icon: "🍱", desc: "Standard lunch hour" },
  { type: "Short Break",    duration: "15 min", icon: "☕", desc: "Coffee / tea rest" },
  { type: "Tea Break",      duration: "15 min", icon: "🍵", desc: "Afternoon refreshment" },
  { type: "Personal Break", duration: "30 min", icon: "🚶", desc: "Short personal errand" },
];

const indiaLocalToIso = (date, time) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Asia/Kolkata = UTC+05:30
  return new Date(
    Date.UTC(year, month - 1, day, hour - 5, minute - 30)
  ).toISOString();
};
const fmtTime = (isoOrTime) => {
  if (!isoOrTime) return "";
  if (typeof isoOrTime === "string" && isoOrTime.length === 5 && isoOrTime.includes(":")) {
    const [h, m] = isoOrTime.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  const d = new Date(isoOrTime);
  return isNaN(d.getTime()) ? isoOrTime : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to resolve employee real names from ID
const getEmployeeDisplayName = (record) => {
  if (record.employeeName) return record.employeeName;
  if (record.name) return record.name;
  if (record.employee?.name) return record.employee.name;
  if (record.employee?.fullName) return record.employee.fullName;

  return record.employeeId || record.employeeCode || "—";
};

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bg, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. View details`}
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        width: "100%",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        font: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "var(--radius-md)",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--subtext)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", lineHeight: 1.2, marginTop: "2px" }}>
          {value}
        </p>
      </div>
    </button>
  );
}

/* ─── Today's Live Activity Timeline ───────────────────────────────────────── */
function ActivityTimeline({ checkInTime, checkOutTime, breaks, onBreak, currentBreak }) {
  const events = useMemo(() => {
    const list = [];
    if (checkInTime) {
      list.push({
        id: "checkin",
        type: "checkin",
        label: "Checked In for Work",
        subtext: "Office Shift Started",
        time: checkInTime,
        color: "#16a34a",
        bg: "#f0fdf4",
        badge: "Shift Active",
      });
    }

    breaks.forEach((b, idx) => {
      list.push({
        id: "break_start_" + idx,
        type: "break_start",
        label: `${b.type} Started`,
        subtext: "Break in progress",
        time: b.startTime,
        color: "#d97706",
        bg: "#fffbeb",
        badge: b.endTime ? null : "Active Break",
      });
      if (b.endTime) {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        const mins = !isNaN(start) && !isNaN(end) ? Math.max(1, Math.round((end - start) / 60000)) : 15;
        list.push({
          id: "break_end_" + idx,
          type: "break_end",
          label: `${b.type} Ended`,
          subtext: `Resumed work (${mins} mins duration)`,
          time: b.endTime,
          color: "#0284c7",
          bg: "#f0f9ff",
          note: `${mins} min`,
        });
      }
    });

    if (checkOutTime) {
      list.push({
        id: "checkout",
        type: "checkout",
        label: "Checked Out for the Day",
        subtext: "Daily Shift Completed",
        time: checkOutTime,
        color: "#dc2626",
        bg: "#fef2f2",
        badge: "Completed",
      });
    }

    return list;
  }, [checkInTime, checkOutTime, breaks]);

  if (!checkInTime && events.length === 0) {
    return (
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--border)",
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "var(--primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={20} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
              No punch recorded yet today
            </p>
            <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>
              Click <strong>Check In</strong> above when you begin your shift.
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--subtext)",
            background: "var(--background)",
            padding: "6px 14px",
            borderRadius: "99px",
            border: "1px solid var(--border)",
          }}
        >
          Shift: 09:00 AM – 06:00 PM
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "22px 24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "10px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={16} style={{ color: "var(--primary)" }} />
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
            Today's Activity Log
          </h3>
          <span style={{ fontSize: "11.5px", color: "var(--subtext)" }}>
            ({new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })})
          </span>
        </div>

        {onBreak && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#fffbeb",
              color: "#d97706",
              border: "1px solid #fcd34d",
              padding: "4px 12px",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: "14px" }}>☕</span>
            Currently on {currentBreak?.type || "Break"}
          </div>
        )}

        {checkInTime && !checkOutTime && !onBreak && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
              padding: "4px 12px",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#16a34a",
                display: "inline-block",
              }}
            />
            Shift in Progress
          </div>
        )}

        {checkOutTime && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f8fafc",
              color: "#64748b",
              border: "1px solid var(--border)",
              padding: "4px 12px",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} color="#64748b" />
            Shift Concluded
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0", position: "relative" }}>
        {events.map((ev, idx) => (
          <div key={ev.id} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "24px", flexShrink: 0 }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: ev.bg,
                  border: `2.5px solid ${ev.color}`,
                  marginTop: "3px",
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${ev.color}33`,
                }}
              />
              {idx < events.length - 1 && (
                <div
                  style={{
                    width: "2px",
                    flex: 1,
                    background: "var(--border)",
                    minHeight: "26px",
                    margin: "2px 0",
                  }}
                />
              )}
            </div>

            <div style={{ paddingBottom: idx < events.length - 1 ? "18px" : "4px", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{ev.label}</p>
                {ev.badge && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: ev.color,
                      background: ev.bg,
                      padding: "1px 7px",
                      borderRadius: "6px",
                      border: `1px solid ${ev.color}33`,
                    }}
                  >
                    {ev.badge}
                  </span>
                )}
                {ev.note && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--subtext)",
                      background: "var(--background)",
                      padding: "1px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {ev.note}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "2px" }}>
                {fmtTime(ev.time)} &bull; {ev.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Break Dropdown Selector ─────────────────────────────────────────────── */
function BreakDropdown({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        id="start-break-dropdown-btn"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "10px 16px",
          background: "#fffbeb",
          color: "#d97706",
          border: "1px solid #fcd34d",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700,
          fontSize: "13px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.15s ease",
        }}
      >
        <Coffee size={15} />
        Start Break
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 60,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            minWidth: "220px",
            padding: "6px",
            animation: "dialog-in 0.15s ease",
          }}
        >
          <div style={{ padding: "6px 10px 8px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
              Select Break Type
            </p>
          </div>
          {BREAK_OPTIONS.map((b) => (
            <button
              key={b.type}
              onClick={() => {
                onSelect(b.type);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                background: "none",
                border: "none",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px" }}>{b.icon}</span>
                <div>
                  <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>{b.type}</p>
                  <p style={{ fontSize: "10.5px", color: "var(--subtext)" }}>{b.desc}</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "#d97706",
                  background: "#fffbeb",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {b.duration}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Attendance Component ────────────────────────────────────────────── */
export default function Attendance() {
  const { user } = useAuth();
  const now = new Date();
  const todayStr = getTodayDateStr();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
    

  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedSummaryRows, setSelectedSummaryRows] = useState([]);

  const [summaryRowsLoading, setSummaryRowsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const storageKey = `hrms_attendance_${user?.id || "default"}_${todayStr}`;

  const loadSession = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { checkedIn: false, checkedOut: false, checkInTime: null, checkOutTime: null, breaks: [], onBreak: false, currentBreak: null };
  };

  const [session, setSession] = useState(loadSession);

  const saveSession = useCallback((newSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newSession));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const syncWithServerRecords = useCallback((serverRecords) => {
    const todayRecord = serverRecords.find((r) => r.date === todayStr);
    if (todayRecord) {
      setSession((prev) => {
        const updated = {
          ...prev,
          checkedIn: Boolean(todayRecord.checkIn),
          checkedOut: Boolean(todayRecord.checkOut),
          checkInTime: prev.checkInTime || (todayRecord.checkIn ? `${todayStr}T${todayRecord.checkIn}:00` : null),
          checkOutTime: prev.checkOutTime || (todayRecord.checkOut ? `${todayStr}T${todayRecord.checkOut}:00` : null),
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [todayStr, storageKey]);

  const authenticatedEmployeeCode = user?.id;
  const normalizedRole = String(user?.role || "").toUpperCase();
  const isScopedTeamReader = ["MANAGER", "HR", "ADMIN"].includes(normalizedRole);

  const fetchAttendance = useCallback(() => {
    if (!authenticatedEmployeeCode) return;
    setLoading(true);

    const promises = [
      getMyAttendance({
        employeeId: isScopedTeamReader ? undefined : authenticatedEmployeeCode,
        month,
        year,
      }),
    ];

    if (isScopedTeamReader) {
      promises.push(getTeamSummary());
    }

    Promise.all(promises)
      .then(([recRes, sumRes]) => {
        const list = recRes.data || [];
        setRecords(list);
        if (isScopedTeamReader && sumRes) {
          setSummary(sumRes.data || null);
        } else {
          const todayRec = list.find((r) => r.date === todayStr);
const status = todayRec?.status || null;

setSummary({
  present: status === "Present" ? 1 : 0,
  wfh: status === "WFH" ? 1 : 0,
  late: status === "Late" ? 1 : 0,
  absent: status === "Absent" ? 1 : 0,
  onLeave: status === "On Leave" ? 1 : 0,
});
        }
        syncWithServerRecords(list);
      })
      .catch((err) => {
        console.error("Attendance fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [authenticatedEmployeeCode, isScopedTeamReader, month, year, syncWithServerRecords, todayStr]);

  useEffect(() => {
    const timer = window.setTimeout(fetchAttendance, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAttendance]);

  const isManagerOrHR = isScopedTeamReader;
  const todayRecords = useMemo(
    () => records.filter((record) => record.date === todayStr),
    [records, todayStr],
  );

  const summaryCards = useMemo(() => ({
    present: { label: "Present Today", status: "Present", icon: UserCheck, color: "#16a34a", bg: "#f0fdf4" },
    wfh: { label: "Work From Home", status: "WFH", icon: Home, color: "#0284c7", bg: "#f0f9ff" },
    late: { label: "Late Arrivals", status: "Late", icon: Clock, color: "#d97706", bg: "#fffbeb" },
    absent: { label: "Absent", status: "Absent", icon: UserX, color: "#dc2626", bg: "#fef2f2" },
    onLeave: { label: "On Leave", status: "On Leave", icon: Coffee, color: "#7c3aed", bg: "#f5f3ff" },
  }), []);

const openSummaryDetails = async (key) => {
  const card = summaryCards[key];

  setSelectedSummary({ key, ...card });
  setSelectedSummaryRows([]);
  setSummaryRowsLoading(true);

  // Employee:
  // Use the already-loaded personal attendance record.
  // Do NOT call the team summary-rows API because that endpoint
  // is intended for Manager / HR / Admin scoped data.
  if (!isScopedTeamReader) {
    const targetStatus = String(card.status || "").toLowerCase().trim();

    const employeeRows = todayRecords.filter((record) => {
      const recordStatus = String(record.status || "").toLowerCase().trim();
      return recordStatus === targetStatus;
    });

    setSelectedSummaryRows(employeeRows);
    setSummaryRowsLoading(false);
    return;
  }

  // Manager / HR / Admin:
  // Fetch rows from the backend using their authorized scope.
  try {
    const bucketMap = {
      present: "present",
      wfh: "wfh",
      late: "late",
      absent: "absent",
      onLeave: "onLeave",
    };

    const result = await getSummaryRows({
      date: todayStr,
      bucket: bucketMap[key],
      page: 1,
      pageSize: 50,
    });

    setSelectedSummaryRows(result?.data?.rows || []);
  } catch (err) {
    console.error("Attendance summary rows error:", err);
    setSelectedSummaryRows([]);
  } finally {
    setSummaryRowsLoading(false);
  }
};
  const [activeAttendanceView, setActiveAttendanceView] = useState("my");
  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regDate, setRegDate] = useState(getTodayDateStr());
  const [regCheckIn, setRegCheckIn] = useState("09:30");
  const [regCheckOut, setRegCheckOut] = useState("18:30");
  const [regReason, setRegReason] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regularizationsList, setRegularizationsList] = useState([]);
  const [editingRegularization, setEditingRegularization] = useState(null);

  const loadRegularizations = useCallback(async () => {
    try {
      const res = await getRegularizations();
      setRegularizationsList(res.data || []);
    } catch (err) {
      console.error("Failed to load regularizations:", err);
    }
  }, []);

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!regReason.trim()) {
      alert("Please provide a reason for regularization");
      return;
    }
    setSubmittingReg(true);
    try {
      await requestRegularization({
        date: regDate,
        requestedStatus: "Present",
        requestedPunchIn: indiaLocalToIso(regDate, regCheckIn),
        requestedPunchOut: indiaLocalToIso(regDate, regCheckOut),
        reason: regReason.trim(),
      });
      setShowRegularizeModal(false);
      setRegReason("");
      alert("Regularization request submitted successfully for manager approval.");
      fetchAttendance();
    } catch (err) {
      alert(err.message || "Failed to submit regularization");
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleDecideRegularization = async (id, action) => {
    const needsComment = action !== "APPROVE";
    const comment = needsComment
      ? window.prompt(action === "REJECT" ? "Enter the mandatory rejection reason:" : "What additional details are required?")
      : window.prompt("Optional approval note:", "");
    if (needsComment && !comment?.trim()) return;
    try {
      await decideRegularization(id, { action, comment: comment?.trim() || undefined });
      loadRegularizations();
      fetchAttendance();
    } catch (err) {
      alert(err.message || "Failed to decide regularization");
    }
  };

  const beginResubmit = (reg) => {
    setEditingRegularization(reg);
    setRegDate(reg.date);
    setRegCheckIn(reg.requestedPunchIn || "09:30");
    setRegCheckOut(reg.requestedPunchOut || "18:30");
    setRegReason(reg.reason || "");
    setShowRegularizeModal(true);
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!regReason.trim()) return alert("Please provide the requested details");
    setSubmittingReg(true);
    try {
      await resubmitRegularization(editingRegularization.id, {
        date: regDate,
        requestedStatus: editingRegularization.requestedStatus || "Present",
        requestedPunchIn: indiaLocalToIso(regDate, regCheckIn),
        requestedPunchOut: indiaLocalToIso(regDate, regCheckOut),
        reason: regReason.trim(),
      });
      setShowRegularizeModal(false);
      setEditingRegularization(null);
      setRegReason("");
      await loadRegularizations();
      alert("Regularization request resubmitted to your manager.");
    } catch (err) {
      alert(err.message || "Failed to resubmit regularization");
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionError("");
    const nowIso = new Date().toISOString();
    try {
      await checkIn(user.id);
      const newSession = {
        ...session,
        checkedIn: true,
        checkedOut: false,
        checkInTime: nowIso,
        onBreak: false,
      };
      saveSession(newSession);
      fetchAttendance();
    } catch (e) {
      if (e?.message?.toLowerCase().includes("already checked in")) {
        const newSession = { ...session, checkedIn: true, checkInTime: session.checkInTime || nowIso };
        saveSession(newSession);
      } else {
        setActionError(e?.message || "Check-in failed. Please verify your connection and try again.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (session.onBreak) {
      setActionError("Please end your ongoing break before checking out.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    const nowIso = new Date().toISOString();
    try {
      await checkOut(user.id);
      const newSession = {
        ...session,
        checkedOut: true,
        checkOutTime: nowIso,
        onBreak: false,
      };
      saveSession(newSession);
      fetchAttendance();
    } catch (e) {
      if (e?.message?.toLowerCase().includes("already checked out")) {
        const newSession = { ...session, checkedOut: true, checkOutTime: session.checkOutTime || nowIso };
        saveSession(newSession);
      } else {
        setActionError(e?.message || "Check-out failed. Please try again.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async (breakType) => {
    setActionError("");
    const nowIso = new Date().toISOString();
    try {
      await startBreak(user.id, breakType);
      const newBreakItem = { type: breakType, startTime: nowIso, endTime: null };
      const newSession = {
        ...session,
        onBreak: true,
        currentBreak: newBreakItem,
        breaks: [...session.breaks, newBreakItem],
      };
      saveSession(newSession);
    } catch (e) {
      setActionError(e?.message || "Failed to start break. Please try again.");
    }
  };

  const handleEndBreak = async () => {
    setActionError("");
    const nowIso = new Date().toISOString();
    try {
      await endBreak(user.id);
      const updatedBreaks = session.breaks.map((b, idx) =>
        idx === session.breaks.length - 1 ? { ...b, endTime: nowIso } : b
      );
      const newSession = {
        ...session,
        onBreak: false,
        currentBreak: null,
        breaks: updatedBreaks,
      };
      saveSession(newSession);
    } catch (e) {
      setActionError(e?.message || "Failed to end break. Please try again.");
    }
  };

  const countStatus = (s) => records.filter((r) => r.status === s).length;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto", paddingBottom: "40px" }}>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <PageHeader
            title="Attendance & Time"
            subtitle={`${MONTHS[month - 1]} ${year} — Log your daily attendance, breaks, and shifts`}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              background: "var(--card)",
              padding: "6px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <button
              id="check-in-btn"
              onClick={handleCheckIn}
              disabled={session.checkedIn || actionLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                background: session.checkedIn ? "var(--background)" : "var(--primary)",
                color: session.checkedIn ? "var(--subtext)" : "#ffffff",
                border: session.checkedIn ? "1px solid var(--border)" : "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: (session.checkedIn || actionLoading) ? "not-allowed" : "pointer",
                opacity: session.checkedIn ? 0.7 : actionLoading ? 0.8 : 1,
              }}
            >
              <LogIn size={15} />
              {session.checkedIn ? "Checked In" : actionLoading ? "Processing…" : "Check In"}
            </button>

            {session.checkedIn && !session.checkedOut && (
              session.onBreak ? (
                <button
                  id="end-break-btn"
                  onClick={handleEndBreak}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 18px",
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <StopCircle size={15} />
                  End {session.currentBreak?.type || "Break"}
                </button>
              ) : (
                <BreakDropdown onSelect={handleStartBreak} disabled={actionLoading} />
              )
            )}

            <button
              id="check-out-btn"
              onClick={handleCheckOut}
              disabled={!session.checkedIn || session.checkedOut || session.onBreak || actionLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                background: session.checkedIn && !session.checkedOut && !session.onBreak ? "#ef4444" : "var(--background)",
                color: session.checkedIn && !session.checkedOut && !session.onBreak ? "#ffffff" : "var(--subtext)",
                border: session.checkedIn && !session.checkedOut && !session.onBreak ? "none" : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: (!session.checkedIn || session.checkedOut || session.onBreak || actionLoading) ? "not-allowed" : "pointer",
                opacity: (!session.checkedIn || session.checkedOut || session.onBreak) ? 0.55 : 1,
              }}
            >
              <LogOut size={15} />
              {session.checkedOut ? "Checked Out" : "Check Out"}
            </button>

            <button
              onClick={() => setShowRegularizeModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                background: "var(--card)",
                color: "var(--primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <Clock size={15} /> Regularize Punch
            </button>
          </div>
        </div>

        {actionError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "var(--radius-md)",
              padding: "12px 18px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
              <p style={{ fontSize: "13px", color: "#991b1b", fontWeight: 600 }}>{actionError}</p>
            </div>
            <button onClick={() => setActionError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>
              <X size={16} />
            </button>
          </div>
        )}

        <ActivityTimeline
          checkInTime={session.checkInTime}
          checkOutTime={session.checkOutTime}
          breaks={session.breaks}
          onBreak={session.onBreak}
          currentBreak={session.currentBreak}
        />

        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {Object.entries(summaryCards).map(([key, card]) => (
              <StatCard
                key={key}
                icon={card.icon}
                label={card.label}
                value={summary[key]}
                color={card.color}
                bg={card.bg}
                onClick={() => openSummaryDetails(key)}
              />
            ))}
          </div>
        )}

        <Modal
          isOpen={Boolean(selectedSummary)}
          title={`${selectedSummary?.label || "Attendance"} — Today`}
          onClose={() => setSelectedSummary(null)}
          width="760px"
        >
                 {summaryRowsLoading ? (
  <div style={{ padding: "30px", textAlign: "center" }}>
    Loading attendance records...
  </div>
) : selectedSummary && selectedSummaryRows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <p style={{ margin: "0 0 14px", color: "var(--subtext)", fontSize: "12px" }}>
                Showing only records inside your authorized scope.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 8px", color: "var(--subtext)" }}>Employee</th>
                    <th style={{ padding: "10px 8px", color: "var(--subtext)" }}>Status</th>
                    <th style={{ padding: "10px 8px", color: "var(--subtext)" }}>Check In</th>
                    <th style={{ padding: "10px 8px", color: "var(--subtext)" }}>Check Out</th>
                    <th style={{ padding: "10px 8px", color: "var(--subtext)" }}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSummaryRows.map((record) => (
                    <tr key={record.id || record.employeeId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 8px", fontWeight: 700 }}>
                        {getEmployeeDisplayName(record)}
                      </td>
                      <td style={{ padding: "11px 8px" }}>
                        <StatusBadge {...(attendanceStatusMeta[record.status] || { label: record.status, color: "#64748b", bg: "#f8fafc" })} />
                      </td>
                      <td style={{ padding: "11px 8px" }}>{fmtTime(record.checkIn) || "—"}</td>
                      <td style={{ padding: "11px 8px" }}>{fmtTime(record.checkOut) || "—"}</td>
                      <td style={{ padding: "11px 8px" }}>{record.hoursWorked ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={selectedSummary?.icon || Clock}
              title={`No ${selectedSummary?.label?.toLowerCase() || "attendance"} records found`}
              subtitle="There are no matching records in your authorized scope for today."
            />
          )}
        </Modal>

        <Modal
  isOpen={showRegularizeModal}
  title={editingRegularization ? "Resubmit Regularization Request" : "Regularize Punch"}
  onClose={() => {
    setShowRegularizeModal(false);
    setEditingRegularization(null);
  }}
  width="600px"
>
  <form
    onSubmit={
      editingRegularization
        ? handleResubmit
        : handleRegularizeSubmit
    }
  >
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
      }}
    >
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--subtext)",
            marginBottom: "6px",
          }}
        >
          Date
        </label>

        <input
          type="date"
          value={regDate}
          onChange={(e) => setRegDate(e.target.value)}
          required
          style={{
            width: "100%",
            height: "40px",
            padding: "0 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        />
      </div>

      <div />

      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--subtext)",
            marginBottom: "6px",
          }}
        >
          Check In
        </label>

        <input
          type="time"
          value={regCheckIn}
          onChange={(e) => setRegCheckIn(e.target.value)}
          required
          style={{
            width: "100%",
            height: "40px",
            padding: "0 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--subtext)",
            marginBottom: "6px",
          }}
        >
          Check Out
        </label>

        <input
          type="time"
          value={regCheckOut}
          onChange={(e) => setRegCheckOut(e.target.value)}
          required
          style={{
            width: "100%",
            height: "40px",
            padding: "0 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--card)",
            color: "var(--text)",
          }}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--subtext)",
            marginBottom: "6px",
          }}
        >
          Reason
        </label>

        <textarea
          value={regReason}
          onChange={(e) => setRegReason(e.target.value)}
          placeholder="Enter reason for punch regularization..."
          rows={4}
          required
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--card)",
            color: "var(--text)",
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: "13px",
          }}
        />
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "22px",
        paddingTop: "16px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => {
          setShowRegularizeModal(false);
          setEditingRegularization(null);
        }}
        style={{
          padding: "10px 18px",
          background: "var(--card)",
          color: "var(--subtext)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={submittingReg}
        style={{
          padding: "10px 20px",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700,
          cursor: submittingReg ? "not-allowed" : "pointer",
          opacity: submittingReg ? 0.7 : 1,
        }}
      >
        {submittingReg
          ? "Submitting..."
          : editingRegularization
            ? "Resubmit Request"
            : "Submit Request"}
      </button>
    </div>
  </form>
</Modal>

        {
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <button
              onClick={() => setActiveAttendanceView("my")}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeAttendanceView === "my" ? "var(--primary-light)" : "none",
                color: activeAttendanceView === "my" ? "var(--primary)" : "var(--subtext)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              My Attendance Log
            </button>
            <button
              onClick={() => {
                setActiveAttendanceView("team_regularization");
                loadRegularizations();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeAttendanceView === "team_regularization" ? "var(--primary-light)" : "none",
                color: activeAttendanceView === "team_regularization" ? "var(--primary)" : "var(--subtext)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {isManagerOrHR ? "👥 Team Regularization Requests" : "📝 My Regularization Requests"} ({regularizationsList.length})
            </button>
          </div>
        }

        {activeAttendanceView === "team_regularization" ? (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{isManagerOrHR ? "Team Regularization Requests" : "My Regularization Requests"}</h3>
            </div>
            {regularizationsList.length === 0 ? (
              <EmptyState icon={Clock} title="No pending regularization requests" subtitle="No pending regularization requests found." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Employee</th>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Date</th>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Adjusted In</th>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Adjusted Out</th>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Reason</th>
                      <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>Status</th>
                    {isManagerOrHR && (
  <th style={{ padding: "12px 16px", color: "var(--subtext)", fontWeight: 700 }}>
    Actions
  </th>
)}
                    </tr>
                  </thead>
                  <tbody>
                    {regularizationsList.map((reg) => (
                      <tr key={reg.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{reg.employeeName || "Employee"}</td>
                        <td style={{ padding: "12px 16px" }}>{new Date(reg.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td style={{ padding: "12px 16px" }}>{reg.requestedPunchIn ? fmtTime(reg.requestedPunchIn) : "—"}</td>
                        <td style={{ padding: "12px 16px" }}>{reg.requestedPunchOut ? fmtTime(reg.requestedPunchOut) : "—"}</td>
                        <td style={{ padding: "12px 16px" }}>{reg.reason}</td>
                        <td style={{ padding: "12px 16px" }}>{reg.status}</td>
                        {isManagerOrHR && (
  <td style={{ padding: "12px 16px" }}>
    {["Submitted", "Resubmitted", "Manager Approved"].includes(reg.status) ? (
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleDecideRegularization(reg.id, "APPROVE")}
        >
          Approve
        </button>

        <button
          type="button"
          onClick={() => handleDecideRegularization(reg.id, "REQUEST_MORE_DETAILS")}
        >
          More Details
        </button>

        <button
          type="button"
          onClick={() => handleDecideRegularization(reg.id, "REJECT")}
        >
          Reject
        </button>
      </div>
    ) : (
      <span>—</span>
    )}
  </td>
)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ height: "36px", padding: "0 12px", borderRadius: "4px" }}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ height: "36px", padding: "0 12px", borderRadius: "4px" }}>
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: "60px 0" }}><Spinner /></div>
              ) : records.length === 0 ? (
                <EmptyState icon={Calendar} title="No attendance records found" subtitle="No logs found for this period." />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Status", "Check In", "Check Out", "Work Duration"].map((h) => (
                        <th key={h} style={{ padding: "13px 18px", fontSize: "11px", fontWeight: 700, color: "var(--subtext)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id || i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "14px 18px", fontWeight: 600 }}>{r.date}</td>
                        <td style={{ padding: "14px 18px" }}>{r.status}</td>
                        <td style={{ padding: "14px 18px" }}>{r.checkIn ? fmtTime(r.checkIn) : "—"}</td>
                        <td style={{ padding: "14px 18px" }}>{r.checkOut ? fmtTime(r.checkOut) : "—"}</td>
                        <td style={{ padding: "14px 18px" }}>{r.hoursWorked > 0 ? `${r.hoursWorked} hrs` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}