import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { useParams } from "react-router-dom";

import {
  decideCandidateOffer,
  getCandidatePortal,
  getPublicJobs,
  submitCandidateApplication,
  uploadCandidateDocument,
  uploadCandidateResume,
} from "../../services/candidateLifecycleService";

import "./CandidatePortal.css";

const EMPTY_FORM = {
  requisitionId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  fatherName: "",
  motherName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",

  totalExperienceYears: "",
  highestEducation: "",
  degree: "",
  specialization: "",
  collegeName: "",
  passingYear: "",

  currentCompany: "",
  currentDesignation: "",
  noticePeriodDays: "",
  currentLocation: "",
  expectedSalary: "",

  resumeSummary: "",
};

const DOCUMENT_TYPES = [
  "Identity Proof",
  "Address Proof",
  "Education Certificate",
  "Tax Document",
  "Other",
];

const BGV_DOCUMENT_TYPES = [
  { value: "IDENTITY", label: "Identity Proof" },
  { value: "ADDRESS", label: "Address Proof" },
  { value: "EDUCATION", label: "Education Certificate" },
  { value: "EMPLOYMENT", label: "Employment Proof" },
];

const BGV_DOCUMENT_TYPE_MAP = {
  IDENTITY: "Identity Proof",
  ADDRESS: "Address Proof",
  EDUCATION: "Education Certificate",
  EMPLOYMENT: "Other",
};

const BGV_ACTIONS = {
  REUPLOAD_DOCUMENT: "REUPLOAD_DOCUMENT",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  CLARIFICATION: "CLARIFICATION",
};

const BGV_UPLOAD_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const BGV_MAX_FILE_SIZE = 5 * 1024 * 1024;

const EDUCATION_OPTIONS = [
  "10th",
  "12th",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "M.Tech",
  "MBA",
  "PhD",
  "Other",
];

