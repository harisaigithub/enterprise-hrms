/**
 * Attendance Page
 * Module 5 — Attendance & Time
 * Features: summary stat cards, monthly record table, check-in/check-out, status badges
 */

import { useState, useEffect } from "react";
import { Clock, UserCheck, UserX, Coffee, Home } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import { getMyAttendance, getTeamSummary, checkIn, checkOut } from "../../services/attendanceService";
import { useAuth } from "../../context/AuthContext";
import { attendanceStatusMeta } from "../../mock/attendance";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
        <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{value}</p>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMyAttendance({ employeeId: user.id, month, year }),
      getTeamSummary(),
    ]).then(([recRes, sumRes]) => {
      setRecords(recRes.data);
      setSummary(sumRes.data);
    }).catch(() => setLoading(false)).finally(() => setLoading(false));
  }, [user.id, month, year]);

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      await checkIn(user.id);
      setCheckedIn(true);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      await checkOut(user.id);
      setCheckedIn(false);
    } finally {
      setChecking(false);
    }
  };

  const countStatus = (s) => records.filter((r) => r.status === s).length;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <PageHeader title="Attendance" subtitle={`${MONTHS[month-1]} ${year} — My attendance log`} />
          <button
            id={checkedIn ? "check-out-btn" : "check-in-btn"}
            onClick={checkedIn ? handleCheckOut : handleCheckIn}
            disabled={checking}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "10px 20px",
              background: checkedIn ? "var(--red-light)" : "var(--primary)",
              color: checkedIn ? "var(--red)" : "#fff",
              border: checkedIn ? "1px solid var(--red)" : "none",
              borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "13.5px",
              cursor: checking ? "not-allowed" : "pointer",
              opacity: checking ? 0.7 : 1,
            }}
          >
            <Clock size={16} />
            {checking ? "Processing…" : checkedIn ? "Check Out" : "Check In"}
          </button>
        </div>

        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            <StatCard icon={UserCheck} label="Present Today" value={summary.present} color="#16a34a" bg="#f0fdf4" />
            <StatCard icon={Home}      label="WFH"           value={summary.wfh}     color="#0284c7" bg="#f0f9ff" />
            <StatCard icon={Clock}     label="Late"          value={summary.late}    color="#d97706" bg="#fffbeb" />
            <StatCard icon={UserX}     label="Absent"        value={summary.absent}  color="#dc2626" bg="#fef2f2" />
            <StatCard icon={Coffee}    label="On Leave"      value={summary.onLeave} color="#7c3aed" bg="#f5f3ff" />
          </div>
        )}

        {/* Month / year picker + status summary chips */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)", outline: "none", cursor: "pointer" }}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ height: "36px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)", outline: "none", cursor: "pointer" }}>
            {[2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {["Present","Late","Absent","WFH"].map((s) => {
            const count = countStatus(s);
            if (!count) return null;
            const meta = attendanceStatusMeta[s];
            return (
              <span key={s} style={{ fontSize: "11px", fontWeight: 600, color: meta?.color, background: meta?.bg, padding: "3px 10px", borderRadius: "99px" }}>
                {s}: {count}
              </span>
            );
          })}
        </div>

        {/* Records table */}
        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {loading ? (
            <Spinner />
          ) : records.length === 0 ? (
            <EmptyState title="No records for this month" subtitle="Select a different month or year." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Date","Status","Check In","Check Out","Hours Worked"].map((h) => (
                      <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const meta = attendanceStatusMeta[r.status] || attendanceStatusMeta["Present"];
                    return (
                      <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "13px 18px", fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>
                          {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                        </td>
                        <td style={{ padding: "13px 18px" }}>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "13.5px", color: r.checkIn ? "var(--text)" : "var(--subtext)", fontFamily: "monospace" }}>
                          {r.checkIn || "—"}
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "13.5px", color: r.checkOut ? "var(--text)" : "var(--subtext)", fontFamily: "monospace" }}>
                          {r.checkOut || "—"}
                        </td>
                        <td style={{ padding: "13px 18px", fontSize: "13.5px", color: r.hoursWorked > 0 ? "var(--text)" : "var(--subtext)" }}>
                          {r.hoursWorked > 0 ? `${r.hoursWorked}h` : "—"}
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
