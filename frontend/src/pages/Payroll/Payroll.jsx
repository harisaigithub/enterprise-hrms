/**
 * Payroll Page — Module 7
 * Features: payroll run list, payslip detail view, ConfirmDialog for Run Payroll (Golden Rule #7)
 */

import { useState, useEffect } from "react";
import { Play, FileText, Download } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { getPayrollRuns, getPayslips, runPayroll } from "../../services/payrollService";
import { payrollStatusMeta } from "../../mock/payroll";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Payroll() {
  const [runs, setRuns]         = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeRun, setActiveRun] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("runs");

  useEffect(() => {
    setLoading(true);
    Promise.all([getPayrollRuns(), getPayslips("EMP001")])
      .then(([runRes, slipRes]) => {
        setRuns(runRes.data);
        setPayslips(slipRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRunPayroll = async () => {
    if (!activeRun) return;
    setRunning(true);
    await runPayroll(activeRun.id);
    setRuns((prev) =>
      prev.map((r) => (r.id === activeRun.id ? { ...r, status: "Processing" } : r))
    );
    setRunning(false);
    setShowConfirm(false);
    setActiveRun(null);
  };

  if (loading) return <MainLayout><Spinner /></MainLayout>;

  const tabs = [
    { id: "runs",     label: "Payroll Runs"  },
    { id: "payslips", label: "My Payslips"   },
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Payroll" subtitle="Monthly payroll runs and payslips" />

        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding: "10px 18px", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === t.id ? "var(--primary)" : "var(--subtext)", fontWeight: activeTab === t.id ? 700 : 500, fontSize: "13.5px", cursor: "pointer", marginBottom: "-1px" }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "runs" && (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Period","Employees","Gross","Deductions","Net Payroll","Status","Action"].map((h) => (
                      <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => {
                    const meta = payrollStatusMeta[run.status] || payrollStatusMeta.Draft;
                    return (
                      <tr key={run.id} style={{ borderBottom: i < runs.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{run.period}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", color: "var(--label)" }}>{run.totalEmployees}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", color: "var(--text)", fontFamily: "monospace" }}>{fmt(run.grossPayroll)}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", color: "var(--red)", fontFamily: "monospace" }}>−{fmt(run.totalDeductions)}</td>
                        <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "var(--green)", fontFamily: "monospace" }}>{fmt(run.netPayroll)}</td>
                        <td style={{ padding: "14px 18px" }}><StatusBadge label={meta.label} color={meta.color} bg={meta.bg} /></td>
                        <td style={{ padding: "14px 18px" }}>
                          {run.status === "Draft" && (
                            <button id={`run-payroll-${run.id}`} onClick={() => { setActiveRun(run); setShowConfirm(true); }}
                              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                              <Play size={13} /> Run Payroll
                            </button>
                          )}
                          {run.status === "Paid" && (
                            <button style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--green)", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                              <Download size={13} /> Download
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "payslips" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {payslips.map((slip) => (
              <div key={slip.id} style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{slip.period}</h3>
                    <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "2px" }}>
                      Paid on {new Date(slip.paidOn + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {slip.paymentMode}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Net Pay</p>
                      <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--green)", fontFamily: "monospace" }}>{fmt(slip.netPay)}</p>
                    </div>
                    <button style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", background: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--border-focus)", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      <FileText size={13} /> View Payslip
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[
                    { label: "Earnings", entries: slip.earnings, color: "var(--green)", isDeduction: false },
                    { label: "Deductions", entries: slip.deductions, color: "var(--red)", isDeduction: true },
                  ].map(({ label, entries, color, isDeduction }) => (
                    <div key={label} style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "16px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "12px" }}>{label}</p>
                      {Object.entries(entries).filter(([k, v]) => k !== "total" && v > 0).map(([key, val]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12.5px", color: "var(--label)", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span style={{ fontSize: "12.5px", fontWeight: 500, color, fontFamily: "monospace" }}>{isDeduction ? "−" : ""}{fmt(val)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Total {label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color, fontFamily: "monospace" }}>{isDeduction ? "−" : ""}{fmt(entries.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Run Payroll"
        message={`This will process payroll for ${activeRun?.totalEmployees ?? 0} employees for ${activeRun?.period}. This action requires a second approver before disbursement. Proceed?`}
        confirmLabel={running ? "Processing…" : "Yes, Run Payroll"}
        onConfirm={handleRunPayroll}
        onCancel={() => { setShowConfirm(false); setActiveRun(null); }}
      />
    </MainLayout>
  );
}