export default function CandidatePortal() {
  const { token } = useParams();

  const [jobs, setJobs] = useState([]);
  const [portal, setPortal] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  // Keep the selected BGV document type per verification.
  // This prevents different BGV cards from sharing one upload type.
  const [bgvDocumentTypes, setBgvDocumentTypes] = useState({});
  const [bgvFile, setBgvFile] = useState(null);
  const [bgvBusy, setBgvBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const applicationFileRef = useRef(null);
  const resumeFileRef = useRef(null);

  const loadPortal = useCallback(async () => {
    if (!token) return;

    try {
      setError("");

      const response = await getCandidatePortal(token);

      setPortal(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadPortal();
      return;
    }

    getPublicJobs()
      .then((response) => {
        const availableJobs = response.data || [];

        setJobs(availableJobs);

        setForm((current) => ({
          ...current,
          requisitionId: availableJobs[0]?.id || "",
        }));
      })
      .catch((requestError) => {
        setError(requestError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadPortal, token]);

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  /*
   * ============================================================
   * APPLICATION SUBMIT
   * ============================================================
   */

  const apply = async (event) => {
    event.preventDefault();

    if (!form.requisitionId) {
      setError("Please select a position.");
      return;
    }

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!resumeFile) {
      setError("Please upload your resume.");
      return;
    }

    const allowedResumeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedResumeTypes.includes(resumeFile.type)) {
      setError("Resume must be PDF, DOC or DOCX.");
      return;
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      setError("Resume size must be less than 5 MB.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          data.append(key, value);
        }
      });

      data.append("resume", resumeFile);

      await submitCandidateApplication(data);

      setMessage(
        "Application submitted successfully. HR will contact you after review."
      );

      setForm((current) => ({
        ...EMPTY_FORM,
        requisitionId: current.requisitionId,
      }));

      setResumeFile(null);

      if (applicationFileRef.current) {
        applicationFileRef.current.value = "";
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  /*
   * ============================================================
   * OFFER DECISION
   * ============================================================
   */

  const decide = async (decision) => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await decideCandidateOffer(token, decision);

      setMessage(
        `Offer ${decision.toLowerCase()} successfully.`
      );

      await loadPortal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  /*
   * ============================================================
   * ONBOARDING DOCUMENT
   * ============================================================
   */

  const upload = async (event) => {
    event.preventDefault();

    if (!file) {
      setError("Please select a document.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await uploadCandidateDocument(token, {
        documentType,
        file,
      });

      setMessage(
        "Document uploaded successfully and sent to HR for verification."
      );

      setFile(null);

      event.target.reset();

      await loadPortal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  /*
   * ============================================================
   * RESUME RE-UPLOAD FROM CANDIDATE PORTAL
   * ============================================================
   */

  const uploadResumeAgain = async (event) => {
    event.preventDefault();

    if (!resumeFile) {
      setError("Please select a resume.");
      return;
    }

    const allowedResumeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedResumeTypes.includes(resumeFile.type)) {
      setError("Resume must be PDF, DOC or DOCX.");
      return;
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      setError("Resume size must be less than 5 MB.");
      return;
    }

    setResumeBusy(true);
    setError("");
    setMessage("");

    try {
      await uploadCandidateResume(token, resumeFile);

      setMessage("Resume updated successfully.");

      setResumeFile(null);

      if (resumeFileRef.current) {
        resumeFileRef.current.value = "";
      }

      await loadPortal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResumeBusy(false);
    }
  };

  /*
   * ============================================================
   * BGV CANDIDATE ACTION / CORRECTED DOCUMENT UPLOAD
   * ============================================================
   *
   * The existing candidate document endpoint is intentionally reused.
   * No fake BGV-specific backend endpoint is introduced here.
   */

  const uploadBgvDocument = async (event, verification) => {
    event.preventDefault();

    if (!bgvFile) {
      setError("Please select the corrected BGV document.");
      return;
    }

    const allowedBgvTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedBgvTypes.includes(bgvFile.type)) {
      setError("BGV document must be PDF, JPG or PNG.");
      return;
    }

    if (bgvFile.size > BGV_MAX_FILE_SIZE) {
      setError("BGV document size must be less than 5 MB.");
      return;
    }

    setBgvBusy(true);
    setError("");
    setMessage("");

    const mappedDocumentType = getBgvDocumentType(verification);
    const selectedBgvType =
      bgvDocumentTypes[verification?.id] || mappedDocumentType;

    try {
      await uploadCandidateDocument(token, {
        documentType:
          BGV_DOCUMENT_TYPE_MAP[selectedBgvType] || "Other",
        file: bgvFile,
      });

      setMessage(
        "Corrected BGV document uploaded successfully. HR will review it and re-run the verification."
      );

      setBgvFile(null);

      if (event.currentTarget) {
        event.currentTarget.reset();
      }

      await loadPortal();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBgvBusy(false);
    }
  };

  /*
   * ============================================================
   * BGV DISPLAY HELPERS
   * ============================================================
   */

  const getBgvAction = (verification) => {
    if (!verification) return null;

    const explicitAction =
      verification.candidateAction ||
      verification.actionRequired ||
      verification.requiredAction;

    if (typeof explicitAction === "string") {
      return explicitAction;
    }

    if (verification.candidateActionRequired === true) {
      return BGV_ACTIONS.REUPLOAD_DOCUMENT;
    }

    if (verification.status === "CANDIDATE_ACTION_REQUIRED") {
      return BGV_ACTIONS.REUPLOAD_DOCUMENT;
    }

    return null;
  };

  const getBgvActionMessage = (verification, action) => {
    if (!verification) return "";

    return (
      verification.candidateActionMessage ||
      verification.candidateActionRemarks ||
      verification.actionMessage ||
      verification.actionReason ||
      verification.candidateActionReason ||
      (action === BGV_ACTIONS.UPDATE_PROFILE
        ? "Please review and update your profile information as requested by HR."
        : action === BGV_ACTIONS.CLARIFICATION
          ? "Please provide the clarification requested by HR for this verification."
          : "Please upload a clear and correct document so HR can complete your background verification.")
    );
  };

  const getBgvDocumentType = (verification) => {
    const type = String(
      verification?.verificationType ||
        verification?.type ||
        verification?.documentType ||
        ""
    ).toUpperCase();

    if (type.includes("IDENTITY")) return "IDENTITY";
    if (type.includes("ADDRESS")) return "ADDRESS";
    if (type.includes("EDUCATION")) return "EDUCATION";
    if (type.includes("EMPLOYMENT")) return "EMPLOYMENT";

    return BGV_DOCUMENT_TYPES[0].value;
  };

  const getSelectedBgvDocumentType = (verification) =>
    bgvDocumentTypes[verification?.id] ||
    getBgvDocumentType(verification);

  const bgvActionRequired = portal?.bgv?.verifications?.filter(
    (verification) => Boolean(getBgvAction(verification))
  ) || [];

  return (
    <main className="candidate-page">
      <header className="candidate-header">
        <a className="candidate-brand" href="/careers">
          <span className="candidate-logo">P</span>

          <span>
            Proteccio
            <small>Careers</small>
          </span>
        </a>

        <span className="candidate-secure">
          <ShieldCheck size={17} />
          Secure candidate portal
        </span>
      </header>

      <div className="candidate-shell">
        <aside className="candidate-intro">
          <span className="candidate-eyebrow">
            BUILD YOUR CAREER WITH US
          </span>

          <h1>
            {token
              ? "Your next chapter starts here."
              : "Do work that makes a difference."}
          </h1>

          <p>
            A secure and transparent journey from application to onboarding.
          </p>

          <div className="candidate-steps">
            <span>
              <BriefcaseBusiness size={19} />
              Apply for an open role
            </span>

            <span>
              <CheckCircle2 size={19} />
              Review and offer decisions
            </span>

            <span>
              <FileCheck2 size={19} />
              Complete onboarding securely
            </span>
          </div>
        </aside>

        <section className="candidate-card">
          {loading ? (
            <div className="candidate-loading">
              Loading…
            </div>
          ) : (
            <>
              {message && (
                <div className="candidate-alert success">
                  {message}
                </div>
              )}

              {error && (
                <div className="candidate-alert error">
                  {error}
                </div>
              )}

              {/* =====================================================
                  PUBLIC APPLICATION
              ====================================================== */}

              {!token ? (
                <form onSubmit={apply}>
                  <div className="candidate-card-heading">
                    <span>Candidate application</span>

                    <h2>Apply to Proteccio</h2>

                    <p>
                      Tell us about yourself, your experience and the role
                      you are interested in.
                    </p>
                  </div>

                  {/* POSITION */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <BriefcaseBusiness size={18} />
                      <span>Position</span>
                    </div>

                    <label>
                      Open position

                      <select
                        required
                        value={form.requisitionId}
                        onChange={updateField("requisitionId")}
                      >
                        <option value="" disabled>
                          Select a position
                        </option>

                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title} —{" "}
                            {job.location?.name || "Flexible"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* PERSONAL INFORMATION */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <UserRound size={18} />
                      <span>Personal information</span>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        First name

                        <input
                          required
                          value={form.firstName}
                          onChange={updateField("firstName")}
                          placeholder="Your first name"
                        />
                      </label>

                      <label>
                        Last name

                        <input
                          value={form.lastName}
                          onChange={updateField("lastName")}
                          placeholder="Your last name"
                        />
                      </label>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Date of birth
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={updateField("dateOfBirth")}
                        />
                      </label>

                      <label>
                        Father's name
                        <input
                          value={form.fatherName}
                          onChange={updateField("fatherName")}
                          placeholder="Father's full name"
                        />
                      </label>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Mother's name
                        <input
                          value={form.motherName}
                          onChange={updateField("motherName")}
                          placeholder="Mother's full name"
                        />
                      </label>

                      <label>
                        Postal code
                        <input
                          value={form.postalCode}
                          onChange={updateField("postalCode")}
                          placeholder="Postal code"
                        />
                      </label>
                    </div>

                    <label>
                      Full address
                      <textarea
                        rows="3"
                        value={form.address}
                        onChange={updateField("address")}
                        placeholder="House / street / locality"
                      />
                    </label>

                    <div className="candidate-grid">
                      <label>
                        City
                        <input
                          value={form.city}
                          onChange={updateField("city")}
                          placeholder="City"
                        />
                      </label>

                      <label>
                        State
                        <input
                          value={form.state}
                          onChange={updateField("state")}
                          placeholder="State"
                        />
                      </label>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Country
                        <input
                          value={form.country}
                          onChange={updateField("country")}
                          placeholder="Country"
                        />
                      </label>

                      <label>
                        Email


                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={updateField("email")}
                          placeholder="you@example.com"
                        />
                      </label>

                      <label>
                        Phone

                        <input
                          value={form.phone}
                          onChange={updateField("phone")}
                          placeholder="+91 9876543210"
                        />
                      </label>
                    </div>

                    <label>
                      Current location

                      <input
                        value={form.currentLocation}
                        onChange={updateField("currentLocation")}
                        placeholder="Indore, Madhya Pradesh"
                      />
                    </label>
                  </div>

                  {/* EXPERIENCE */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <BriefcaseBusiness size={18} />
                      <span>Professional experience</span>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Total experience (years)

                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.1"
                          value={form.totalExperienceYears}
                          onChange={updateField(
                            "totalExperienceYears"
                          )}
                          placeholder="e.g. 2.5"
                        />
                      </label>

                      <label>
                        Notice period (days)

                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={form.noticePeriodDays}
                          onChange={updateField(
                            "noticePeriodDays"
                          )}
                          placeholder="e.g. 30"
                        />
                      </label>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Current company

                        <input
                          value={form.currentCompany}
                          onChange={updateField("currentCompany")}
                          placeholder="Company name"
                        />
                      </label>

                      <label>
                        Current designation

                        <input
                          value={form.currentDesignation}
                          onChange={updateField(
                            "currentDesignation"
                          )}
                          placeholder="Software Engineer"
                        />
                      </label>
                    </div>

                    <label>
                      Expected annual salary

                      <input
                        type="number"
                        min="0"
                        value={form.expectedSalary}
                        onChange={updateField("expectedSalary")}
                        placeholder="e.g. 800000"
                      />
                    </label>
                  </div>

                  {/* EDUCATION */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <GraduationCap size={18} />
                      <span>Education</span>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Highest education

                        <select
                          value={form.highestEducation}
                          onChange={updateField(
                            "highestEducation"
                          )}
                        >
                          <option value="">
                            Select education
                          </option>

                          {EDUCATION_OPTIONS.map((education) => (
                            <option
                              key={education}
                              value={education}
                            >
                              {education}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Degree

                        <input
                          value={form.degree}
                          onChange={updateField("degree")}
                          placeholder="B.Tech / B.E. / MCA"
                        />
                      </label>
                    </div>

                    <div className="candidate-grid">
                      <label>
                        Specialization

                        <input
                          value={form.specialization}
                          onChange={updateField(
                            "specialization"
                          )}
                          placeholder="Computer Science"
                        />
                      </label>

                      <label>
                        Passing year

                        <input
                          type="number"
                          min="1950"
                          max="2100"
                          value={form.passingYear}
                          onChange={updateField("passingYear")}
                          placeholder="2026"
                        />
                      </label>
                    </div>

                    <label>
                      College / University name

                      <input
                        value={form.collegeName}
                        onChange={updateField("collegeName")}
                        placeholder="College or university"
                      />
                    </label>
                  </div>

                  {/* RESUME */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <Upload size={18} />
                      <span>Resume</span>
                    </div>

                    <label className="candidate-file-field">
                      Upload resume

                      <input
                        ref={applicationFileRef}
                        required
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) =>
                          setResumeFile(
                            event.target.files?.[0] || null
                          )
                        }
                      />

                      <small>
                        PDF, DOC or DOCX · Maximum 5 MB
                      </small>
                    </label>

                    {resumeFile && (
                      <div className="candidate-file-preview">
                        <FileCheck2 size={17} />

                        <span>
                          {resumeFile.name}

                          <small>
                            {(resumeFile.size / 1024 / 1024).toFixed(
                              2
                            )}{" "}
                            MB
                          </small>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PROFILE SUMMARY */}

                  <div className="candidate-section">
                    <div className="candidate-section-title">
                      <FileCheck2 size={18} />
                      <span>Profile summary</span>
                    </div>

                    <label>
                      About you

                      <textarea
                        rows="5"
                        value={form.resumeSummary}
                        onChange={updateField("resumeSummary")}
                        placeholder="Briefly describe your skills, experience and interest in this role."
                      />
                    </label>
                  </div>

                  {!jobs.length && (
                    <p className="candidate-empty">
                      There are currently no open positions.
                    </p>
                  )}

                  <button
                    className="candidate-primary candidate-submit"
                    disabled={busy || !jobs.length}
                  >
                    {busy
                      ? "Submitting application…"
                      : "Submit application"}
                  </button>

                  <p className="candidate-privacy">
                    By submitting, you agree that HR may process
                    these details for recruitment purposes.
                  </p>
                </form>
              ) : (
                /* =====================================================
                   CANDIDATE PORTAL
                ====================================================== */

                portal && (
                  <div>
                    <div className="candidate-card-heading">
                      <span>Offer & onboarding</span>

                      <h2>
                        Welcome, {portal.candidate.firstName}
                      </h2>

                      <p>
                        Review your application, offer and complete
                        the remaining onboarding steps.
                      </p>
                    </div>

                    {/* OFFER */}

                    <dl className="candidate-offer">
                      <div>
                        <dt>Position</dt>
                        <dd>{portal.job}</dd>
                      </div>

                      <div>
                        <dt>Offer status</dt>

                        <dd>
                          <span className="candidate-status">
                            {portal.offer.status}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt>Annual compensation</dt>

                        <dd>
                          ₹
                          {Number(
                            portal.offer.proposedSalary
                          ).toLocaleString("en-IN")}
                        </dd>
                      </div>

                      {portal.offer.joiningDate && (
                        <div>
                          <dt>Joining date</dt>

                          <dd>
                            {new Date(
                              portal.offer.joiningDate
                            ).toLocaleDateString("en-IN")}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* OFFER DECISION */}

                    {portal.offer.status ===
                      "Sent — Awaiting Signature" && (
                      <div className="candidate-actions">
                        <button
                          className="candidate-primary"
                          disabled={busy}
                          onClick={() => decide("Accepted")}
                        >
                          Accept offer
                        </button>

                        <button
                          className="candidate-secondary danger"
                          disabled={busy}
                          onClick={() => decide("Declined")}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* RESUME UPDATE */}

                    <form
                      className="candidate-upload candidate-resume-update"
                      onSubmit={uploadResumeAgain}
                    >
                      <h3>Resume</h3>

                      <p>
                        You can upload an updated resume from the
                        candidate portal.
                      </p>

                      <label>
                        Choose resume

                        <input
                          ref={resumeFileRef}
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) =>
                            setResumeFile(
                              event.target.files?.[0] || null
                            )
                          }
                        />
                      </label>

                      <button
                        className="candidate-secondary"
                        disabled={resumeBusy || !resumeFile}
                      >
                        {resumeBusy
                          ? "Updating resume…"
                          : "Update resume"}
                      </button>
                    </form>

                    {/* ONBOARDING DOCUMENTS */}

                    {portal.offer.status === "Accepted" && (
                      <form
                        className="candidate-upload"
                        onSubmit={upload}
                      >
                        <h3>Onboarding documents</h3>

                        <p>
                          Upload a clear PDF, JPG or PNG document.
                          Maximum 5 MB.
                        </p>

                        <label>
                          Document type

                          <select
                            value={documentType}
                            onChange={(event) =>
                              setDocumentType(
                                event.target.value
                              )
                            }
                          >
                            {DOCUMENT_TYPES.map((type) => (
                              <option key={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Choose document

                          <input
                            required
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            onChange={(event) =>
                              setFile(
                                event.target.files?.[0] ||
                                  null
                              )
                            }
                          />
                        </label>

                        <button
                          className="candidate-primary"
                          disabled={busy}
                        >
                          {busy
                            ? "Uploading…"
                            : "Upload document"}
                        </button>
                      </form>
                    )}

                    {/* DOCUMENT LIST */}

                    {!!portal.documents?.length && (
                      <div className="candidate-documents">
                        <h3>Submitted documents</h3>

                        {portal.documents.map((document) => (
                          <div key={document.id}>
                            <FileCheck2 size={18} />

                            <span>
                              {document.fileName}

                              <small>
                                {document.documentType}
                              </small>
                            </span>

                            <b
                              className={`document-${String(
                                document.status
                              )
                                .toLowerCase()
                                .replaceAll(" ", "-")}`}
                            >
                              {document.status}
                            </b>

                            {document.rejectionReason && (
                              <em>
                                {document.rejectionReason}
                              </em>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* =================================================
                        BACKGROUND VERIFICATION
                       ================================================== */}

                    {portal.bgv && (
                      <section className="candidate-bgv">
                        <div className="candidate-section-title">
                          <ShieldCheck size={18} />
                          <span>Background verification</span>
                        </div>

                        {/* OVERALL STATUS */}
                        <div className="candidate-bgv-status">
                          <div>
                            <span>BGV overall status</span>
                            <strong>
                              {portal.bgv.status || "NOT_STARTED"}
                            </strong>
                          </div>

                          <div>
                            <span>BGV result</span>
                            <strong>
                              {portal.bgv.result || "UNDER_REVIEW"}
                            </strong>
                          </div>
                        </div>

                        {/* INDIVIDUAL VERIFICATIONS */}
                        {!!portal.bgv.verifications?.length && (
                          <div className="candidate-bgv-list">
                            {portal.bgv.verifications.map((verification) => {
                              const action = getBgvAction(verification);
                              const actionMessage = getBgvActionMessage(
                                verification,
                                action
                              );
                              const mappedDocumentType =
                                getBgvDocumentType(verification);

                              return (
                                <div
                                  className="candidate-bgv-item"
                                  key={verification.id}
                                >
                                  <div className="candidate-bgv-item-main">
                                    <strong>
                                      {verification.type ||
                                        verification.verificationType ||
                                        "Verification"}
                                    </strong>

                                    <div className="candidate-bgv-meta">
                                      <span>
                                        Status:{" "}
                                        {verification.status || "PENDING"}
                                      </span>

                                      <span>
                                        Result:{" "}
                                        {verification.result || "NOT_AVAILABLE"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* CANDIDATE ACTION */}
                                  {action && (
                                    <div className="candidate-bgv-action-box">
                                      <strong>Action required</strong>

                                      <p>{actionMessage}</p>

                                      {/* REUPLOAD_DOCUMENT */}
                                      {action ===
                                        BGV_ACTIONS.REUPLOAD_DOCUMENT && (
                                        <form
                                          className="candidate-upload candidate-bgv-upload"
                                          onSubmit={(event) =>
                                            uploadBgvDocument(
                                              event,
                                              verification
                                            )
                                          }
                                        >
                                          <h4>Upload corrected document</h4>

                                          <p>
                                            Upload a clear PDF, JPG or PNG
                                            document. Maximum 5 MB.
                                          </p>

                                          <label>
                                            Document type
                                            <select
                                              value={getSelectedBgvDocumentType(
                                                verification
                                              )}
                                              onChange={(event) =>
                                                setBgvDocumentTypes((current) => ({
                                                  ...current,
                                                  [verification.id]:
                                                    event.target.value,
                                                }))
                                              }
                                            >
                                              {BGV_DOCUMENT_TYPES.map(
                                                (type) => (
                                                  <option
                                                    key={type.value}
                                                    value={type.value}
                                                  >
                                                    {type.label}
                                                  </option>
                                                )
                                              )}
                                            </select>
                                          </label>

                                          <small>
                                            Suggested for this verification:{" "}
                                            {BGV_DOCUMENT_TYPES.find(
                                              (type) =>
                                                type.value ===
                                                mappedDocumentType
                                            )?.label || "Identity Proof"}
                                          </small>

                                          <label>
                                            Corrected document
                                            <input
                                              required
                                              type="file"
                                              accept={BGV_UPLOAD_ACCEPT}
                                              onChange={(event) =>
                                                setBgvFile(
                                                  event.target.files?.[0] ||
                                                    null
                                                )
                                              }
                                            />
                                          </label>

                                          <button
                                            type="submit"
                                            className="candidate-primary"
                                            disabled={bgvBusy}
                                          >
                                            {bgvBusy
                                              ? "Uploading…"
                                              : "Upload corrected document"}
                                          </button>
                                        </form>
                                      )}

                                      {/* UPDATE_PROFILE */}
                                      {action ===
                                        BGV_ACTIONS.UPDATE_PROFILE && (
                                        <div className="candidate-bgv-safe-message">
                                          <p>
                                            Please review and update your
                                            candidate profile information
                                            before HR continues the
                                            verification.
                                          </p>
                                          <p>
                                            After updating your information,
                                            HR can re-check the verification.
                                          </p>
                                        </div>
                                      )}

                                      {/* CLARIFICATION */}
                                      {action ===
                                        BGV_ACTIONS.CLARIFICATION && (
                                        <div className="candidate-bgv-safe-message">
                                          <p>
                                            Please provide the clarification
                                            requested for this verification.
                                          </p>
                                          <p>
                                            HR will review the clarification
                                            and continue the BGV process.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* NO VERIFICATION DATA */}
                        {!portal.bgv.verifications?.length && (
                          <p className="candidate-empty">
                            Background verification has not been started yet.
                          </p>
                        )}

                        {/* SAFE SUMMARY OF ACTIONS */}
                        {!!bgvActionRequired.length && (
                          <div className="candidate-bgv-summary">
                            <strong>
                              {bgvActionRequired.length} verification
                              {bgvActionRequired.length > 1 ? "s" : ""} require
                              {bgvActionRequired.length === 1 ? "s" : ""} your
                              action.
                            </strong>
                            <p>
                              Complete the requested action above and HR will
                              review the updated information or document.
                            </p>
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}