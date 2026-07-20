/**
 * Employees Page
 * Module 2 — Employee Management
 * Features: searchable/filterable table, Add Employee modal, status badges,
 *           click-through to employee profile (/employees/:id)
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Users } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import { getEmployees } from "../../services/employeeService";
import { departments, statuses } from "../../mock/employees";

const EMPLOYEE_STATUS_META = {
  Active:     { label: "Active",     color: "#16a34a", bg: "#f0fdf4" },
  "On Leave": { label: "On Leave",   color: "#d97706", bg: "#fffbeb" },
  Inactive:   { label: "Inactive",   color: "#64748b", bg: "#f8fafc" },
  Terminated: { label: "Terminated", color: "#dc2626", bg: "#fef2f2" },
};

// ─── Add Employee Form (minimal; expands in a later sprint) ─────────────────
function AddEmployeeModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", designation: "", department: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
    await new Promise((r) => setTimeout(r, 600)); // simulate API
    setSaving(false);
    onClose();
    setForm({ firstName: "", lastName: "", email: "", designation: "", department: "" });
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
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
        onBlur={(e) => (e.target.style.borderColor = errors[key] ? "var(--red)" : "var(--border)")}
      />
      {errors[key] && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors[key]}</span>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} title="Add New Employee" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {field("First Name *", "firstName")}
          {field("Last Name *", "lastName")}
        </div>
        {field("Work Email *", "email", "email")}
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
              fontSize: "13.5px", color: "var(--text)",
              background: "var(--card)", outline: "none",
            }}
          >
            <option value="">Select department</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <span style={{ fontSize: "11px", color: "var(--red)" }}>{errors.department}</span>}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "9px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "none", color: "var(--label)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: "9px 20px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Add Employee"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

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

  const totalPages = Math.ceil(employees.length / PAGE_SIZE);
  const paginated  = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader
          title="Employees"
          subtitle={`${employees.length} employee${employees.length !== 1 ? "s" : ""} found`}
        >
          <button
            id="add-employee-btn"
            onClick={() => setShowAdd(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 600, fontSize: "13px", cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
          >
            <Plus size={16} /> Add Employee
          </button>
        </PageHeader>

        {/* Filters */}
        <div
          style={{
            display: "flex", gap: "12px", marginBottom: "20px",
            flexWrap: "wrap", alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: "380px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--subtext)", pointerEvents: "none" }} />
            <input
              id="employee-search"
              type="text"
              placeholder="Search by name, email, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", height: "38px",
                paddingLeft: "36px", paddingRight: "12px",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                fontSize: "13.5px", color: "var(--text)", outline: "none",
                background: "var(--card)", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <Filter size={16} style={{ color: "var(--subtext)" }} />

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
                    {["Employee", "Designation", "Department", "Location", "Type", "Status", "Joined"].map((h) => (
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
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      style={{
                        borderBottom: i < paginated.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {/* Employee cell */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img src={emp.avatar} alt={`${emp.firstName} ${emp.lastName}`}
                            style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text)", lineHeight: 1.3 }}>
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{emp.id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13.5px", color: "var(--text)" }}>{emp.designation}</td>
                      <td style={{ padding: "14px 16px", fontSize: "13.5px", color: "var(--label)" }}>{emp.department}</td>
                      <td style={{ padding: "14px 16px", fontSize: "13.5px", color: "var(--label)" }}>{emp.location}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: "11.5px", color: emp.employmentType === "Contract" ? "var(--amber)" : "var(--label)", background: emp.employmentType === "Contract" ? "var(--amber-light)" : "var(--background)", padding: "2px 8px", borderRadius: "99px", fontWeight: 500 }}>
                          {emp.employmentType}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge {...(EMPLOYEE_STATUS_META[emp.status] || EMPLOYEE_STATUS_META.Active)} />
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "12.5px", color: "var(--subtext)", whiteSpace: "nowrap" }}>
                        {new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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

      <AddEmployeeModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </MainLayout>
  );
}
