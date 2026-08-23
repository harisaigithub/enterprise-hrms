import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getLifecycleApplications, firstApproveApplication, secondApproveApplication, rejectLifecycleApplication, verifyCandidateDocument, convertCandidateToEmployee } from "../../services/candidateLifecycleService";

const btn = { border: 0, borderRadius: 7, padding: "8px 12px", background: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer", marginRight: 7, marginTop: 7 };
const statusColor = { "HR Review": "#d97706", "Second Approval": "#7c3aed", "Offer Sent": "#0284c7", "Employee Created": "#16a34a", Rejected: "#dc2626" };

export default function CandidateLifecycleTab() {
  const { role } = useAuth(); const [rows, setRows] = useState([]); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState("");
  const load = () => getLifecycleApplications().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const run = async (id, action) => { setBusy(id); setError(""); setNotice(""); try { const result = await action(); if (result.data?.invitationToken) { const link = `${window.location.origin}/candidate/offer/${result.data.invitationToken}`; await navigator.clipboard?.writeText(link); setNotice(`Invitation generated and copied: ${link}`); } else if (result.data?.temporaryPassword) { setNotice(`Employee created. Login: ${result.data.loginEmail} | Temporary password: ${result.data.temporaryPassword}`); } else setNotice("Workflow updated successfully."); await load(); } catch (e) { setError(e.message); } finally { setBusy(""); } };
  const reject = (id) => { const reason = window.prompt("Reason for rejection"); if (reason) run(id, () => rejectLifecycleApplication(id, reason)); };
  const secondApprove = (row) => { const proposedSalary = window.prompt(`Proposed annual salary (${Number(row.requisition.salaryMin)}–${Number(row.requisition.salaryMax)})`); if (!proposedSalary) return; const joiningDate = window.prompt("Joining date (YYYY-MM-DD)"); run(row.id, () => secondApproveApplication(row.id, { proposedSalary, ...(joiningDate ? { joiningDate } : {}) })); };
  const verify = (doc, status) => { const reason = status === "Rejected" ? window.prompt("Why is this document rejected?") : ""; if (status === "Rejected" && !reason) return; run(doc.applicationId, () => verifyCandidateDocument(doc.id, status, reason)); };

  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><div><h2 style={{ margin: 0, fontSize: 17 }}>Candidate onboarding workflow</h2><p style={{ color: "var(--subtext)" }}>HR review → first approval → admin approval → offer → documents → employee account</p></div><a href="/careers" target="_blank" rel="noreferrer" style={btn}>Open careers page</a></div>
    {notice && <p style={{ padding: 12, background: "#ecfdf5", color: "#047857", wordBreak: "break-all" }}>{notice}</p>}{error && <p style={{ padding: 12, background: "#fef2f2", color: "#b91c1c" }}>{error}</p>}
    {!rows.length ? <p>No candidate applications yet. Use the careers page to submit one.</p> : rows.map((row) => <article key={row.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 15, flexWrap: "wrap" }}><div><b>{row.candidate.firstName} {row.candidate.lastName}</b><div style={{ color: "var(--subtext)", marginTop: 4 }}>{row.candidate.email} · {row.requisition.title}</div></div><b style={{ color: statusColor[row.approvalStatus] || "var(--text)" }}>{row.approvalStatus}</b></div>
      {row.approvalNotes && <p><b>Notes:</b> {row.approvalNotes}</p>}
      {role === "HR" && row.approvalStatus === "HR Review" && <><button style={btn} disabled={busy === row.id} onClick={() => run(row.id, () => firstApproveApplication(row.id, "Reviewed by HR"))}>First approval</button><button style={{ ...btn, background: "#b91c1c" }} onClick={() => reject(row.id)}>Reject</button></>}
      {role === "ADMIN" && row.approvalStatus === "Second Approval" && <><button style={btn} disabled={busy === row.id} onClick={() => secondApprove(row)}>Second approval & generate offer</button><button style={{ ...btn, background: "#b91c1c" }} onClick={() => reject(row.id)}>Reject</button></>}
      {row.offer && <p><b>Offer:</b> {row.offer.status} · ₹{Number(row.offer.proposedSalary).toLocaleString("en-IN")}</p>}
      {!!row.documents.length && <div><b>Documents</b>{row.documents.map((doc) => <div key={doc.id} style={{ marginTop: 8, padding: 9, background: "var(--background)", borderRadius: 7 }}>{doc.documentType}: {doc.fileName} — <b>{doc.status}</b>{role === "HR" && doc.status === "Pending Verification" && <span><button style={btn} onClick={() => verify(doc, "Verified")}>Verify</button><button style={{ ...btn, background: "#b91c1c" }} onClick={() => verify(doc, "Rejected")}>Reject</button></span>}</div>)}</div>}
      {role === "HR" && row.offer?.status === "Accepted" && row.documents.length > 0 && row.documents.every((d) => d.status === "Verified") && !row.employeeId && <button style={btn} onClick={() => run(row.id, () => convertCandidateToEmployee(row.id))}>Create employee account</button>}
    </article>)}
  </div>;
}
