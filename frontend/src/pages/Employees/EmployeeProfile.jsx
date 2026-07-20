/**
 * Employee Profile Page
 * Route: /employees/:id
 * Tabs: Personal, Employment, Payroll (future: Documents, Assets, Leave history)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, Briefcase } from "lucide-react";
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

          {activeTab === "payroll" && (
            <div>
              <p style={{ fontSize: "13.5px", color: "var(--subtext)", marginBottom: "16px" }}>Salary details are visible to authorised HR personnel only.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                {[
                  { label: "Annual CTC", value: `$${employee.salary?.toLocaleString() ?? "—"}` },
                  { label: "Monthly Gross", value: `$${Math.round(employee.salary / 12)?.toLocaleString() ?? "—"}` },
                ].map((item) => (
                  <div key={item.label} style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>{item.label}</p>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
