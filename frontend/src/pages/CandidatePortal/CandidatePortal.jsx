import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { decideCandidateOffer, getCandidatePortal, getPublicJobs, submitCandidateApplication, uploadCandidateDocument } from "../../services/candidateLifecycleService";
import "./CandidatePortal.css";

const EMPTY_FORM = { requisitionId: "", firstName: "", lastName: "", email: "", phone: "", resumeSummary: "" };
const DOCUMENT_TYPES = ["Identity Proof", "Address Proof", "Education Certificate", "Tax Document", "Other"];

export default function CandidatePortal() {
  const { token } = useParams();
  const [jobs, setJobs] = useState([]); const [portal, setPortal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM); const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const loadPortal = useCallback(async () => {
    if (!token) return;
    try { setError(""); const response = await getCandidatePortal(token); setPortal(response.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (token) { loadPortal(); return; }
    getPublicJobs().then((response) => {
      const availableJobs = response.data || [];
      setJobs(availableJobs);
      setForm((current) => ({ ...current, requisitionId: availableJobs[0]?.id || "" }));
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [loadPortal, token]);

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const apply = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await submitCandidateApplication(form); setMessage("Application submitted successfully. HR will contact you after review."); setForm((current) => ({ ...EMPTY_FORM, requisitionId: current.requisitionId })); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const decide = async (decision) => {
    setBusy(true); setError(""); setMessage("");
    try { await decideCandidateOffer(token, decision); setMessage(`Offer ${decision.toLowerCase()} successfully.`); await loadPortal(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const upload = async (event) => {
    event.preventDefault(); if (!file) return;
    if (file.size > 650000) { setError("Please upload a file smaller than 650 KB for this demo."); return; }
    setBusy(true); setError(""); setMessage("");
    const reader = new FileReader();
    reader.onload = async () => {
      try { await uploadCandidateDocument(token, { documentType, fileName: file.name, fileUrl: reader.result }); setMessage("Document uploaded successfully and sent to HR for verification."); setFile(null); event.target.reset(); await loadPortal(); }
      catch (requestError) { setError(requestError.message); }
      finally { setBusy(false); }
    };
    reader.readAsDataURL(file);
  };

  return <main className="candidate-page">
    <header className="candidate-header"><a className="candidate-brand" href="/careers"><span className="candidate-logo">P</span><span>Proteccio <small>Careers</small></span></a><span className="candidate-secure"><ShieldCheck size={17} /> Secure candidate portal</span></header>
    <div className="candidate-shell">
      <aside className="candidate-intro"><span className="candidate-eyebrow">BUILD YOUR CAREER WITH US</span><h1>{token ? "Your next chapter starts here." : "Do work that makes a difference."}</h1><p>A secure and transparent journey from application to onboarding.</p><div className="candidate-steps"><span><BriefcaseBusiness size={19} /> Apply for an open role</span><span><CheckCircle2 size={19} /> Review and offer decisions</span><span><FileCheck2 size={19} /> Complete onboarding securely</span></div></aside>
      <section className="candidate-card">
        {loading ? <div className="candidate-loading">Loading…</div> : <>
          {message && <div className="candidate-alert success">{message}</div>}{error && <div className="candidate-alert error">{error}</div>}
          {!token ? <form onSubmit={apply}>
            <div className="candidate-card-heading"><span>Candidate application</span><h2>Apply to Proteccio</h2><p>Tell us about yourself and the role you are interested in.</p></div>
            <label>Open position<select required value={form.requisitionId} onChange={updateField("requisitionId")}><option value="" disabled>Select a position</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} — {job.location?.name || "Flexible"}</option>)}</select></label>
            <div className="candidate-grid"><label>First name<input required value={form.firstName} onChange={updateField("firstName")} /></label><label>Last name<input value={form.lastName} onChange={updateField("lastName")} /></label></div>
            <div className="candidate-grid"><label>Email<input required type="email" value={form.email} onChange={updateField("email")} /></label><label>Phone<input value={form.phone} onChange={updateField("phone")} /></label></div>
            <label>Profile / resume summary<textarea required rows="5" value={form.resumeSummary} onChange={updateField("resumeSummary")} placeholder="Share your skills, experience and interest in this role." /></label>
            {!jobs.length && <p className="candidate-empty">There are currently no open positions.</p>}
            <button className="candidate-primary" disabled={busy || !jobs.length}>{busy ? "Submitting…" : "Submit application"}</button><p className="candidate-privacy">By submitting, you agree that HR may process these details for recruitment.</p>
          </form> : portal && <div>
            <div className="candidate-card-heading"><span>Offer & onboarding</span><h2>Welcome, {portal.candidate.firstName}</h2><p>Review your offer and complete the remaining onboarding steps.</p></div>
            <dl className="candidate-offer"><div><dt>Position</dt><dd>{portal.job}</dd></div><div><dt>Offer status</dt><dd><span className="candidate-status">{portal.offer.status}</span></dd></div><div><dt>Annual compensation</dt><dd>₹{Number(portal.offer.proposedSalary).toLocaleString("en-IN")}</dd></div></dl>
            {portal.offer.status === "Sent — Awaiting Signature" && <div className="candidate-actions"><button className="candidate-primary" disabled={busy} onClick={() => decide("Accepted")}>Accept offer</button><button className="candidate-secondary danger" disabled={busy} onClick={() => decide("Declined")}>Decline</button></div>}
            {portal.offer.status === "Accepted" && <form className="candidate-upload" onSubmit={upload}><h3>Onboarding documents</h3><p>Upload a clear file smaller than 650 KB.</p><label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Choose document<input required type="file" onChange={(event) => setFile(event.target.files[0])} /></label><button className="candidate-primary" disabled={busy}>{busy ? "Uploading…" : "Upload document"}</button></form>}
            {!!portal.documents.length && <div className="candidate-documents"><h3>Submitted documents</h3>{portal.documents.map((document) => <div key={document.id}><FileCheck2 size={18} /><span>{document.fileName}<small>{document.documentType}</small></span><b className={`document-${document.status.toLowerCase().replaceAll(" ", "-")}`}>{document.status}</b>{document.rejectionReason && <em>{document.rejectionReason}</em>}</div>)}</div>}
          </div>}
        </>}
      </section>
    </div>
  </main>;
}
