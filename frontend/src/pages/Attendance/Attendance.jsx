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
import {
  getMyAttendance,
  getTeamSummary,
  checkIn,
  checkOut,
  startBreak,
  endBreak,
} from "../../services/attendanceService";
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

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div
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
    </div>
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

      {/* Timeline entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0", position: "relative" }}>
        {events.map((ev, idx) => (
          <div key={ev.id} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* Timeline node + vertical line */}
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

            {/* Event details */}
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
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = "#fef3c7";
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.background = "#fffbeb";
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
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Storage key for session breaks & timestamps
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

  // Sync state from server records on load
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

  const fetchAttendance = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      getMyAttendance({ employeeId: user.id, month, year }),
      getTeamSummary(),
    ])
      .then(([recRes, sumRes]) => {
        const list = recRes.data || [];
        setRecords(list);
        setSummary(sumRes.data || null);
        syncWithServerRecords(list);
      })
      .catch((err) => {
        console.error("Attendance fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [user?.id, month, year, syncWithServerRecords]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  /* ── Check In Handler ── */
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

  /* ── Check Out Handler ── */
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

  /* ── Start Break Handler ── */
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

  /* ── End Break Handler ── */
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

        {/* ── Top Page Header + Action Bar ── */}
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

          {/* Action Button Group */}
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
            {/* 1. Check In Button (Always Visible) */}
            <button
              id="check-in-btn"
              onClick={handleCheckIn}
              disabled={session.checkedIn || actionLoading}
              title={session.checkedIn ? "You have already checked in for today" : "Record your shift start"}
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
                boxShadow: !session.checkedIn ? "0 2px 8px rgba(15,118,110,0.3)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <LogIn size={15} />
              {session.checkedIn ? "Checked In" : actionLoading ? "Processing…" : "Check In"}
            </button>

            {/* 2. Break Controls (Visible only after Check In and before Check Out) */}
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
                    boxShadow: "0 2px 8px rgba(217,119,6,0.35)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#b45309")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#d97706")}
                >
                  <StopCircle size={15} />
                  End {session.currentBreak?.type || "Break"}
                </button>
              ) : (
                <BreakDropdown onSelect={handleStartBreak} disabled={actionLoading} />
              )
            )}

            {/* 3. Check Out Button (Always Visible) */}
            <button
              id="check-out-btn"
              onClick={handleCheckOut}
              disabled={!session.checkedIn || session.checkedOut || session.onBreak || actionLoading}
              title={
                !session.checkedIn
                  ? "You must check in first before checking out"
                  : session.onBreak
                  ? "End your active break before checking out"
                  : session.checkedOut
                  ? "You have already completed checkout for today"
                  : "Record your shift end"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                background:
                  session.checkedIn && !session.checkedOut && !session.onBreak
                    ? "#ef4444"
                    : "var(--background)",
                color:
                  session.checkedIn && !session.checkedOut && !session.onBreak
                    ? "#ffffff"
                    : "var(--subtext)",
                border:
                  session.checkedIn && !session.checkedOut && !session.onBreak
                    ? "none"
                    : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 700,
                fontSize: "13px",
                cursor:
                  (!session.checkedIn || session.checkedOut || session.onBreak || actionLoading)
                    ? "not-allowed"
                    : "pointer",
                opacity: (!session.checkedIn || session.checkedOut || session.onBreak) ? 0.55 : 1,
                boxShadow:
                  session.checkedIn && !session.checkedOut && !session.onBreak
                    ? "0 2px 8px rgba(239,68,68,0.3)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              <LogOut size={15} />
              {session.checkedOut ? "Checked Out" : "Check Out"}
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
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
              animation: "dialog-in 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
              <p style={{ fontSize: "13px", color: "#991b1b", fontWeight: 600 }}>{actionError}</p>
            </div>
            <button
              onClick={() => setActionError("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#991b1b",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Today's Visual Activity Timeline ── */}
        <ActivityTimeline
          checkInTime={session.checkInTime}
          checkOutTime={session.checkOutTime}
          breaks={session.breaks}
          onBreak={session.onBreak}
          currentBreak={session.currentBreak}
        />

        {/* ── Team Summary Stat Cards ── */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            <StatCard icon={UserCheck} label="Present Today" value={summary.present} color="#16a34a" bg="#f0fdf4" />
            <StatCard icon={Home} label="Work From Home" value={summary.wfh} color="#0284c7" bg="#f0f9ff" />
            <StatCard icon={Clock} label="Late Arrivals" value={summary.late} color="#d97706" bg="#fffbeb" />
            <StatCard icon={UserX} label="Absent" value={summary.absent} color="#dc2626" bg="#fef2f2" />
            <StatCard icon={Coffee} label="On Leave" value={summary.onLeave} color="#7c3aed" bg="#f5f3ff" />
          </div>
        )}

        {/* ── Filter Bar: Month/Year Selector & Status Counters ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={15} style={{ color: "var(--subtext)" }} />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--card)",
                  color: "var(--text)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                height: "36px",
                padding: "0 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 600,
                background: "var(--card)",
                color: "var(--text)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Quick status pill counters */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {["Present", "Late", "Absent", "WFH"].map((s) => {
              const count = countStatus(s);
              const meta = attendanceStatusMeta[s];
              return (
                <span
                  key={s}
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: meta?.color || "var(--text)",
                    background: meta?.bg || "var(--background)",
                    padding: "4px 10px",
                    borderRadius: "99px",
                    border: `1px solid ${meta?.color || "var(--border)"}22`,
                  }}
                >
                  {s}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Monthly Attendance Records Table ── */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "60px 0" }}>
              <Spinner />
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No attendance records found"
              subtitle={`No logs found for ${MONTHS[month - 1]} ${year}. Choose another month or punch in.`}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Date", "Status", "Check In", "Check Out", "Work Duration", "Break Sessions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "13px 18px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--subtext)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const meta = attendanceStatusMeta[r.status] || attendanceStatusMeta["Present"];
                    const isToday = r.date === todayStr;
                    return (
                      <tr
                        key={r.id || i}
                        style={{
                          borderBottom: i < records.length - 1 ? "1px solid var(--border)" : "none",
                          background: isToday ? "rgba(15,118,110,0.03)" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isToday) e.currentTarget.style.background = "var(--background)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isToday) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                            {isToday && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "var(--primary)",
                                  background: "var(--primary-light)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                Today
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            fontSize: "13.5px",
                            color: r.checkIn ? "var(--text)" : "var(--subtext)",
                            fontFamily: "monospace",
                            fontWeight: r.checkIn ? 600 : 400,
                          }}
                        >
                          {r.checkIn ? fmtTime(r.checkIn) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            fontSize: "13.5px",
                            color: r.checkOut ? "var(--text)" : "var(--subtext)",
                            fontFamily: "monospace",
                            fontWeight: r.checkOut ? 600 : 400,
                          }}
                        >
                          {r.checkOut ? fmtTime(r.checkOut) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            fontSize: "13.5px",
                            color: r.hoursWorked > 0 ? "var(--text)" : "var(--subtext)",
                            fontWeight: 600,
                          }}
                        >
                          {r.hoursWorked > 0 ? `${r.hoursWorked} hrs` : "—"}
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: "12.5px", color: "var(--subtext)" }}>
                          {isToday && session.breaks.length > 0 ? (
                            <span style={{ color: "#d97706", fontWeight: 600 }}>
                              {session.breaks.length} logged
                            </span>
                          ) : r.breaks ? (
                            `${r.breaks} session(s)`
                          ) : (
                            "Standard"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
