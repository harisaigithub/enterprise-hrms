/**
 * Reports & Analytics Page — Module 22
 * Tabs: Standard Reports (pre-built templates), Custom Builder (approved
 * field catalog only). Scope filtering, small-cell suppression, and field
 * validation are enforced in reportsService.js — this page just renders
 * whatever the service already decided is safe to show.
 */

import { useState, useEffect } from "react";
import { Play, Download, AlertTriangle, Lock, Clock } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import PageHeader from "../../components/shared/PageHeader";
import Spinner from "../../components/shared/Spinner";
import EmptyState from "../../components/shared/EmptyState";
import {
  getReportTemplates, getOrgScope, runStandardReport, getRecruitmentSnapshot,
  getFieldCatalog, runCustomReport, exportReportCsv,
} from "../../services/reportsService";
import { DEPARTMENTS, LOCATIONS, ROLES } from "../../mock/reports";

const classificationColor = { L1: "#64748b", L2: "#0284c7", L3: "#d97706", L4: "#dc2626" };
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function DataAsOfBanner({ dataAsOf, stale }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: stale ? "var(--red)" : "var(--subtext)", marginBottom: "14px" }}>
      <Clock size={13} />
      Data as of {fmtDateTime(dataAsOf)}{stale && " — refresh pending"}
    </div>
  );
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportResultTable({ output, groupLabel, columns }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{groupLabel}</th>
              <th style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>n</th>
              {columns.map((c) => (
                <th key={c} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {output.rows.map((row, i) => (
              <tr key={row.department || row.group} style={{ borderBottom: i < output.rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{row.department || row.group}</td>
                <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--subtext)" }}>{row.n}</td>
                {row.suppressed ? (
                  <td colSpan={columns.length} style={{ padding: "13px 16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--red)", fontWeight: 600 }}>
                      <Lock size={12} /> {row.suppressionMessage}
                    </span>
                  </td>
                ) : columns.length === 1 ? (
                  <td style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{row.value}</td>
                ) : (
                  columns.map((c, ci) => (
                    <td key={c} style={{ padding: "13px 16px", fontSize: "13.5px", color: "var(--text)", fontWeight: 600 }}>{Object.values(row.metrics)[ci]}</td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandardReportsTab({ role }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [location, setLocation] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState(null);

  useEffect(() => {
    setOutput(null);
    Promise.all([getReportTemplates(role), getOrgScope(role)]).then(([tRes, sRes]) => {
      setTemplates(tRes.data);
      setScope(sRes.data);
      setSelectedId(tRes.data[0]?.id || "");
      setDepartments(sRes.data.departments);
    });
  }, [role]);

  const runReport = async () => {
    setLoading(true);
    const res = await runStandardReport(selectedId, { departments, location }, role);
    setOutput(res.data);
    setLoading(false);
  };

  const toggleDept = (d) => {
    setDepartments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: "20px", alignItems: "start" }}>
      <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "10px" }}>
        {templates.map((t) => (
          <button key={t.id} onClick={() => { setSelectedId(t.id); setOutput(null); }}
            style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius)", cursor: "pointer",
              border: selectedId === t.id ? "1px solid var(--primary)" : "1px solid transparent",
              background: selectedId === t.id ? "var(--primary-light)" : "transparent",
              fontSize: "13px", fontWeight: selectedId === t.id ? 700 : 500,
              color: selectedId === t.id ? "var(--primary)" : "var(--text)",
            }}>
            {t.name}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {scope && (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "16px 18px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Filters</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: "11.5px", color: "var(--label)", marginBottom: "6px" }}>Department (scope: {scope.departments.join(", ")})</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {DEPARTMENTS.map((d) => {
                    const inScope = scope.departments.includes(d);
                    return (
                      <label key={d} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: inScope ? "var(--text)" : "var(--subtext)", cursor: inScope ? "pointer" : "not-allowed", opacity: inScope ? 1 : 0.5 }}>
                        <input type="checkbox" disabled={!inScope} checked={departments.includes(d)} onChange={() => toggleDept(d)} />
                        {d}{!inScope && <Lock size={10} />}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ fontSize: "11.5px", color: "var(--label)", marginBottom: "6px" }}>Location</p>
                <select value={location} onChange={(e) => setLocation(e.target.value)}
                  style={{ height: "34px", padding: "0 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", background: "var(--card)" }}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button id="run-report-btn" onClick={runReport} disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: loading ? "not-allowed" : "pointer" }}>
                <Play size={14} /> {loading ? "Running…" : "Run Report"}
              </button>
            </div>
            {scope.departments.length < DEPARTMENTS.length && (
              <p style={{ fontSize: "11px", color: "var(--subtext)", marginTop: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Lock size={10} /> Departments outside your reporting line are locked — this is enforced server-side, not just hidden here.
              </p>
            )}
          </div>
        )}

        {loading && <Spinner />}

        {output && !loading && (
          <div>
            <DataAsOfBanner dataAsOf={output.dataAsOf} stale={output.stale} />
            <ReportResultTable output={output} groupLabel="Department" columns={[output.metricLabel]} />
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                id="export-csv-btn"
                onClick={async () => {
                  const res = await exportReportCsv(output, selectedTemplate.name, scope.name);
                  downloadCsv(res.data, `${selectedTemplate.id}_report.csv`);
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", color: "var(--text)" }}>
                <Download size={13} /> Export CSV
              </button>
              <button disabled title="Simulated in this build — CSV is the only real export"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12.5px", color: "var(--subtext)", cursor: "not-allowed", opacity: 0.6 }}>
                <Download size={13} /> Export PDF
              </button>
              <button disabled title="Simulated in this build — CSV is the only real export"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "12.5px", color: "var(--subtext)", cursor: "not-allowed", opacity: 0.6 }}>
                <Download size={13} /> Export Excel
              </button>
            </div>
          </div>
        )}

        {!output && !loading && <EmptyState title="Select filters and run a report" subtitle="Results will appear here." />}
      </div>
    </div>
  );
}

function CustomBuilderTab({ role }) {
  const [catalog, setCatalog] = useState(null);
  const [dimensionId, setDimensionId] = useState("");
  const [metricIds, setMetricIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [scope, setScope] = useState(null);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getFieldCatalog(), getOrgScope(role)]).then(([cRes, sRes]) => {
      setCatalog(cRes.data);
      setScope(sRes.data);
      setDimensionId(cRes.data.dimensions[0].id);
      setDepartments(sRes.data.departments);
    });
  }, [role]);

  const toggleMetric = (id) => {
    setMetricIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleDept = (d) => {
    setDepartments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const run = async () => {
    if (metricIds.length === 0) { setError("Select at least one metric."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await runCustomReport({ dimensionId, metricIds, filters: { departments } }, role);
      setOutput(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!catalog || !scope) return <Spinner />;

  const metricLabels = metricIds.map((id) => catalog.metrics.find((m) => m.id === id).label);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "var(--card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "18px 20px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Group By</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {catalog.dimensions.map((d) => (
            <label key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "5px 10px", borderRadius: "99px", border: dimensionId === d.id ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer" }}>
              <input type="radio" checked={dimensionId === d.id} onChange={() => setDimensionId(d.id)} />
              {d.label}
              <span style={{ fontSize: "9.5px", fontWeight: 700, color: classificationColor[d.classification] }}>{d.classification}</span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Metrics</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          {catalog.metrics.map((m) => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "5px 10px", borderRadius: "99px", border: metricIds.includes(m.id) ? "1px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer" }}>
              <input type="checkbox" checked={metricIds.includes(m.id)} onChange={() => toggleMetric(m.id)} />
              {m.label}
              <span style={{ fontSize: "9.5px", fontWeight: 700, color: classificationColor[m.classification] }}>{m.classification}</span>
            </label>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "var(--subtext)", marginBottom: "16px" }}>
          Only fields cleared for reporting are listed here. Personal identifiers, bank/PAN details, and free-text review content are never available in the builder.
        </p>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Department (scope: {scope.departments.join(", ")})</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {DEPARTMENTS.map((d) => {
            const inScope = scope.departments.includes(d);
            return (
              <label key={d} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: inScope ? "var(--text)" : "var(--subtext)", cursor: inScope ? "pointer" : "not-allowed", opacity: inScope ? 1 : 0.5 }}>
                <input type="checkbox" disabled={!inScope} checked={departments.includes(d)} onChange={() => toggleDept(d)} />
                {d}{!inScope && <Lock size={10} />}
              </label>
            );
          })}
        </div>

        {error && <p style={{ fontSize: "12px", color: "var(--red)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}><AlertTriangle size={12} /> {error}</p>}

        <button onClick={run} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "13px", cursor: loading ? "not-allowed" : "pointer" }}>
          <Play size={14} /> {loading ? "Running…" : "Run Custom Report"}
        </button>
      </div>

      {output && (
        <div>
          <DataAsOfBanner dataAsOf={output.dataAsOf} stale={output.stale} />
          <ReportResultTable output={output} groupLabel={catalog.dimensions.find((d) => d.id === dimensionId).label} columns={metricLabels} />
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [role, setRole] = useState(ROLES.HR);
  const [tab, setTab] = useState("standard");

  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <PageHeader title="Reports & Analytics" subtitle="Standard reports and a custom builder over approved fields only" />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", padding: "8px 12px", background: "#fffbeb", border: "1px dashed #d97706", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>VIEWING AS</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {Object.values(ROLES).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 600, borderRadius: "99px", cursor: "pointer", border: role === r ? "1px solid var(--primary)" : "1px solid var(--border)", background: role === r ? "var(--primary)" : "var(--card)", color: role === r ? "#fff" : "var(--text)" }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)" }}>
          {[{ id: "standard", label: "Standard Reports" }, { id: "custom", label: "Custom Builder" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "10px 18px", background: "none", border: "none",
                borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === t.id ? "var(--primary)" : "var(--subtext)",
                fontWeight: tab === t.id ? 700 : 500, fontSize: "13.5px", cursor: "pointer", marginBottom: "-1px",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "standard" ? <StandardReportsTab role={role} /> : <CustomBuilderTab role={role} />}
      </div>
    </MainLayout>
  );
}