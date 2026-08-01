/**
 * Employee Self Service (ESS) Page — Module 16
 * Tabs: Overview · Tax Declaration · Download My Data
 *
 * ESS is a thin, employee-scoped aggregation layer over other modules —
 * it deep-links into Leave/Attendance/Payroll/LMS/Assets rather than
 * duplicating their data stores.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  DownloadCloud,
  CalendarDays,
  Clock,
  Wallet,
  GraduationCap,
  Laptop,
  LifeBuoy,
  UserCog,
  AlertTriangle,
  Plus,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getOverview,
  getTaxDeclarations,
  submitTaxDeclaration,
  getLastExportRequest,
  requestDataExport,
} from "../../services/essService";
import { proofStatusMeta, EXPORT_THROTTLE_DAYS, EXPORT_EXPIRY_HOURS } from "../../mock/ess";

// Identity is always this session's user — never taken from a route param,
// query string, or form field, per the ESS scoping rule (16.6).
const ME = { id: "EMP001", name: "Matsya Singh" };
const currency = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDateTime = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

/* ---------------------------------- Overview tab ---------------------------------- */

const QUICK_LINKS = [
  { key: "leave", label: "Apply Leave", icon: CalendarDays, to: "/leave", ready: true },
  { key: "attendance", label: "Attendance", icon: Clock, to: "/attendance", ready: true },
  { key: "payroll", label: "Payslips", icon: Wallet, to: "/payroll", ready: true },
  { key: "performance", label: "Performance", icon: ShieldCheck, to: "/performance", ready: true },
  { key: "lms", label: "Learning Portal", icon: GraduationCap, to: "/lms", ready: true },
  { key: "assets", label: "Request Asset", icon: Laptop, to: "/assets", ready: true },
  { key: "helpdesk", label: "Raise Ticket", icon: LifeBuoy, to: "/helpdesk", ready: false },
  { key: "profile", label: "Update Profile", icon: UserCog, to: "/employees/me", ready: false },
];

