/**
 * Payroll Page - Module 7 (Employee & Corporate Payroll System)
 * Features:
 *   - Dropdown toggle: Monthly Payslips vs Annual Summary (Yearly)
 *   - Financial Year filter (FY 2026-27, FY 2025-26)
 *   - Monthly View: Individual payslip cards with detailed View Payslip modal & Print
 *   - Yearly View: Annual Gross CTC, Total Deductions, Net Annual Take-Home,
 *                  Month-by-month salary progression table, and Form 16 / Tax summary
 *   - Full statutory corporate details: CIN, GSTIN, PF Reg, ESIC, UAN, PAN, Bank, IFSC
 *   - Admin / HR toggle for company payroll runs if permitted
 */

import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  X,
  Building2,
  User,
  CalendarDays,
  CreditCard,
  Printer,
  TrendingUp,
  Download,
  Calendar,
  Wallet,
  ShieldCheck,
  Percent,
  Receipt,
  Layers,
  ChevronDown,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { getPayslips, getPayrollRuns } from "../../services/payrollService";
import { payrollStatusMeta, getUserPayslips, payrollRuns as mockPayrollRuns } from "../../mock/payroll";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ─── Detailed Payslip Modal ────────────────────────────────────────────────── */
function PayslipModal({ slip, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!slip) return null;

  const meta = payrollStatusMeta[slip.status] || payrollStatusMeta.Paid;
  const earningRows = Object.entries(slip.earnings || {}).filter(([k, v]) => k !== "total" && v > 0);
  const deductionRows = Object.entries(slip.deductions || {}).filter(([k, v]) => k !== "total" && v > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-xl)",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          animation: "dialog-in 0.18s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--card)",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius)",
                background: "var(--primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={18} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                Salary Statement &mdash; {slip.period}
              </h2>
              <p style={{ fontSize: "11px", color: "var(--subtext)" }}>
                Payslip Reference: {slip.id}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => window.print()}
              title="Print payslip"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--subtext)",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Company + Employee Statutory Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Company Block */}
            <div
              style={{
                background: "var(--background)",
                borderRadius: "var(--radius)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Building2 size={14} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Employer
                </span>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Proteccio Technologies Pvt. Ltd.</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>CIN: U72900TG2023PTC123456</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>GSTIN: 36AABCU9603R1ZP</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>PF Reg: MHBAN0023450000</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>ESIC Reg: 31000123456789</p>
            </div>

            {/* Employee Block */}
            <div
              style={{
                background: "var(--background)",
                borderRadius: "var(--radius)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <User size={14} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Employee Details
                </span>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{slip.employeeName}</p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>
                {slip.designation || "Senior Software Engineer"} &bull; {slip.department || "Engineering"}
              </p>
              <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>Employee ID: {slip.employeeId}</p>

              {/* Statutory details sub-grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 10px",
                  marginTop: "6px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                {[
                  { label: "UAN", value: slip.uan || "100987654321" },
                  { label: "PAN", value: slip.pan || "ABCPM1234D" },
                  { label: "Bank", value: slip.bank || "HDFC Bank" },
                  { label: "A/C No", value: slip.bankAccount || "XXXX XXXX 4821" },
                  { label: "IFSC", value: slip.ifsc || "HDFC0001234" },
                  { label: "PF No", value: slip.pfAccount || "MH/BAN/0123456/000/0000001" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                      {label}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text)", fontWeight: 600, fontFamily: "monospace" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment metadata chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
            {[
              { icon: CalendarDays, label: "Pay Period", value: slip.period },
              { icon: CalendarDays, label: "Disbursement Date", value: fmtDate(slip.paidOn) },
              { icon: CreditCard, label: "Payment Mode", value: slip.paymentMode || "Bank Transfer" },
              { icon: FileText, label: "Status", value: <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} /> },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  background: "var(--background)",
                  borderRadius: "var(--radius)",
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <Icon size={12} style={{ color: "var(--subtext)" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {label}
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Earnings */}
            <div style={{ background: "var(--background)", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(34,197,94,0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Gross Earnings
                </span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {earningRows.map(([key, val]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--label)", textTransform: "capitalize" }}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>
                      {fmt(val)}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "4px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Total Earnings</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", fontFamily: "monospace" }}>
                    {fmt(slip.earnings?.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div style={{ background: "var(--background)", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(239,68,68,0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Deductions & Taxes
                </span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {deductionRows.map(([key, val]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "var(--label)", textTransform: "capitalize" }}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#dc2626", fontFamily: "monospace" }}>
                      &minus;{fmt(val)}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "4px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Total Deductions</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", fontFamily: "monospace" }}>
                    &minus;{fmt(slip.deductions?.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Card */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 14px rgba(15,118,110,0.25)",
            }}
          >
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Net Take-Home Pay
              </p>
              <p style={{ fontSize: "30px", fontWeight: 800, color: "#ffffff", fontFamily: "monospace", marginTop: "2px" }}>
                {fmt(slip.netPay)}
              </p>
              <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.75)", marginTop: "2px" }}>
                Disbursed to {slip.bank || "HDFC Bank"} A/C {slip.bankAccount || "XXXX 4821"} on {fmtDate(slip.paidOn)}
              </p>
            </div>
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={26} style={{ color: "#ffffff" }} />
            </div>
          </div>

          <p style={{ fontSize: "11px", color: "var(--subtext)", textAlign: "center", lineHeight: 1.5 }}>
            This is a computer-generated document. For payroll discrepancies, please raise a ticket under <strong>Helpdesk &rarr; Payroll</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Monthly Payslip Card ──────────────────────────────────────────────────── */
function PayslipCard({ slip, onView }) {
  const meta = payrollStatusMeta[slip.status] || payrollStatusMeta.Paid;
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        padding: "20px 24px",
        transition: "box-shadow 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={16} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{slip.period}</h3>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "4px" }}>
            Disbursed on {fmtDate(slip.paidOn)} &bull; {slip.paymentMode || "Bank Transfer"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Net Pay
            </p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--green)", fontFamily: "monospace" }}>
              {fmt(slip.netPay)}
            </p>
          </div>
          <button
            id={`view-payslip-${slip.id}`}
            onClick={() => onView(slip)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "var(--primary-light)",
              color: "var(--primary)",
              border: "1px solid var(--border-focus)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--primary-light)";
              e.currentTarget.style.color = "var(--primary)";
            }}
          >
            <FileText size={14} /> View Payslip
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: "12px",
          alignItems: "center",
          paddingTop: "14px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Gross Earnings
          </p>
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>
            {fmt(slip.earnings?.total)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Total Deductions
          </p>
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--red)", fontFamily: "monospace" }}>
            &minus;{fmt(slip.deductions?.total)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Payslip Ref
          </p>
          <p style={{ fontSize: "12px", color: "var(--label)", fontFamily: "monospace" }}>{slip.id}</p>
        </div>
        <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
      </div>
    </div>
  );
}

/* ─── Annual / Yearly View Component ────────────────────────────────────────── */
function YearlyPayrollView({ payslips, onViewSlip }) {
  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let pf = 0;
    let tax = 0;
    let pt = 0;
    let otherDeductions = 0;

    payslips.forEach((s) => {
      gross += s.earnings?.total || 0;
      net += s.netPay || 0;
      pf += s.deductions?.providentFund || 0;
      tax += s.deductions?.incomeTax || 0;
      pt += s.deductions?.professionalTax || 0;
      otherDeductions += (s.deductions?.total || 0) - (s.deductions?.providentFund || 0) - (s.deductions?.incomeTax || 0);
    });

    return { gross, net, pf, tax, pt, totalDeductions: gross - net };
  }, [payslips]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Annual Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--card)", padding: "18px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <Wallet size={16} style={{ color: "var(--primary)" }} />
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Annual Gross Earnings</p>
          </div>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", fontFamily: "monospace" }}>{fmt(totals.gross)}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>Cumulative for selected Financial Year</p>
        </div>

        <div style={{ background: "var(--card)", padding: "18px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <CreditCard size={16} style={{ color: "#16a34a" }} />
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Net Take-Home Pay</p>
          </div>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", fontFamily: "monospace" }}>{fmt(totals.net)}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>Credited into salary bank account</p>
        </div>

        <div style={{ background: "var(--card)", padding: "18px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <Percent size={16} style={{ color: "#dc2626" }} />
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>TDS (Income Tax) Paid</p>
          </div>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", fontFamily: "monospace" }}>{fmt(totals.tax)}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>Deposited under PAN: ABCPM1234D</p>
        </div>

        <div style={{ background: "var(--card)", padding: "18px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <ShieldCheck size={16} style={{ color: "#0284c7" }} />
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Total EPF Contribution</p>
          </div>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#0284c7", fontFamily: "monospace" }}>{fmt(totals.pf)}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)", marginTop: "2px" }}>Deposited under UAN: 100987654321</p>
        </div>
      </div>

      {/* Month-by-Month Progression Table */}
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Annual Salary Breakdown by Month</h3>
            <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Detailed month-over-month earnings, deductions, and tax statement</p>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Print Annual Statement
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                {["Month / Period", "Basic Pay", "HRA", "Allowances & Bonus", "Gross Earnings", "EPF", "TDS / Tax", "Total Deductions", "Net Pay", "Action"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.map((s, idx) => (
                <tr key={s.id || idx} style={{ borderBottom: idx < payslips.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{s.period}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", fontFamily: "monospace" }}>{fmt(s.earnings?.basicSalary)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", fontFamily: "monospace" }}>{fmt(s.earnings?.hra)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", fontFamily: "monospace" }}>
                    {fmt((s.earnings?.total || 0) - (s.earnings?.basicSalary || 0) - (s.earnings?.hra || 0))}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>{fmt(s.earnings?.total)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)", fontFamily: "monospace" }}>{fmt(s.deductions?.providentFund)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "#dc2626", fontFamily: "monospace" }}>{fmt(s.deductions?.incomeTax)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "#dc2626", fontWeight: 600, fontFamily: "monospace" }}>&minus;{fmt(s.deductions?.total)}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "#16a34a", fontWeight: 700, fontFamily: "monospace" }}>{fmt(s.netPay)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <button
                      onClick={() => onViewSlip(s)}
                      style={{
                        padding: "4px 10px",
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--background)", borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>Total (YTD)</td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, fontFamily: "monospace" }}>
                  {fmt(payslips.reduce((acc, s) => acc + (s.earnings?.basicSalary || 0), 0))}
                </td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, fontFamily: "monospace" }}>
                  {fmt(payslips.reduce((acc, s) => acc + (s.earnings?.hra || 0), 0))}
                </td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, fontFamily: "monospace" }}>
                  {fmt(payslips.reduce((acc, s) => acc + ((s.earnings?.total || 0) - (s.earnings?.basicSalary || 0) - (s.earnings?.hra || 0)), 0))}
                </td>
                <td style={{ padding: "14px 16px", fontSize: "13.5px", fontWeight: 800, color: "var(--text)", fontFamily: "monospace" }}>
                  {fmt(totals.gross)}
                </td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, fontFamily: "monospace" }}>{fmt(totals.pf)}</td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, color: "#dc2626", fontFamily: "monospace" }}>{fmt(totals.tax)}</td>
                <td style={{ padding: "14px 16px", fontSize: "12.5px", fontWeight: 700, color: "#dc2626", fontFamily: "monospace" }}>&minus;{fmt(totals.totalDeductions)}</td>
                <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 800, color: "#16a34a", fontFamily: "monospace" }}>{fmt(totals.net)}</td>
                <td style={{ padding: "14px 16px" }} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Form-16 Tax Summary Card */}
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "var(--radius)", background: "rgba(79,70,229,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Receipt size={24} style={{ color: "#4f46e5" }} />
          </div>
          <div>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Form-16 & Tax Computation Certificate</h4>
            <p style={{ fontSize: "12.5px", color: "var(--subtext)" }}>
              Income Tax Certificate under Section 203 of the Income Tax Act, 1961 for Tax Deducted at Source (TDS).
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 18px",
            background: "var(--primary)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(15,118,110,0.25)",
          }}
        >
          <Download size={15} /> Download Form-16 Summary
        </button>
      </div>
    </div>
  );
}

/* ─── Main Payroll Page ─────────────────────────────────────────────────────── */
export default function Payroll() {
  const { user, permissions } = useAuth();
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "yearly"
  const [financialYear, setFinancialYear] = useState("2026-2027");
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Check if current user has admin / HR payroll management access
  const canManagePayroll = permissions?.includes("payroll:write") || permissions?.includes("payroll:approve");
  const [adminTab, setAdminTab] = useState("my_payslips"); // "my_payslips" | "payroll_runs"
  const [payrollRunsList, setPayrollRunsList] = useState([]);

  useEffect(() => {
    setLoading(true);
    const userFallback = getUserPayslips(user);
    getPayslips(user?.id)
      .then((res) => {
        const list = res.data?.length > 0 ? res.data : userFallback;
        setPayslips(list);
      })
      .catch(() => {
        setPayslips(userFallback);
      })
      .finally(() => setLoading(false));

    if (canManagePayroll) {
      getPayrollRuns()
        .then((res) => setPayrollRunsList(res.data?.length > 0 ? res.data : mockPayrollRuns))
        .catch(() => setPayrollRunsList(mockPayrollRuns));
    }
  }, [user, canManagePayroll]);

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* ── Page Header + View Mode & FY Selectors ── */}
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
            title="Payroll & Payslips"
            subtitle={
              viewMode === "monthly"
                ? "View and download monthly salary disbursements and tax deductions"
                : `Annual Compensation & Tax Computation Statement for FY ${financialYear}`
            }
          />

          {/* Controls Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* View Mode Dropdown (Monthly vs Yearly) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={15} style={{ color: "var(--subtext)" }} />
              <select
                id="payroll-view-mode-select"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                style={{
                  height: "38px",
                  padding: "0 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "var(--card)",
                  color: "var(--text)",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <option value="monthly">📅 Monthly Payslips</option>
                <option value="yearly">📊 Annual Statement (Yearly)</option>
              </select>
            </div>

            {/* Financial Year Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={15} style={{ color: "var(--subtext)" }} />
              <select
                id="payroll-fy-select"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                style={{
                  height: "38px",
                  padding: "0 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--card)",
                  color: "var(--text)",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <option value="2026-2027">FY 2026 – 2027</option>
                <option value="2025-2026">FY 2025 – 2026</option>
                <option value="2024-2025">FY 2024 – 2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Admin / HR Sub-Tabs (if user has payroll administrative access) ── */}
        {canManagePayroll && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "10px",
            }}
          >
            <button
              onClick={() => setAdminTab("my_payslips")}
              style={{
                padding: "8px 16px",
                background: adminTab === "my_payslips" ? "var(--primary-light)" : "none",
                color: adminTab === "my_payslips" ? "var(--primary)" : "var(--subtext)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              My Payslips
            </button>
            <button
              onClick={() => setAdminTab("payroll_runs")}
              style={{
                padding: "8px 16px",
                background: adminTab === "payroll_runs" ? "var(--primary-light)" : "none",
                color: adminTab === "payroll_runs" ? "var(--primary)" : "var(--subtext)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🏢 Company Payroll Runs
            </button>
          </div>
        )}

        {/* ── Content View ── */}
        {loading ? (
          <div style={{ padding: "80px 0" }}>
            <Spinner />
          </div>
        ) : canManagePayroll && adminTab === "payroll_runs" ? (
          /* Admin Payroll Runs Table */
          <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Corporate Payroll Batches</h3>
              <p style={{ fontSize: "12px", color: "var(--subtext)" }}>Review and process monthly organization-wide salary disbursements</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Run ID", "Period", "Employees", "Gross Payroll", "Total Deductions", "Net Disbursed", "Status"].map((h) => (
                      <th key={h} style={{ padding: "12px 18px", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrollRunsList.map((run) => {
                    const meta = payrollStatusMeta[run.status] || payrollStatusMeta.Paid;
                    return (
                      <tr key={run.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "14px 18px", fontSize: "13px", fontFamily: "monospace", fontWeight: 600 }}>{run.id}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{run.period}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text)" }}>{run.totalEmployees} staff</td>
                        <td style={{ padding: "14px 18px", fontSize: "13px", fontFamily: "monospace" }}>{fmt(run.grossPayroll)}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13px", fontFamily: "monospace", color: "#dc2626" }}>&minus;{fmt(run.totalDeductions)}</td>
                        <td style={{ padding: "14px 18px", fontSize: "13.5px", fontWeight: 700, color: "#16a34a", fontFamily: "monospace" }}>{fmt(run.netPayroll)}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === "yearly" ? (
          /* Yearly Annual Compensation View */
          <YearlyPayrollView payslips={payslips} onViewSlip={setSelectedSlip} />
        ) : payslips.length === 0 ? (
          /* Empty state */
          <EmptyState
            icon={FileText}
            title="No payslips generated yet"
            subtitle="Your monthly salary statements will appear here once payroll is processed by HR."
          />
        ) : (
          /* Monthly List View */
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {payslips.map((slip) => (
              <PayslipCard key={slip.id} slip={slip} onView={setSelectedSlip} />
            ))}
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedSlip && (
        <PayslipModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
      )}
    </MainLayout>
  );
}
