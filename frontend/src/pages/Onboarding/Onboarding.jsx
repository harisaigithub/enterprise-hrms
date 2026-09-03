/**
 * Onboarding Checklist Page
 * Module 4  •  Onboarding
 * Features: summary stat cards, new-joiner list with progress, per-employee
 * checklist grouped by category, hard-blocked items (dependsOn), probation date.
 */

import { useState, useEffect } from "react";
import { Users, CheckCircle2, AlertTriangle, PackageX, Calendar, ChevronRight, Lock } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import { getOnboardingRecords, getOnboardingSummary, updateChecklistItemStatus } from "../../services/onboardingService";
import { checklistItemStatusMeta, checklistOwnerMeta, CHECKLIST_CATEGORIES } from "../../mock/onboarding";

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

function JoinerListItem({ record, active, onSelect }) {
  const total = record.items.length;
  const complete = record.items.filter((i) => i.status === "Complete").length;
  const pct = total ? Math.round((complete / total) * 100) : 0;
  const overdue = record.items.some((i) => i.isOverdue);

  return (
    <button
      onClick={() => onSelect(record.employeeId)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 14px", borderRadius: "var(--radius)", cursor: "pointer",
        border: active ? "1px solid var(--primary)" : "1px solid transparent",
        background: active ? "var(--primary-light)" : "transparent",
        textAlign: "left",
      }}
    >
      <img src={record.avatar} alt={record.employeeName} style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.employeeName}</p>
          {overdue && <AlertTriangle size={13} style={{ color: "var(--red)", flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "6px" }}>{record.designation}</p>
        <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--green)" : "var(--primary)", borderRadius: "99px" }} />
        </div>
      </div>
      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--subtext)", flexShrink: 0 }}>{pct}%</span>
      <ChevronRight size={16} style={{ color: "var(--subtext)", flexShrink: 0 }} />
    </button>
  );
}

function ChecklistItemRow({ item, onChangeStatus }) {
  const meta = checklistItemStatusMeta[item.status] || checklistItemStatusMeta.Pending;
  const ownerMeta = checklistOwnerMeta[item.owner] || checklistOwnerMeta.HR;
  const isBlocked = item.status === "Blocked";
  const isComplete = item.status === "Complete";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 4px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {isBlocked && <Lock size={13} style={{ color: "var(--red)", flexShrink: 0 }} />}
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{item.title}</p>
        </div>
        {isBlocked && item.blockedReason && (
          <p style={{ fontSize: "11.5px", color: "var(--red)", marginTop: "2px" }}>{item.blockedReason}</p>
        )}
        {!isBlocked && item.isOverdue && (
          <p style={{ fontSize: "11.5px", color: "var(--amber)", marginTop: "2px" }}>Overdue  •  was due {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
        )}
      </div>

      <span style={{ fontSize: "11px", fontWeight: 600, color: ownerMeta.color, background: ownerMeta.bg, padding: "3px 10px", borderRadius: "99px", flexShrink: 0 }}>
        {ownerMeta.label}
      </span>

      <span style={{ fontSize: "12.5px", color: "var(--subtext)", fontFamily: "monospace", flexShrink: 0, minWidth: "64px" }}>
        {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
      </span>

      <div style={{ flexShrink: 0, minWidth: "132px", display: "flex", justifyContent: "flex-end" }}>
        <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
      </div>

      <button
        onClick={() => onChangeStatus(item.id, isComplete ? "Pending" : "Complete")}
        disabled={isBlocked}
        title={isBlocked ? "Blocked until dependency is complete" : isComplete ? "Mark as pending" : "Mark as complete"}
        style={{
          flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%",
          border: `1.5px solid ${isBlocked ? "var(--border)" : isComplete ? "var(--green)" : "var(--border)"}`,
          background: isComplete ? "var(--green)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: isBlocked ? "not-allowed" : "pointer",
          opacity: isBlocked ? 0.5 : 1,
        }}
      >
        {isComplete && <CheckCircle2 size={16} style={{ color: "#fff" }} />}
      </button>
    </div>
  );
}

export default function OnboardingChecklist() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.all([getOnboardingRecords(), getOnboardingSummary()]).then(([recRes, sumRes]) => {
      setRecords(recRes.data);
      setSummary(sumRes.data);
      setSelectedId((prev) => prev || recRes.data[0]?.employeeId || null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleChangeStatus = async (itemId, status) => {
    const res = await updateChecklistItemStatus(selectedId, itemId, status);
    setRecords((prev) => prev.map((r) => (r.employeeId === selectedId ? res.data : r)));
    getOnboardingSummary().then((sumRes) => setSummary(sumRes.data));
  };

  const selected = records.find((r) => r.employeeId === selectedId);

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Onboarding" subtitle="Checklists for new joiners  •  Day 1 readiness" />

        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            <StatCard icon={Users}       label="New Joiners"          value={summary.newJoiners}                color="#0284c7" bg="#f0f9ff" />
            <StatCard icon={CheckCircle2} label="Avg. Completion"     value={`${summary.avgCompletion}%`}       color="#16a34a" bg="#f0fdf4" />
            <StatCard icon={AlertTriangle} label="Overdue Items"      value={summary.overdueItems}              color="#dc2626" bg="#fef2f2" />
            <StatCard icon={PackageX}    label="Pending Procurement"  value={summary.pendingProcurement}        color="#d97706" bg="#fffbeb" />
          </div>
        )}

        {records.length === 0 ? (
          <EmptyState title="No active onboarding checklists" subtitle="New joiners will appear here once an offer is accepted." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: "20px", alignItems: "start" }}>
            {/* Joiner list */}
            <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "10px" }}>
              {records.map((r) => (
                <JoinerListItem key={r.employeeId} record={r} active={r.employeeId === selectedId} onSelect={setSelectedId} />
              ))}
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Selected joiner header */}
                <div style={{ background: "var(--card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "22px 26px", display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
                  <img src={selected.avatar} alt={selected.employeeName} style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text)" }}>{selected.employeeName}</h2>
                    <p style={{ fontSize: "13px", color: "var(--subtext)" }}>{selected.designation}  •  {selected.department}</p>
                  </div>
                  <div style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Join Date</p>
                      <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                        <Calendar size={13} /> {new Date(selected.joinDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Buddy</p>
                      <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600, marginTop: "2px" }}>{selected.buddy}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Probation Ends</p>
                      <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600, marginTop: "2px" }}>{new Date(selected.probationEndDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                </div>

                {/* Checklist grouped by category */}
                <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "8px 22px" }}>
                  {CHECKLIST_CATEGORIES.map((category) => {
                    const items = selected.items.filter((i) => i.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} style={{ padding: "16px 0" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{category}</p>
                        {items.map((item) => (
                          <ChecklistItemRow key={item.id} item={item} onChangeStatus={handleChangeStatus} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}