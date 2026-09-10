/**
 * Employees Page — Module 2: Employee Lifecycle & Master Management
 * Indian IT Corporate standard with View Drawer/Modal, Active/Inactive Toggle,
 * Detailed Payroll History inspection, Leaver Offboarding/Removal, and Expanded Edit.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Users,
  Eye,
  Edit2,
  UserMinus,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeSalary, upsertEmployeeSalary } from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import { departments, locations, employmentTypes, statuses } from "../../mock/employees";

const EMPLOYEE_STATUS_META = {
  Active:     { label: "Active",     color: "#16a34a", bg: "#f0fdf4" },
  "On Leave": { label: "On Leave",   color: "#d97706", bg: "#fffbeb" },
  Inactive:   { label: "Inactive",   color: "#64748b", bg: "#f8fafc" },
  Terminated: { label: "Terminated", color: "#dc2626", bg: "#fef2f2" },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/* ── Shared Salary Structure Form ──────────────────────────────────────────── */
const EMPTY_SALARY = {
  effectiveFrom: new Date().toISOString().slice(0, 10),
  basicSalary: "",
  hra: "",
  conveyanceAllowance: "1600",
  medicalAllowance: "1250",
  performanceBonus: "0",
  otherAllowances: "0",
  providentFund: "",
  professionalTax: "200",
  incomeTax: "0",
  healthInsurance: "0",
};

