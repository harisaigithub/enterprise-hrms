/**
 * Organization Management Page � Module 20
 * Tabs: Structure � Locations � Cost Centers � Designations & Grades � Reporting Structure
 */

import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Wallet,
  BadgeCheck,
  Network,
  Plus,
  AlertTriangle,
  History,
  ChevronRight,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import StatusBadge from "../../components/shared/StatusBadge";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import Modal from "../../components/shared/Modal";
import {
  getCompany,
  getBusinessUnits,
  addBusinessUnit,
  getDepartments,
  addDepartment,
  getLocations,
  addLocation,
  deactivateLocation,
  getCostCenters,
  addCostCenter,
  getDesignations,
  addDesignation,
  getGrades,
  addGrade,
  getRoster,
  updateReportingManager,
  bulkReassignDepartment,
  getAuditLog,
} from "../../services/orgManagementService";
import { statusMeta } from "../../mock/orgManagement";

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

/* ---------------------------------- Structure tab ---------------------------------- */

function AddBusinessUnitModal({ isOpen, onClose, company, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);

    try {
      const bu = {
        name: name.trim(),
        companyId: company.id,
      };

      const res = await addBusinessUnit(bu);

      onSaved(res.data);
      onClose();
      setName("");
    } catch (error) {
      console.error("Failed to add business unit:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Business Unit" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12px", color: "var(--subtext)", margin: 0 }}>Belongs to {company.name}.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Add Business Unit"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AddDepartmentModal({ isOpen, onClose, businessUnits, onSaved }) {
  const [name, setName] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !businessUnitId) return;

    setSaving(true);

    try {
      const dept = {
        name: name.trim(),
        businessUnitId,
      };

      const res = await addDepartment(dept);

      onSaved(res.data);
      onClose();

      setName("");
      setBusinessUnitId("");
    } catch (error) {
      console.error("Failed to add department:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Department" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Business Unit *")}
          <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} style={{ ...inputStyle(false), height: "38px", cursor: "pointer" }}>
            <option value="">Select business unit</option>
            {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
          </select>
          <p style={{ fontSize: "10.5px", color: "var(--subtext)", margin: 0 }}>A department must belong to exactly one business unit.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(false)} />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Add Department"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function StructureTab({ company, businessUnits, departments, onBUAdded, onDeptAdded }) {
  const [showBU, setShowBU] = useState(false);
  const [showDept, setShowDept] = useState(false);

  return (
    <div>
      <div style={{ ...cardStyle, padding: "18px 20px", marginBottom: "18px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Company</p>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginTop: "4px" }}>{company.name}</h2>
        <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginTop: "2px" }}>{company.registrationNumber} � {company.country} � {company.currency}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Business Units ? Departments</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <SecondaryButton onClick={() => setShowBU(true)}><Plus size={14} style={{ marginRight: "4px" }} />Business Unit</SecondaryButton>
          <PrimaryButton onClick={() => setShowDept(true)}><Plus size={16} /> Department</PrimaryButton>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {businessUnits.map((bu) => {
          const meta = statusMeta[bu.status];
          const buDepts = departments.filter((d) => d.businessUnitId === bu.id);
          return (
            <div key={bu.id} style={{ ...cardStyle, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Building2 size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{bu.name}</span>
                <StatusBadge label={bu.status} color={meta.color} bg={meta.bg} />
              </div>
              {buDepts.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--subtext)", marginLeft: "24px" }}>No departments yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginLeft: "24px" }}>
                  {buDepts.map((d) => {
                    const dMeta = statusMeta[d.status];
                    return (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <ChevronRight size={13} style={{ color: "var(--subtext)" }} />
                        <span style={{ fontSize: "13px", color: "var(--text)" }}>{d.name}</span>
                        <StatusBadge label={d.status} color={dMeta.color} bg={dMeta.bg} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddBusinessUnitModal isOpen={showBU} onClose={() => setShowBU(false)} company={company} onSaved={onBUAdded} />
      <AddDepartmentModal isOpen={showDept} onClose={() => setShowDept(false)} businessUnits={businessUnits} onSaved={onDeptAdded} />
    </div>
  );
}

/* ---------------------------------- Locations tab ---------------------------------- */

function AddLocationModal({ isOpen, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);

    try {
      const loc = {
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
      };

      const res = await addLocation(loc);

      onSaved(res.data);
      onClose();

      setName("");
      setCity("");
      setCountry("");
    } catch (error) {
      console.error("Failed to add location:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Location" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {fieldLabel("Name *")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bangalore Office" style={inputStyle(false)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("City")}
            <input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle(false)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Country")}
            <input value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Add Location"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function LocationsTab({ locations, onAdded, onUpdated }) {
  const [showAdd, setShowAdd] = useState(false);
  const [errors, setErrors] = useState({});

  const handleDeactivate = async (id) => {
    try {
      const res = await deactivateLocation(id);

      setErrors((p) => ({
        ...p,
        [id]: null,
      }));

      onUpdated(res.data.location || res.data);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to deactivate location.";

      setErrors((p) => ({
        ...p,
        [id]: message,
      }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Locations</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Location</PrimaryButton>
      </div>

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
          {locations.map((l) => {
            const meta = statusMeta[l.status];
            return (
              <div key={l.id} style={{ ...cardStyle, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <p style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text)" }}>{l.name}</p>
                    <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{l.city}{l.city && l.country ? ", " : ""}{l.country}</p>
                  </div>
                  <StatusBadge label={l.status} color={meta.color} bg={meta.bg} />
                </div>
                <p style={{ fontSize: "12px", color: "var(--subtext)", marginTop: "10px" }}>{l.employeeCount} active employee(s) assigned</p>
                {errors[l.id] && (
                  <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "8px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                    <AlertTriangle size={12} style={{ marginTop: "1px", flexShrink: 0 }} /> {errors[l.id]}
                  </p>
                )}
                {l.status === "Active" && (
                  <button onClick={() => handleDeactivate(l.id)} style={{ marginTop: "10px", fontSize: "11.5px", fontWeight: 700, color: "var(--red)", border: "none", background: "none", cursor: "pointer" }}>Deactivate</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddLocationModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={onAdded} />
    </div>
  );
}

/* ---------------------------------- Cost Centers tab ---------------------------------- */

function AddCostCenterModal({ isOpen, onClose, departments, onSaved }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentIds, setDepartmentIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleDept = (id) => setDepartmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim() || !name.trim()) return;

    setSaving(true);

    try {
      const cc = {
        code: code.trim(),
        name: name.trim(),
        departmentIds,
      };

      const res = await addCostCenter(cc);

      onSaved(res.data);
      onClose();

      setCode("");
      setName("");
      setDepartmentIds([]);
    } catch (error) {
      console.error("Failed to add cost center:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Cost Center" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Code *")}
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CC-XXX" style={inputStyle(false)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {fieldLabel("Name *")}
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {fieldLabel("Linked Departments (many-to-many)")}
          {departments.map((d) => (
            <label key={d.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
              <input type="checkbox" checked={departmentIds.includes(d.id)} onChange={() => toggleDept(d.id)} />
              {d.name}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving�" : "Add Cost Center"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function CostCentersTab({ costCenters, departments, onAdded }) {
  const [showAdd, setShowAdd] = useState(false);
  const deptName = (id) => departments.find((d) => d.id === id)?.name || id;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Cost Centers</h2>
        <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={16} /> Add Cost Center</PrimaryButton>
      </div>

      {costCenters.length === 0 ? (
        <EmptyState icon={Wallet} title="No cost centers yet" />
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
                  {["Code", "Name", "Linked Departments", "Status"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costCenters.map((cc, i) => {
                  const meta = statusMeta[cc.status];
                  return (
                    <tr key={cc.id} style={{ borderBottom: i < costCenters.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text)", fontFamily: "monospace" }}>{cc.code}</td>
                      <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{cc.name}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)" }}>{cc.departmentIds.map(deptName).join(", ") || "�"}</td>
                      <td style={{ padding: "13px 16px" }}><StatusBadge label={cc.status} color={meta.color} bg={meta.bg} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCostCenterModal isOpen={showAdd} onClose={() => setShowAdd(false)} departments={departments} onSaved={onAdded} />
    </div>
  );
}

/* ---------------------------------- Designations & Grades tab ---------------------------------- */

function DesignationsGradesTab({
  designations,
  grades,
  onDesignationAdded,
  onGradeAdded,
}) {
  const [newDesignation, setNewDesignation] = useState("");
  const [newGrade, setNewGrade] = useState({
    code: "",
    name: "",
  });

  const handleAddDesignation = async (e) => {
    e.preventDefault();

    if (!newDesignation.trim()) return;

    try {
      const d = {
        title: newDesignation.trim(),
      };

      const res = await addDesignation(d);

      onDesignationAdded(res.data);
      setNewDesignation("");
    } catch (error) {
      console.error("Failed to add designation:", error);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();

    if (!newGrade.code.trim() || !newGrade.name.trim()) return;

    try {
      const g = {
        code: newGrade.code.trim(),
        name: newGrade.name.trim(),
        sortOrder: grades.length + 1,
      };

      const res = await addGrade(g);

      onGradeAdded(res.data);

      setNewGrade({
        code: "",
        name: "",
      });
    } catch (error) {
      console.error("Failed to add grade:", error);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
      }}
    >
      {/* ================= DESIGNATIONS ================= */}

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "12px",
          }}
        >
          Designations
        </h3>

        {designations.map((d, i) => {
          const status = d.isActive ? "Active" : "Inactive";
          const meta = statusMeta[status];

          return (
            <div
              key={d.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderTop:
                  i > 0
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text)",
                }}
              >
                {d.title}
              </span>

              <StatusBadge
                label={status}
                color={meta?.color}
                bg={meta?.bg}
              />
            </div>
          );
        })}

        <form
          onSubmit={handleAddDesignation}
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          <input
            value={newDesignation}
            onChange={(e) =>
              setNewDesignation(e.target.value)
            }
            placeholder="New designation title"
            style={inputStyle(false)}
          />

          <SecondaryButton
            type="submit"
            style={{ whiteSpace: "nowrap" }}
          >
            Add
          </SecondaryButton>
        </form>
      </div>

      {/* ================= GRADES ================= */}

      <div style={{ ...cardStyle, padding: "18px 20px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "12px",
          }}
        >
          Grades
        </h3>

        <p
          style={{
            fontSize: "11px",
            color: "var(--subtext)",
            marginBottom: "10px",
          }}
        >
          Drives default Salary Structure templates and
          Leave Policy applicability.
        </p>

        {[...grades]
          .sort(
            (a, b) =>
              (a.sortOrder ?? 0) -
              (b.sortOrder ?? 0)
          )
          .map((g, i) => {
            const status = g.isActive
              ? "Active"
              : "Inactive";

            const meta = statusMeta[status];

            return (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop:
                    i > 0
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  <strong>{g.code}</strong>
                  {" — "}
                  {g.name}
                </span>

                <StatusBadge
                  label={status}
                  color={meta?.color}
                  bg={meta?.bg}
                />
              </div>
            );
          })}

        <form
          onSubmit={handleAddGrade}
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          <input
            value={newGrade.code}
            onChange={(e) =>
              setNewGrade((p) => ({
                ...p,
                code: e.target.value,
              }))
            }
            placeholder="Code"
            style={{
              ...inputStyle(false),
              width: "80px",
            }}
          />

          <input
            value={newGrade.name}
            onChange={(e) =>
              setNewGrade((p) => ({
                ...p,
                name: e.target.value,
              }))
            }
            placeholder="Name"
            style={inputStyle(false)}
          />

          <SecondaryButton
            type="submit"
            style={{ whiteSpace: "nowrap" }}
          >
            Add
          </SecondaryButton>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------- Reporting Structure tab ---------------------------------- */

function ReassignManagerRow({ employee, roster, departments, onReassign, error }) {
  const [managerId, setManagerId] = useState(employee.managerId || "");
  const manager = roster.find((r) => r.id === employee.managerId);
  const dept = departments.find((d) => d.id === employee.departmentId);

  return (
    <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>{employee.name}</p>
          <p style={{ fontSize: "11.5px", color: "var(--subtext)" }}>{employee.title} � {dept?.name || "�"} � reports to {manager?.name || "� (top of hierarchy)"}</p>

        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} style={{ ...inputStyle(false), height: "32px", fontSize: "12px", width: "160px" }}>
            <option value="">No Manager (top)</option>
            {roster.filter((r) => r.id !== employee.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={() => onReassign(employee.id, managerId)} style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)", border: "none", background: "none", cursor: "pointer" }}>Save</button>
        </div>
      </div>
      {error && (
        <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "6px", display: "flex", alignItems: "flex-start", gap: "4px" }}>
          <AlertTriangle size={12} style={{ marginTop: "1px", flexShrink: 0 }} /> {error}
        </p>
      )}
    </div>
  );
}

function BulkReassignPanel({ roster, departments, onReassigned }) {
  const [selected, setSelected] = useState([]);
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleConfirm = async () => {
    setSaving(true);

    try {
      const res = await bulkReassignDepartment(
        selected,
        newDepartmentId,
      );

      setConfirming(false);

      setResult(
        `Reassigned ${res.data.changedCount} employee(s) — each logged individually in the audit trail.`
      );

      onReassigned(res.data.roster);

      setSelected([]);
    } catch (error) {
      console.error(
        "Bulk department reassignment failed:",
        error
      );

      setResult(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Bulk reassignment failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...cardStyle, padding: "18px 20px", marginTop: "18px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Bulk Reassignment</h3>
      <p style={{ fontSize: "12px", color: "var(--subtext)", marginBottom: "12px" }}>High-blast-radius action � requires explicit confirmation and logs every affected record individually, not just a summary line.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        {roster.map((r) => (
          <label key={r.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--label)", cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            {r.name}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <select value={newDepartmentId} onChange={(e) => setNewDepartmentId(e.target.value)} style={{ ...inputStyle(false), height: "36px", width: "200px" }}>
          <option value="">New department�</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {!confirming ? (
          <PrimaryButton disabled={selected.length === 0 || !newDepartmentId} onClick={() => setConfirming(true)}>Reassign {selected.length || ""} employee(s)</PrimaryButton>
        ) : (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: 600 }}>Confirm reassigning {selected.length} employee(s)?</span>
            <PrimaryButton onClick={handleConfirm} disabled={saving}>{saving ? "Applying�" : "Yes, confirm"}</PrimaryButton>
            <SecondaryButton onClick={() => setConfirming(false)}>Cancel</SecondaryButton>
          </div>
        )}
      </div>
      {result && <p style={{ fontSize: "12px", color: "var(--green)", marginTop: "10px" }}>{result}</p>}
    </div>
  );
}

function AuditLogPanel({ log, roster }) {
  const [open, setOpen] = useState(false);
  const empName = (id) => roster.find((r) => r.id === id)?.name || id;

  return (
    <div style={{ marginTop: "18px" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--subtext)", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
        <History size={14} /> {open ? "Hide" : "Show"} audit trail ({log.length})
      </button>
      {open && (
        <div style={{ ...cardStyle, marginTop: "10px", maxHeight: "220px", overflowY: "auto" }}>
          {log.length === 0 ? (
            <p style={{ padding: "14px 18px", fontSize: "12px", color: "var(--subtext)" }}>No structural changes logged yet.</p>
          ) : (
            log.map((entry) => (
              <div key={entry.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: "12px", color: "var(--text)" }}>
                <strong>{empName(entry.entityId)}</strong>.{entry.field}: {entry.oldValue || "�"} ? {entry.newValue || "�"} � by {entry.actor} � {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ReportingStructureTab({ roster, departments, auditLog, onManagerUpdated, onBulkReassigned }) {
  const [errors, setErrors] = useState({});

  const handleReassign = async (employeeId, newManagerId) => {
    try {
      const res = await updateReportingManager(
        employeeId,
        newManagerId,
      );

      setErrors((p) => ({
        ...p,
        [employeeId]: null,
      }));

      onManagerUpdated(res.data);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update reporting manager.";

      setErrors((p) => ({
        ...p,
        [employeeId]: message,
      }));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Reporting Structure</h2>
      <p style={{ fontSize: "12.5px", color: "var(--subtext)", marginBottom: "16px" }}>Every change is checked for circular reporting relationships before it's applied.</p>

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {roster.map((emp) => (
          <ReassignManagerRow key={emp.id} employee={emp} roster={roster} departments={departments} onReassign={handleReassign} error={errors[emp.id]} />
        ))}
      </div>

      <BulkReassignPanel roster={roster} departments={departments} onReassigned={onBulkReassigned} />
      <AuditLogPanel log={auditLog} roster={roster} />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

const TABS = [
  { key: "structure", label: "Structure", icon: Building2 },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "costCenters", label: "Cost Centers", icon: Wallet },
  { key: "designationsGrades", label: "Designations & Grades", icon: BadgeCheck },
  { key: "reporting", label: "Reporting Structure", icon: Network },
];

export default function OrgManagement() {
  const [activeTab, setActiveTab] = useState("structure");
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [roster, setRoster] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    const loadOrganizationData = async () => {
      setLoading(true);

      try {
        const [
          c,
          bu,
          d,
          l,
          cc,
          ds,
          g,
          r,
          al,
        ] = await Promise.all([
          getCompany(),
          getBusinessUnits(),
          getDepartments(),
          getLocations(),
          getCostCenters(),
          getDesignations(),
          getGrades(),
          getRoster(),
          getAuditLog(),
        ]);

        setCompany(c.data);
        setBusinessUnits(bu.data);
        setDepartments(d.data);
        setLocations(l.data);
        setCostCenters(cc.data);
        setDesignations(ds.data);
        setGrades(g.data);
        setRoster(r.data);
        setAuditLog(al.data);
      } catch (error) {
        console.error(
          "Failed to load organization management data:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationData();
  }, []);

  const refreshAuditLog = () => getAuditLog().then((res) => setAuditLog(res.data));

  const handleManagerUpdated = (emp) => {
    setRoster((prev) => prev.map((r) => (r.id === emp.id ? emp : r)));
    refreshAuditLog();
  };
  const handleBulkReassigned = (newRoster) => {
    setRoster(newRoster);
    refreshAuditLog();
  };

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
        <PageHeader title="Organization Management" subtitle="Company structure, locations, cost centers, and reporting hierarchy" />
        <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "structure" && (
          <StructureTab
            company={company}
            businessUnits={businessUnits}
            departments={departments}
            onBUAdded={(bu) => setBusinessUnits((prev) => [...prev, bu])}
            onDeptAdded={(d) => setDepartments((prev) => [...prev, d])}
          />
        )}

        {activeTab === "locations" && (
          <LocationsTab
            locations={locations}
            onAdded={(l) => setLocations((prev) => [...prev, l])}
            onUpdated={(l) => setLocations((prev) => prev.map((x) => (x.id === l.id ? l : x)))}
          />
        )}

        {activeTab === "costCenters" && (
          <CostCentersTab costCenters={costCenters} departments={departments} onAdded={(cc) => setCostCenters((prev) => [...prev, cc])} />
        )}

        {activeTab === "designationsGrades" && (
          <DesignationsGradesTab
            designations={designations}
            grades={grades}
            onDesignationAdded={(d) => setDesignations((prev) => [...prev, d])}
            onGradeAdded={(g) => setGrades((prev) => [...prev, g])}
          />
        )}

        {activeTab === "reporting" && (
          <ReportingStructureTab
            roster={roster}
            departments={departments}
            auditLog={auditLog}
            onManagerUpdated={handleManagerUpdated}
            onBulkReassigned={handleBulkReassigned}
          />
        )}
      </div>
    </MainLayout>
  );
}