function QuickLinkCard({ link }) {
  const content = (
    <>
      <div style={{ width: "38px", height: "38px", borderRadius: "var(--radius)", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
        <link.icon size={18} style={{ color: "var(--primary)" }} />
      </div>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{link.label}</p>
      {!link.ready && <span style={{ fontSize: "10.5px", color: "var(--subtext)" }}>Module coming soon</span>}
    </>
  );

  const style = { ...cardStyle, padding: "16px", textAlign: "left", display: "block", textDecoration: "none", cursor: link.ready ? "pointer" : "default", opacity: link.ready ? 1 : 0.6 };

  return link.ready ? (
    <Link to={link.to} style={style}>{content}</Link>
  ) : (
    <div style={style}>{content}</div>
  );
}

function OverviewWidget({ icon: Icon, label, error, children }) {
  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <Icon size={15} style={{ color: "var(--subtext)" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      </div>
      {error ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--red)" }}>
          <AlertTriangle size={14} />
          <span style={{ fontSize: "12px" }}>{error}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function OverviewTab({ overview, simulatePayrollDown, onToggleSimulate }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Quick Actions</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--subtext)", cursor: "pointer" }}>
          <input type="checkbox" checked={simulatePayrollDown} onChange={(e) => onToggleSimulate(e.target.checked)} />
          Simulate Payroll module being down
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {QUICK_LINKS.map((l) => <QuickLinkCard key={l.key} link={l} />)}
      </div>

      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "14px" }}>My Snapshot</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <OverviewWidget icon={CalendarDays} label="Leave Balance">
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{overview.leaveBalance.available}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{overview.leaveBalance.pending} day(s) pending approval</p>
        </OverviewWidget>

        <OverviewWidget icon={Clock} label="This Month">
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{overview.attendanceThisMonth.present} days</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Present · {overview.attendanceThisMonth.late} late · {overview.attendanceThisMonth.wfh} WFH</p>
        </OverviewWidget>

        <OverviewWidget icon={Wallet} label="Latest Payslip" error={overview.payrollError}>
          {overview.latestPayslip && (
            <>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{currency(overview.latestPayslip.netPay)}</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{overview.latestPayslip.period}</p>
            </>
          )}
        </OverviewWidget>

        <OverviewWidget icon={GraduationCap} label="Learning">
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{overview.learning.inProgress}</p>
          <p style={{ fontSize: "11.5px", color: overview.learning.complianceOverdue > 0 ? "var(--red)" : "var(--subtext)" }}>
            In progress{overview.learning.complianceOverdue > 0 ? ` · ${overview.learning.complianceOverdue} compliance overdue` : ""}
          </p>
        </OverviewWidget>

        <OverviewWidget icon={Laptop} label="Assigned Assets">
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{overview.assignedAssets}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Currently in your custody</p>
        </OverviewWidget>

        <OverviewWidget icon={LifeBuoy} label="Open Tickets">
          <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>{overview.openTickets}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Awaiting Helpdesk response</p>
        </OverviewWidget>
      </div>

      {overview.payrollError && (
        <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "14px" }}>
          Payroll data is unavailable right now, but the rest of your dashboard loaded normally — that's intentional (a single module outage shouldn't take ESS down).
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- Tax Declaration tab ---------------------------------- */

function AddDeclarationModal({ isOpen, onClose, onSaved }) {
  const [section, setSection] = useState("80C");
  const [investmentType, setInvestmentType] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!investmentType.trim() || !amount) return;
    setSaving(true);
    const entry = {
      id: `td-${Date.now()}`,
      financialYear: "2026-27",
      section,
      investmentType: investmentType.trim(),
      amount: Number(amount),
      proofStatus: "Pending",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    const res = await submitTaxDeclaration(entry);
    setSaving(false);
    onSaved(res.data);
    onClose();
    setInvestmentType(""); setAmount("");
  };

  return (
    <Modal isOpen={isOpen} title="Submit Investment Declaration" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>Financial Year 2026-27</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Section")}
          <select value={section} onChange={(e) => setSection(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            {["80C", "80D", "80CCD(1B)", "HRA", "LTA", "Home Loan Interest"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Investment / Expense Type *")}
          <input value={investmentType} onChange={(e) => setInvestmentType(e.target.value)} placeholder="e.g. ELSS Mutual Fund" style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Amount (₹) *")}
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle(false)} />
        </div>
        <p style={{ fontSize: "11px", color: "var(--subtext)", margin: 0 }}>Proof documents can be uploaded after submission; status starts as "Pending" until reviewed by Payroll.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit Declaration"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function TaxDeclarationTab({ declarations, onAdded }) {
  const [showAdd, setShowAdd] = useState(false);
  const total = declarations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Tax Declarations — FY 2026-27</h2>
          <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Total declared: {currency(total)}</p>
        </div>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Declaration</PrimaryButton>
      </div>

      {declarations.length === 0 ? (
        <EmptyState icon={Receipt} title="No declarations submitted yet" />
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                  {["Section", "Type", "Amount", "Proof Status", "Submitted"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {declarations.map((d, i) => {
                  const meta = proofStatusMeta[d.proofStatus];
                  return (
                    <tr key={d.id} style={{ borderBottom: i < declarations.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{d.section}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{d.investmentType}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)" }}>{currency(d.amount)}</td>
                      <td style={{ padding: "13px 16px" }}><StatusBadge label={d.proofStatus} color={meta.color} bg={meta.bg} /></td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--subtext)", whiteSpace: "nowrap" }}>{fmtDate(d.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddDeclarationModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onAdded} />
    </div>
  );
}

/* ---------------------------------- Download My Data tab ---------------------------------- */

function DataExportTab({ lastRequest, onRequested }) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  const handleRequest = async () => {
    setRequesting(true);
    setError("");
    const res = await requestDataExport(ME.id);
    setRequesting(false);
    if (res.data?.error) {
      setError(res.data.error);
      return;
    }
    onRequested(res.data.request);
  };

  const isExpired = lastRequest && new Date(lastRequest.expiresAt) < new Date();
  const nextAllowed = lastRequest ? new Date(new Date(lastRequest.requestedAt).getTime() + EXPORT_THROTTLE_DAYS * 86400000) : null;
  const canRequestAgain = !lastRequest || new Date() >= nextAllowed;

  return (
    <div style={{ maxWidth: "560px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Download My Data</h2>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "18px" }}>
        Request a complete export of everything linked to your employee record across every module — profile, attendance, leave, payroll, performance, learning, and assets. This is a data subject access request (DSAR), limited to once every {EXPORT_THROTTLE_DAYS} days.
      </p>

      <div style={{ ...cardStyle, padding: "20px 22px" }}>
        {!lastRequest ? (
          <>
            <p style={{ fontSize: "13px", color: "var(--subtext)", marginBottom: "14px" }}>No export requested yet.</p>
            <PrimaryButton onClick={handleRequest} disabled={requesting}>
              <DownloadCloud size={16} /> {requesting ? "Preparing export…" : "Request Data Export"}
            </PrimaryButton>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Clock3 size={15} style={{ color: "var(--subtext)" }} />
              <span style={{ fontSize: "12.5px", color: "var(--subtext)" }}>Requested {fmtDateTime(lastRequest.requestedAt)}</span>
            </div>
            {isExpired ? (
              <StatusBadge label="Link expired" color="#64748b" bg="#f1f5f9" />
            ) : (
              <>
                <StatusBadge label="Ready to download" color="#16a34a" bg="#f0fdf4" />
                <p style={{ fontSize: "11.5px", color: "var(--subtext)", margin: "10px 0 14px" }}>
                  Expires {fmtDateTime(lastRequest.expiresAt)} — the file is automatically deleted from temporary storage after that.
                </p>
                <a href={lastRequest.downloadUrl} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
                  <DownloadCloud size={15} /> Download my data (.zip, encrypted)
                </a>
              </>
            )}

            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
              {canRequestAgain ? (
                <PrimaryButton onClick={handleRequest} disabled={requesting}>{requesting ? "Preparing…" : "Request a new export"}</PrimaryButton>
              ) : (
                <p style={{ fontSize: "12px", color: "var(--subtext)" }}>You can request another export on {nextAllowed.toISOString().slice(0, 10)}.</p>
              )}
            </div>
          </>
        )}
        {error && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "10px" }}>{error}</p>}
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "tax", label: "Tax Declaration", icon: Receipt },
  { key: "export", label: "Download My Data", icon: DownloadCloud },
];

export default function SelfService() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [simulatePayrollDown, setSimulatePayrollDown] = useState(false);
  const [declarations, setDeclarations] = useState([]);
  const [lastExportRequest, setLastExportRequest] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getOverview(simulatePayrollDown), getTaxDeclarations(ME.id), getLastExportRequest(ME.id)])
      .then(([ov, td, exp]) => {
        setOverview(ov.data);
        setDeclarations(td.data);
        setLastExportRequest(exp.data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatePayrollDown]);

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
        <PageHeader title="Self Service" subtitle={`Welcome back, ${ME.name}`} />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <OverviewTab overview={overview} simulatePayrollDown={simulatePayrollDown} onToggleSimulate={setSimulatePayrollDown} />
        )}

        {activeTab === "tax" && (
          <TaxDeclarationTab declarations={declarations} onAdded={(d) => setDeclarations((prev) => [d, ...prev])} />
        )}

        {activeTab === "export" && (
          <DataExportTab lastRequest={lastExportRequest} onRequested={setLastExportRequest} />
        )}
      </div>
    </MainLayout>
  );
}