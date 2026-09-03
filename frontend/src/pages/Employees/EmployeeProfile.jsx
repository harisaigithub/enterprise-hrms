/**
 * Employee Profile Page
 * Route: /employees/:id
 * Tabs: Personal, Employment, Payroll (future: Documents, Assets, Leave history)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, Briefcase, Download } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import { getEmployee } from "../../services/employeeService";

const EMPLOYEE_STATUS_META = {
  Active:     { label: "Active",     color: "#16a34a", bg: "#f0fdf4" },
  "On Leave": { label: "On Leave",   color: "#d97706", bg: "#fffbeb" },
  Inactive:   { label: "Inactive",   color: "#64748b", bg: "#f8fafc" },
  Terminated: { label: "Terminated", color: "#dc2626", bg: "#fef2f2" },
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} style={{ color: "var(--primary)" }} />
      </div>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</p>
        <p style={{ fontSize: "14px", color: "var(--text)", marginTop: "2px" }}>{value || "—"}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    getEmployee(id)
      .then((res) => setEmployee(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MainLayout><Spinner /></MainLayout>;
  if (error) return (
    <MainLayout>
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--red)", fontWeight: 600 }}>{error}</p>
        <button onClick={() => navigate("/employees")} style={{ marginTop: "16px", padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}>
          Back to Employees
        </button>
      </div>
    </MainLayout>
  );

  const tabs = [
    { id: "personal",    label: "Personal Info" },
    { id: "employment",  label: "Employment" },
    { id: "payroll",     label: "Payroll" },
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/employees")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--subtext)", fontSize: "13.5px", fontWeight: 500, marginBottom: "20px", padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Employees
        </button>

        {/* Profile header card */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            padding: "28px",
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <img
            src={employee.avatar}
            alt={`${employee.firstName} ${employee.lastName}`}
            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)" }}>
                {employee.firstName} {employee.lastName}
              </h1>
              <StatusBadge {...(EMPLOYEE_STATUS_META[employee.status] || EMPLOYEE_STATUS_META.Active)} />
            </div>
            <p style={{ fontSize: "14px", color: "var(--subtext)", marginBottom: "4px" }}>{employee.designation}</p>
            <p style={{ fontSize: "12.5px", color: "var(--label)" }}>{employee.department} · {employee.id}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--subtext)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "color 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "28px" }}>
          {activeTab === "personal" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              <InfoRow icon={Mail}      label="Email"         value={employee.email} />
              <InfoRow icon={Phone}     label="Phone"         value={employee.phone} />
              <InfoRow icon={MapPin}    label="Location"      value={employee.location} />
              <InfoRow icon={Calendar}  label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
            </div>
          )}

          {activeTab === "employment" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
              <InfoRow icon={Briefcase} label="Designation"      value={employee.designation} />
              <InfoRow icon={Building2} label="Department"       value={employee.department} />
              <InfoRow icon={Calendar}  label="Join Date"        value={new Date(employee.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
              <InfoRow icon={Briefcase} label="Employment Type"  value={employee.employmentType} />
            </div>
          )}

          {activeTab === "payroll" && (() => {
            const annualCtc = employee.salary || 2400000;
            const monthlyGross = Math.round(annualCtc / 12);
            const basicPay = Math.round(monthlyGross * 0.5);
            const hra = Math.round(basicPay * 0.4);
            const specialAllowance = monthlyGross - basicPay - hra;
            const epf = Math.round(basicPay * 0.12);
            const pt = 200;
            const tds = Math.round(monthlyGross * 0.1);
            const deductions = epf + pt + tds;
            const net = monthlyGross - deductions;

            const payslips = [
              { month: "August 2026", period: "01 Aug - 31 Aug 2026", gross: monthlyGross, deductions, net, paidOn: "31 Aug 2026" },
              { month: "July 2026", period: "01 Jul - 31 Jul 2026", gross: monthlyGross, deductions, net, paidOn: "31 Jul 2026" },
              { month: "June 2026", period: "01 Jun - 30 Jun 2026", gross: monthlyGross, deductions, net, paidOn: "30 Jun 2026" },
            ];

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p style={{ fontSize: "13.5px", color: "var(--subtext)", margin: 0 }}>
                  Salary details and payslip records for employee code <strong>{employee.employeeCode || employee.id}</strong>.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                  <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>Annual CTC</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>₹{annualCtc.toLocaleString("en-IN")}</p>
                  </div>
                  <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>Monthly Gross</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>₹{monthlyGross.toLocaleString("en-IN")}</p>
                  </div>
                  <div style={{ background: "var(--green-light)", borderRadius: "var(--radius)", padding: "16px", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>Estimated Net Pay</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--green)" }}>₹{net.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Payslip History */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Historical Payslips</h4>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Month / Pay Period</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Gross Pay</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Deductions</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Net Disbursed</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700 }}>Disbursed On</th>
                          <th style={{ padding: "10px 14px", color: "var(--subtext)", fontWeight: 700, textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payslips.map((p, idx) => (
                          <tr key={p.month} style={{ borderBottom: idx < payslips.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text)" }}>
                              {p.month}
                              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--subtext)", fontWeight: 400 }}>{p.period}</p>
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--text)" }}>₹{p.gross.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px", color: "var(--red)" }}>-₹{p.deductions.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--green)" }}>₹{p.net.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 14px", color: "var(--subtext)" }}>{p.paidOn}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => alert(`Downloading Payslip for ${p.month}`)}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  padding: "5px 10px", background: "none", border: "1px solid var(--border)",
                                  borderRadius: "4px", fontSize: "12px", fontWeight: 600, color: "var(--primary)", cursor: "pointer",
                                }}
                              >
                                <Download size={12} /> Payslip PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </MainLayout>
  );
}