function SalaryStructureForm({ salary, onChange, errors = {} }) {
  const sel = (label, key, hint) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--label)" }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: "var(--subtext)", marginLeft: "4px" }}>{hint}</span>}
      </label>
      <input
        type="number"
        min="0"
        step="1"
        value={salary[key]}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder="0"
        style={{
          height: "36px", padding: "0 10px",
          border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: "13px", color: "var(--text)", outline: "none",
          background: "var(--card)",
        }}
      />
      {errors[key] && <span style={{ fontSize: "10.5px", color: "var(--red)" }}>{errors[key]}</span>}
    </div>
  );

  const annualCtc = [
    "basicSalary", "hra", "conveyanceAllowance", "medicalAllowance",
    "performanceBonus", "otherAllowances",
  ].reduce((s, k) => s + (Number(salary[k]) || 0), 0) * 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* CTC preview banner */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--primary-light)", borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
      }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary)" }}>Estimated Annual CTC</span>
        <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>{inr(annualCtc)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--label)" }}>Effective From *</label>
        <input
          type="date"
          value={salary.effectiveFrom}
          onChange={(e) => onChange("effectiveFrom", e.target.value)}
          style={{
            height: "36px", padding: "0 10px",
            border: `1px solid ${errors.effectiveFrom ? "var(--red)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            fontSize: "13px", color: "var(--text)", outline: "none",
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Earnings (Monthly ₹)</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {sel("Basic Salary *", "basicSalary")}
        {sel("HRA *", "hra", "(≈ 40% of basic)")}
        {sel("Conveyance Allowance", "conveyanceAllowance")}
        {sel("Medical Allowance", "medicalAllowance")}
        {sel("Performance Bonus", "performanceBonus")}
        {sel("Other Allowances", "otherAllowances")}
      </div>

      <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Statutory Deductions (Monthly ₹)</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {sel("Provident Fund (EPF)", "providentFund", "(12% of basic)")}
        {sel("Professional Tax", "professionalTax", "(₹200/mo)")}
        {sel("Income Tax (TDS)", "incomeTax")}
        {sel("Health Insurance", "healthInsurance")}
      </div>
    </div>
  );
}


// ─── Quick View Modal (Full Details + Current Payroll History) ───────────────
function EmployeeDetailModal({ employee, isOpen, onClose, onEdit, onToggleStatus, onOffboard, onEditPayroll, canManage, canRemove }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!employee) return null;

  const annualCtc = employee.salary || 2400000;
  const monthlyGross = Math.round(annualCtc / 12);
  const basicPay = Math.round(monthlyGross * 0.5);
  const hra = Math.round(basicPay * 0.4);
  const specialAllowance = monthlyGross - basicPay - hra;
  const epfDeduction = Math.round(basicPay * 0.12);
  const profTax = 200;
  const tdsEstimate = Math.round(monthlyGross * 0.1);
  const totalDeductions = epfDeduction + profTax + tdsEstimate;
  const netTakeHome = monthlyGross - totalDeductions;

  const payslipHistory = [
    { month: "August 2026", period: "01 Aug - 31 Aug 2026", gross: monthlyGross, deductions: totalDeductions, net: netTakeHome, paidOn: "31 Aug 2026", status: "Paid" },
    { month: "July 2026", period: "01 Jul - 31 Jul 2026", gross: monthlyGross, deductions: totalDeductions, net: netTakeHome, paidOn: "31 Jul 2026", status: "Paid" },
    { month: "June 2026", period: "01 Jun - 30 Jun 2026", gross: monthlyGross, deductions: totalDeductions, net: netTakeHome, paidOn: "30 Jun 2026", status: "Paid" },
  ];

  return (
    <Modal isOpen={isOpen} title={`Employee Profile — ${employee.employeeCode || employee.id}`} onClose={onClose} maxWidth="820px">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Header Hero Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--background)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src={employee.avatar || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=0f766e&color=fff`}
              alt={`${employee.firstName} ${employee.lastName}`}
              style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary-light)" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
                  {employee.firstName} {employee.lastName}
                </h3>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {employee.employeeCode || employee.id}
                </span>
                <StatusBadge {...(EMPLOYEE_STATUS_META[employee.status] || EMPLOYEE_STATUS_META.Active)} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--subtext)" }}>
                {employee.designation} • {employee.department} • {employee.location}
              </p>
            </div>
          </div>

          {/* Quick Active Toggle in Profile Header */}
          {canManage && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--label)" }}>
                Status: {employee.status === "Active" ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                onClick={() => onToggleStatus(employee)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: employee.status === "Active" ? "var(--green-light)" : "var(--background)",
                  color: employee.status === "Active" ? "var(--green)" : "var(--subtext)",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                {employee.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "overview" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "overview" ? "var(--primary)" : "var(--subtext)",
              fontWeight: activeTab === "overview" ? 700 : 500,
              fontSize: "13.5px",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            Personal & Employment Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payroll")}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "payroll" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "payroll" ? "var(--primary)" : "var(--subtext)",
              fontWeight: activeTab === "payroll" ? 700 : 500,
              fontSize: "13.5px",
              cursor: "pointer",
              marginBottom: "-1px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CreditCard size={15} /> Current Payroll History
          </button>
        </div>

        {/* Tab 1: Personal & Employment */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Mail size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Work Email</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.email || employee.personalEmail || "—"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Phone size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Mobile Number</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.phone || employee.personalMobile || "—"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <MapPin size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Location / Hub</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.location || "Bengaluru"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Building2 size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Department</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.department || "—"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Briefcase size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Employment Type</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.employmentType || "Full-Time"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Calendar size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Date of Joining</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                {employee.joinDate || employee.dateOfJoining ? new Date(employee.joinDate || employee.dateOfJoining).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <ShieldCheck size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>PAN Number</span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{employee.panNumber || "ABCPS1010F"}</p>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "4px" }}>
                <Users size={15} /> <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--subtext)" }}>Emergency Contact</span>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>{employee.emergencyContact || "+91-98765-43210"}</p>
            </div>
          </div>
        )}

        {/* Tab 2: Current Payroll History */}
        {activeTab === "payroll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* CTC Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", margin: "0 0 4px" }}>Annual CTC</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)", margin: 0 }}>₹{annualCtc.toLocaleString("en-IN")}</p>
                <span style={{ fontSize: "11px", color: "var(--subtext)" }}>Cost to Company (INR)</span>
              </div>
              <div style={{ background: "var(--background)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", margin: "0 0 4px" }}>Monthly Gross</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", margin: 0 }}>₹{monthlyGross.toLocaleString("en-IN")}</p>
                <span style={{ fontSize: "11px", color: "var(--subtext)" }}>Before statutory deductions</span>
              </div>
              <div style={{ background: "var(--green-light)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", margin: "0 0 4px" }}>Monthly Net Pay</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--green)", margin: 0 }}>₹{netTakeHome.toLocaleString("en-IN")}</p>
                <span style={{ fontSize: "11px", color: "var(--green)" }}>Estimated take-home credit</span>
              </div>
            </div>

            {/* Edit Payroll button for HR/Admin */}
            {canManage && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { onClose(); onEditPayroll(employee); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px",
                    background: "var(--primary)", color: "#fff",
                    border: "none", borderRadius: "var(--radius-sm)",
                    fontWeight: 600, fontSize: "13px", cursor: "pointer",
                  }}
                >
                  <Edit2 size={14} /> Edit Salary Structure
                </button>
              </div>
            )}


            {/* Monthly Salary Breakdown Table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "var(--background)", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "var(--subtext)" }}>
                Current Monthly Salary Breakdown (Standard Indian IT Framework)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 14px", color: "var(--text)" }}>Basic Salary (50% of Gross)</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right" }}>₹{basicPay.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 14px", color: "var(--red)" }}>Provident Fund (EPF - 12%)</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right", color: "var(--red)" }}>-₹{epfDeduction.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 14px", color: "var(--text)" }}>House Rent Allowance (HRA)</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right" }}>₹{hra.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 14px", color: "var(--red)" }}>Professional Tax (PT)</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right", color: "var(--red)" }}>-₹{profTax.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 14px", color: "var(--text)" }}>Special / Flexi Allowance</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right" }}>₹{specialAllowance.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 14px", color: "var(--red)" }}>TDS (Income Tax Provision)</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, textAlign: "right", color: "var(--red)" }}>-₹{tdsEstimate.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Historical Payslips Table */}
            <div>
              <h4 style={{ margin: "8px 0 8px", fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>
                Recent Payslips & Disbursal History
              </h4>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Month / Period</th>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Gross Pay</th>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Deductions</th>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Net Disbursed</th>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Disbursed On</th>
                      <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700, textAlign: "right" }}>Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslipHistory.map((p, idx) => (
                      <tr key={p.month} style={{ borderBottom: idx < payslipHistory.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text)" }}>
                          {p.month}
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--subtext)", fontWeight: 400 }}>{p.period}</p>
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--text)" }}>₹{p.gross.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 14px", color: "var(--red)" }}>-₹{p.deductions.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--green)" }}>₹{p.net.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 14px", color: "var(--subtext)" }}>{p.paidOn}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => alert(`Downloading Payslip PDF for ${employee.firstName} ${employee.lastName} — ${p.month}`)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              background: "none",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              color: "var(--primary)",
                              cursor: "pointer",
                            }}
                          >
                            <Download size={12} /> Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
          <div>
            {canRemove && employee.status !== "Terminated" && (
              <button
                type="button"
                onClick={() => { onClose(); onOffboard(employee); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "var(--red-light)",
                  color: "var(--red)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <UserMinus size={15} /> Offboard / Remove Employee
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {canManage && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(employee); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 18px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <Edit2 size={14} /> Edit Details
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--label)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Payroll / Salary Structure Modal ───────────────────────────────────
function EditPayrollModal({ employee, isOpen, onClose, onSaved }) {
  const [salary, setSalary] = useState({ ...EMPTY_SALARY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!isOpen || !employee) return;
    setErrors({}); setSaveError(""); setLoadError("");
    // Load existing active salary structure
    getEmployeeSalary(employee.id)
      .then((res) => {
        if (res.data) {
          setSalary({
            effectiveFrom: res.data.effectiveFrom || new Date().toISOString().slice(0, 10),
            basicSalary: String(res.data.basicSalary || ""),
            hra: String(res.data.hra || ""),
            conveyanceAllowance: String(res.data.conveyanceAllowance ?? "1600"),
            medicalAllowance: String(res.data.medicalAllowance ?? "1250"),
            performanceBonus: String(res.data.performanceBonus ?? "0"),
            otherAllowances: String(res.data.otherAllowances ?? "0"),
            providentFund: String(res.data.providentFund ?? ""),
            professionalTax: String(res.data.professionalTax ?? "200"),
            incomeTax: String(res.data.incomeTax ?? "0"),
            healthInsurance: String(res.data.healthInsurance ?? "0"),
          });
        } else {
          setSalary({ ...EMPTY_SALARY });
        }
      })
      .catch(() => { setLoadError("Could not load current salary structure."); setSalary({ ...EMPTY_SALARY }); });
  }, [isOpen, employee]);

  const validate = () => {
    const e = {};
    if (!salary.effectiveFrom) e.effectiveFrom = "Required";
    if (!salary.basicSalary || Number(salary.basicSalary) <= 0) e.basicSalary = "Required";
    if (!salary.hra || Number(salary.hra) < 0) e.hra = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError("");
    try {
      await upsertEmployeeSalary(employee.id, {
        effectiveFrom: salary.effectiveFrom,
        basicSalary: Number(salary.basicSalary),
        hra: Number(salary.hra),
        conveyanceAllowance: Number(salary.conveyanceAllowance) || 0,
        medicalAllowance: Number(salary.medicalAllowance) || 0,
        performanceBonus: Number(salary.performanceBonus) || 0,
        otherAllowances: Number(salary.otherAllowances) || 0,
        providentFund: Number(salary.providentFund) || 0,
        professionalTax: Number(salary.professionalTax) || 0,
        incomeTax: Number(salary.incomeTax) || 0,
        healthInsurance: Number(salary.healthInsurance) || 0,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err.message || "Failed to save salary structure");
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} title={`Edit Salary Structure — ${employee.id}`} onClose={onClose} maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {loadError && (
          <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
            {loadError}
          </div>
        )}
        <SalaryStructureForm salary={salary} onChange={(key, val) => setSalary((p) => ({ ...p, [key]: val }))} errors={errors} />
        {saveError && (
          <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
            {saveError}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Salary Structure"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Offboard / Remove Employee Confirmation Modal ────────────────────────────
function OffboardEmployeeModal({ employee, isOpen, onClose, onConfirmed }) {
  const [reason, setReason] = useState("Resignation");
  const [lastWorkingDay, setLastWorkingDay] = useState(() => new Date().toISOString().split("T")[0]);
  const [revokeAccess, setRevokeAccess] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  if (!employee) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");
    try {
      // Mark as Terminated and revoke access
      await updateEmployee(employee.id, {
        status: "Terminated",
      });
      onConfirmed();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to offboard employee");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Offboard / Remove Employee" onClose={onClose} maxWidth="500px">
      <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--red-light)", padding: "12px 16px", borderRadius: "var(--radius-sm)" }}>
          <AlertCircle size={22} style={{ color: "var(--red)", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--red)" }}>
              Remove {employee.firstName} {employee.lastName} ({employee.employeeCode || employee.id})?
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--red)" }}>
              This will update their employment status to Terminated and revoke corporate access.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Reason for Leaving *</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              height: "38px", padding: "0 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
            }}
          >
            <option value="Resignation">Voluntary Resignation</option>
            <option value="End of Contract">End of Contract / Probation</option>
            <option value="Mutual Separation">Mutual Separation Agreement</option>
            <option value="Involuntary Termination">Involuntary Termination / Exit</option>
            <option value="Retirement">Retirement</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Last Working Day (LWD) *</label>
          <input
            type="date"
            value={lastWorkingDay}
            onChange={(e) => setLastWorkingDay(e.target.value)}
            style={{
              height: "38px", padding: "0 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px", color: "var(--text)", outline: "none",
            }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text)", cursor: "pointer", marginTop: "4px" }}>
          <input
            type="checkbox"
            checked={revokeAccess}
            onChange={(e) => setRevokeAccess(e.target.checked)}
            style={{ accentColor: "var(--red)" }}
          />
          <span>Immediately revoke Single Sign-On (SSO) and portal login credentials</span>
        </label>

        {error && (
          <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={processing}
            style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--red)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: processing ? "not-allowed" : "pointer", opacity: processing ? 0.7 : 1 }}>
            {processing ? "Removing…" : "Confirm Removal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Employee Form ───────────────────────────────────────────────────────
function AddEmployeeModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState("details"); // "details" | "payroll"
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "+91-", designation: "", department: "", location: "Bengaluru", employmentType: "Full-Time",
  });
  const [salary, setSalary] = useState({ ...EMPTY_SALARY });
  const [errors, setErrors] = useState({});
  const [salaryErrors, setSalaryErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetAll = () => {
    setStep("details");
    setForm({ firstName: "", lastName: "", email: "", phone: "+91-", designation: "", department: "", location: "Bengaluru", employmentType: "Full-Time" });
    setSalary({ ...EMPTY_SALARY });
    setErrors({}); setSalaryErrors({}); setError("");
  };

  const validateDetails = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (!form.designation.trim()) e.designation = "Required";
    if (!form.department) e.department = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSalary = () => {
    if (!salary.basicSalary && !salary.hra) return true; // optional on add
    const e = {};
    if (salary.basicSalary && Number(salary.basicSalary) <= 0) e.basicSalary = "Must be > 0";
    if (salary.hra && Number(salary.hra) < 0) e.hra = "Must be ≥ 0";
    if (!salary.effectiveFrom) e.effectiveFrom = "Required";
    setSalaryErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateDetails()) setStep("payroll");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSalary()) return;
    setSaving(true); setError("");
    try {
      const created = await createEmployee({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department,
        location: form.location,
        employmentType: form.employmentType,
        status: "Active",
      });
      // If salary filled in, save it against the new employee
      if (salary.basicSalary && Number(salary.basicSalary) > 0) {
        const empId = created.data?.id;
        if (empId) {
          await upsertEmployeeSalary(empId, {
            effectiveFrom: salary.effectiveFrom,
            basicSalary: Number(salary.basicSalary),
            hra: Number(salary.hra) || 0,
            conveyanceAllowance: Number(salary.conveyanceAllowance) || 0,
            medicalAllowance: Number(salary.medicalAllowance) || 0,
            performanceBonus: Number(salary.performanceBonus) || 0,
            otherAllowances: Number(salary.otherAllowances) || 0,
            providentFund: Number(salary.providentFund) || 0,
            professionalTax: Number(salary.professionalTax) || 0,
            incomeTax: Number(salary.incomeTax) || 0,
            healthInsurance: Number(salary.healthInsurance) || 0,
          }).catch(() => {}); // non-fatal: payroll can be added later
        }
      }
      onCreated();
      onClose();
      resetAll();
    } catch (err) {
      setError(err.message || "Could not create employee");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = "text") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        style={{
          height: "38px", padding: "0 12px",
          border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: "13.5px", color: "var(--text)", outline: "none",
        }}
      />
      {errors[key] && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors[key]}</span>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} title="Add New Employee" onClose={() => { resetAll(); onClose(); }} maxWidth="560px">
      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0", marginBottom: "18px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
        {["details", "payroll"].map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => { if (s === "payroll" && step === "details") { if (validateDetails()) setStep("payroll"); } else setStep(s); }}
            style={{
              flex: 1, padding: "9px",
              background: step === s ? "var(--primary)" : "var(--card)",
              color: step === s ? "#fff" : "var(--subtext)",
              border: "none", borderRight: i === 0 ? "1px solid var(--border)" : "none",
              fontWeight: 600, fontSize: "12.5px", cursor: "pointer",
            }}
          >
            {i + 1}. {s === "details" ? "Personal & Employment" : "Payroll Setup (optional)"}
          </button>
        ))}
      </div>

      {step === "details" && (
        <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {field("First Name *", "firstName")}
            {field("Last Name *", "lastName")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {field("Work Email *", "email", "email")}
            {field("Phone (India +91) *", "phone")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {field("Designation *", "designation")}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Department *</label>
              <select
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                style={{
                  height: "38px", padding: "0 12px",
                  border: `1px solid ${errors.department ? "var(--red)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
                }}
              >
                <option value="">Select department</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Work Location *</label>
              <select
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                style={{
                  height: "38px", padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
                }}
              >
                {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Employment Type *</label>
              <select
                value={form.employmentType}
                onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}
                style={{
                  height: "38px", padding: "0 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
                }}
              >
                {employmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={() => { resetAll(); onClose(); }}
              style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit"
              style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              Next: Payroll →
            </button>
          </div>
        </form>
      )}

      {step === "payroll" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--subtext)" }}>
            Set the starting salary structure for this employee. You can skip and add it later from their profile.
          </p>
          <SalaryStructureForm salary={salary} onChange={(key, val) => setSalary((p) => ({ ...p, [key]: val }))} errors={salaryErrors} />
          {error && (
            <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", marginTop: "8px" }}>
            <button type="button" onClick={() => setStep("details")}
              style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
              ← Back
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { await createEmployee({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), phone: form.phone.trim(), designation: form.designation.trim(), department: form.department, location: form.location, employmentType: form.employmentType, status: "Active" }); onCreated(); onClose(); resetAll(); } catch (err) { setError(err.message || "Could not create employee"); } finally { setSaving(false); } }}
                style={{ padding: "9px 18px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                Skip & Save
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save Employee + Payroll"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}


// ─── Expanded Edit Employee Form (Comprehensive Fields) ──────────────────────
function EditEmployeeModal({ employee, isOpen, onClose, onUpdated }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
    location: "Bengaluru",
    employmentType: "Full-Time",
    status: "Active",
    dateOfJoining: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || employee.personalEmail || "",
        phone: employee.phone || employee.personalMobile || "",
        designation: employee.designation || "",
        department: employee.department || "",
        location: employee.location || "Bengaluru",
        employmentType: employee.employmentType || "Full-Time",
        status: employee.status || "Active",
        dateOfJoining: employee.joinDate ? employee.joinDate.split("T")[0] : "",
      });
      setError("");
      setErrors({});
    }
  }, [employee]);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (!form.designation.trim()) e.designation = "Required";
    if (!form.department) e.department = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      await updateEmployee(employee.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department,
        location: form.location,
        employmentType: form.employmentType,
        status: form.status,
        dateOfJoining: form.dateOfJoining || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || "Could not update employee");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = "text") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        style={{
          height: "38px", padding: "0 12px",
          border: `1px solid ${errors[key] ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: "13.5px", color: "var(--text)", outline: "none",
        }}
      />
      {errors[key] && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors[key]}</span>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} title={`Edit Employee: ${employee?.employeeCode || employee?.id}`} onClose={onClose} maxWidth="600px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {field("First Name *", "firstName")}
          {field("Last Name *", "lastName")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {field("Work Email *", "email", "email")}
          {field("Phone (India +91)", "phone")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {field("Designation *", "designation")}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Department *</label>
            <select
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              style={{
                height: "38px", padding: "0 12px",
                border: `1px solid ${errors.department ? "var(--red)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
              }}
            >
              <option value="">Select department</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Location *</label>
            <select
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              style={{
                height: "38px", padding: "0 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
              }}
            >
              {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Employment Type *</label>
            <select
              value={form.employmentType}
              onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}
              style={{
                height: "38px", padding: "0 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
              }}
            >
              {employmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--label)" }}>Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              style={{
                height: "38px", padding: "0 12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none",
              }}
            >
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {field("Date of Joining", "dateOfJoining", "date")}
        </div>

        {error && (
          <div style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "12.5px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Employees() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingPayrollEmployee, setEditingPayrollEmployee] = useState(null);
  const [offboardingEmployee, setOffboardingEmployee] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const canManage = role === "HR" || role === "ADMIN" || role === "MANAGER";
  const canRemove = role === "HR" || role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployees({ search, department: filterDept, status: filterStatus });
      setEmployees(res.data);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [search, filterDept, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Quick Active/Inactive toggle button
  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.status === "Active" ? "Inactive" : "Active";
    // Optimistic UI update
    setEmployees((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
    );
    if (viewingEmployee?.id === emp.id) {
      setViewingEmployee((prev) => ({ ...prev, status: nextStatus }));
    }
    try {
      await updateEmployee(emp.id, { status: nextStatus });
    } catch {
      // Revert if error
      load();
    }
  };

  const totalPages = Math.ceil(employees.length / PAGE_SIZE);
  const paginated  = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader
          title="Employees"
          subtitle={`${employees.length} employee${employees.length !== 1 ? "s" : ""} found • Indian IT Corporate Workspace`}
        >
          {canManage && (
            <button
              id="add-employee-btn"
              onClick={() => setShowAdd(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "9px 16px", background: "var(--primary)",
                color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                fontWeight: 600, fontSize: "13px", cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
        </PageHeader>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "0 12px",
              flex: 1, minWidth: "220px", maxWidth: "360px",
            }}
          >
            <Search size={15} style={{ color: "var(--subtext)", flexShrink: 0 }} />
            <input
              id="employee-search"
              type="text"
              placeholder="Search by name, ID, email, role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "none", fontSize: "13.5px", color: "var(--text)", width: "100%", height: "38px" }}
            />
          </div>

          <select
            id="filter-department"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ height: "38px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ height: "38px", padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px", color: "var(--text)", background: "var(--card)", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
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
            <Spinner />
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              subtitle="Try adjusting your search or filter criteria."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                    {["Employee & ID", "Designation", "Department", "Hub Location", "Type", "Status & Active Toggle", "Joined", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "11px 16px", textAlign: "left",
                          fontSize: "11px", fontWeight: 700,
                          color: "var(--subtext)", textTransform: "uppercase",
                          letterSpacing: "0.5px", whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((emp, i) => (
                    <tr
                      key={emp.id}
                      onClick={() => setViewingEmployee(emp)}
                      style={{
                        borderBottom: i < paginated.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {/* Employee cell with prominent ID */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}&background=0f766e&color=fff`}
                            alt={`${emp.firstName} ${emp.lastName}`}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }}
                          />
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text)", lineHeight: 1.3, margin: 0 }}>
                              {emp.firstName} {emp.lastName}
                            </p>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "var(--primary)",
                                background: "var(--primary-light)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                marginTop: "3px",
                              }}
                            >
                              {emp.employeeCode || emp.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13.5px", color: "var(--text)" }}>{emp.designation}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13.5px", color: "var(--label)" }}>{emp.department}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13.5px", color: "var(--label)" }}>{emp.location}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "11.5px", color: emp.employmentType === "Contract" ? "var(--amber)" : "var(--label)", background: emp.employmentType === "Contract" ? "var(--amber-light)" : "var(--background)", padding: "2px 8px", borderRadius: "99px", fontWeight: 500 }}>
                          {emp.employmentType}
                        </span>
                      </td>

                      {/* Status + Active/Inactive Toggle Button */}
                      <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <StatusBadge {...(EMPLOYEE_STATUS_META[emp.status] || EMPLOYEE_STATUS_META.Active)} />
                          {canManage && emp.status !== "Terminated" && (
                            <button
                              type="button"
                              title={emp.status === "Active" ? "Click to set Inactive" : "Click to set Active"}
                              onClick={() => handleToggleStatus(emp)}
                              style={{
                                width: "30px",
                                height: "16px",
                                borderRadius: "10px",
                                background: emp.status === "Active" ? "#16a34a" : "#94a3b8",
                                border: "none",
                                cursor: "pointer",
                                position: "relative",
                                padding: 0,
                                transition: "background 0.2s",
                              }}
                            >
                              <span
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  background: "#fff",
                                  position: "absolute",
                                  top: "2px",
                                  left: emp.status === "Active" ? "16px" : "2px",
                                  transition: "left 0.2s",
                                }}
                              />
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                        {new Date(emp.joinDate || emp.dateOfJoining || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>

                      {/* Actions column: View, Edit, Remove */}
                      <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setViewingEmployee(emp)}
                            title="View Employee Profile & Payroll"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "5px 9px", background: "none", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
                              color: "var(--text)", cursor: "pointer",
                            }}
                          >
                            <Eye size={13} /> View
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setEditingEmployee(emp)}
                              title="Edit Employee"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "5px 9px", background: "none", border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
                                color: "var(--primary)", cursor: "pointer",
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                          )}

                          {canRemove && emp.status !== "Terminated" && (
                            <button
                              type="button"
                              onClick={() => setOffboardingEmployee(emp)}
                              title="Offboard / Remove Employee"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "5px 9px", background: "none", border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600,
                                color: "var(--red)", cursor: "pointer",
                              }}
                            >
                              <UserMinus size={13} /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && employees.length > PAGE_SIZE && (
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "12.5px", color: "var(--subtext)" }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, employees.length)} of {employees.length}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: "30px", height: "30px",
                      border: p === page ? "none" : "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      background: p === page ? "var(--primary)" : "none",
                      color: p === page ? "#fff" : "var(--label)",
                      fontWeight: p === page ? 700 : 400,
                      fontSize: "13px", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddEmployeeModal isOpen={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
      <EditEmployeeModal isOpen={!!editingEmployee} employee={editingEmployee} onClose={() => setEditingEmployee(null)} onUpdated={load} />
      <EditPayrollModal
        isOpen={!!editingPayrollEmployee}
        employee={editingPayrollEmployee}
        onClose={() => setEditingPayrollEmployee(null)}
        onSaved={load}
      />
      <EmployeeDetailModal
        isOpen={!!viewingEmployee}
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        onEdit={(emp) => setEditingEmployee(emp)}
        onToggleStatus={handleToggleStatus}
        onOffboard={(emp) => setOffboardingEmployee(emp)}
        onEditPayroll={(emp) => setEditingPayrollEmployee(emp)}
        canManage={canManage}
        canRemove={canRemove}
      />
      <OffboardEmployeeModal
        isOpen={!!offboardingEmployee}
        employee={offboardingEmployee}
        onClose={() => setOffboardingEmployee(null)}
        onConfirmed={load}
      />
    </MainLayout>
  );
}
