import { useEffect, useState } from "react";
import {
  Save,
  UserCheck,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  UsersRound,
  MapPin,
  Home,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  Clock3,
  LocateFixed,
  Globe2,
  Hash,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { updateBgvCandidateProfile } from "../../services/bgvService";

const FIELDS = [
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["dateOfBirth", "Date of Birth"],
  ["gender", "Gender"],
  ["fatherName", "Father's Name"],
  ["motherName", "Mother's Name"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
  ["postalCode", "Postal Code"],
  ["highestEducation", "Highest Education"],
  ["degree", "Degree"],
  ["specialization", "Specialization"],
  ["collegeName", "College / University"],
  ["passingYear", "Passing Year"],
  ["totalExperienceYears", "Experience (Years)"],
  ["currentCompany", "Current Company"],
  ["currentDesignation", "Current Designation"],
  ["noticePeriodDays", "Notice Period (Days)"],
  ["currentLocation", "Current Location"],
];

const SECTIONS = [
  {
    key: "personal",
    title: "Personal Information",
    description: "Core identity details used as the master BGV reference.",
    icon: UserRound,
    fields: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "fatherName",
      "motherName",
    ],
  },
  {
    key: "contact",
    title: "Contact Information",
    description: "Contact details used when validating candidate documents.",
    icon: Mail,
    fields: ["email", "phone"],
  },
  {
    key: "address",
    title: "Address Information",
    description: "Current and permanent address information for verification.",
    icon: MapPin,
    fields: ["address", "city", "state", "country", "postalCode", "currentLocation"],
  },
  {
    key: "education",
    title: "Education",
    description: "Academic information used for education verification.",
    icon: GraduationCap,
    fields: [
      "highestEducation",
      "degree",
      "specialization",
      "collegeName",
      "passingYear",
    ],
  },
  {
    key: "employment",
    title: "Employment",
    description: "Professional history and current employment information.",
    icon: BriefcaseBusiness,
    fields: [
      "totalExperienceYears",
      "currentCompany",
      "currentDesignation",
      "noticePeriodDays",
    ],
  },
];

const FIELD_META = {
  firstName: { icon: UserRound, type: "text", placeholder: "Enter first name" },
  lastName: { icon: UserRound, type: "text", placeholder: "Enter last name" },
  email: { icon: Mail, type: "email", placeholder: "candidate@example.com" },
  phone: { icon: Phone, type: "tel", placeholder: "Enter phone number" },
  dateOfBirth: { icon: CalendarDays, type: "date", placeholder: "" },
  gender: { icon: UsersRound, type: "text", placeholder: "e.g. Male / Female / Other" },
  fatherName: { icon: UserRound, type: "text", placeholder: "Enter father's name" },
  motherName: { icon: UserRound, type: "text", placeholder: "Enter mother's name" },
  address: { icon: Home, type: "text", placeholder: "Enter full address" },
  city: { icon: MapPin, type: "text", placeholder: "Enter city" },
  state: { icon: MapPin, type: "text", placeholder: "Enter state" },
  country: { icon: Globe2, type: "text", placeholder: "Enter country" },
  postalCode: { icon: Hash, type: "text", placeholder: "Enter postal code" },
  highestEducation: { icon: GraduationCap, type: "text", placeholder: "e.g. Bachelor's, Master's" },
  degree: { icon: GraduationCap, type: "text", placeholder: "Enter degree" },
  specialization: { icon: GraduationCap, type: "text", placeholder: "Enter specialization" },
  collegeName: { icon: Building2, type: "text", placeholder: "Enter college / university" },
  passingYear: { icon: CalendarDays, type: "number", placeholder: "e.g. 2024" },
  totalExperienceYears: { icon: BriefcaseBusiness, type: "number", placeholder: "e.g. 3.5" },
  currentCompany: { icon: Building2, type: "text", placeholder: "Enter company name" },
  currentDesignation: { icon: BriefcaseBusiness, type: "text", placeholder: "Enter designation" },
  noticePeriodDays: { icon: Clock3, type: "number", placeholder: "e.g. 30" },
  currentLocation: { icon: LocateFixed, type: "text", placeholder: "Enter current location" },
};

const getInitialForm = (candidate) => {
  const next = {};
  FIELDS.forEach(([key]) => {
    const value = candidate?.[key];
    next[key] =
      value == null
        ? ""
        : key === "dateOfBirth"
          ? String(value).slice(0, 10)
          : String(value);
  });
  return next;
};

export default function BgvCandidateProfileEditor({
  candidate,
  canOperate = true,
  onSaved,
}) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(getInitialForm(candidate));
    setMessage("");
    setError("");
  }, [candidate]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (message) setMessage("");
    if (error) setError("");
  };

  const save = async () => {
    if (!candidate?.id || busy || !canOperate) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await updateBgvCandidateProfile(candidate.id, form);
      setMessage(
        "HR verified candidate profile saved successfully. All BGV comparisons will use these values."
      );
      await onSaved?.();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to save candidate profile"
      );
    } finally {
      setBusy(false);
    }
  };

  if (!candidate) return null;

  return (
    <div className="bgv-profile-editor">
      <style>{`
        .bgv-profile-editor {
          --bgv-primary: #2563eb;
          --bgv-primary-dark: #1d4ed8;
          --bgv-primary-soft: #eff6ff;
          --bgv-success: #16a34a;
          --bgv-success-soft: #f0fdf4;
          --bgv-danger: #dc2626;
          --bgv-danger-soft: #fef2f2;
          --bgv-text: var(--text, #172033);
          --bgv-subtext: var(--subtext, #64748b);
          --bgv-card: var(--card, #ffffff);
          --bgv-border: var(--border, #e2e8f0);
          width: 100%;
          margin-top: 16px;
          color: var(--bgv-text);
          box-sizing: border-box;
        }

        .bgv-profile-editor *,
        .bgv-profile-editor *::before,
        .bgv-profile-editor *::after {
          box-sizing: border-box;
        }

        .bgv-profile-shell {
          overflow: hidden;
          border: 1px solid var(--bgv-border);
          border-radius: 18px;
          background: var(--bgv-card);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
        }

        .bgv-profile-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border-bottom: 1px solid var(--bgv-border);
          background:
            radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.10), transparent 32%),
            linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 1));
        }

        .bgv-profile-title-row {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          min-width: 0;
        }

        .bgv-profile-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          border: 1px solid #bfdbfe;
          border-radius: 13px;
          color: var(--bgv-primary);
          background: var(--bgv-primary-soft);
        }

        .bgv-profile-heading {
          min-width: 0;
        }

        .bgv-profile-heading h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .bgv-profile-heading p {
          margin: 5px 0 0;
          max-width: 700px;
          color: var(--bgv-subtext);
          font-size: 12px;
          line-height: 1.55;
        }

        .bgv-master-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 9px;
          padding: 5px 9px;
          border: 1px solid #bbf7d0;
          border-radius: 999px;
          color: #166534;
          background: #f0fdf4;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bgv-save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 9px 14px;
          border: 1px solid var(--bgv-primary);
          border-radius: 10px;
          color: #fff;
          background: var(--bgv-primary);
          box-shadow: 0 5px 12px rgba(37, 99, 235, 0.20);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.18s ease;
          white-space: nowrap;
        }

        .bgv-save-btn:hover:not(:disabled) {
          background: var(--bgv-primary-dark);
          transform: translateY(-1px);
        }

        .bgv-save-btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
          transform: none;
        }

        .bgv-spin {
          animation: bgv-spin 0.85s linear infinite;
        }

        @keyframes bgv-spin {
          to { transform: rotate(360deg); }
        }

        .bgv-save-btn svg {
          flex: 0 0 auto;
        }

        .bgv-status-area {
          padding: 14px 20px 0;
        }

        .bgv-status {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          border-radius: 11px;
          font-size: 11px;
          line-height: 1.5;
        }

        .bgv-status.success {
          border: 1px solid #bbf7d0;
          color: #166534;
          background: var(--bgv-success-soft);
        }

        .bgv-status.error {
          border: 1px solid #fecaca;
          color: #991b1b;
          background: var(--bgv-danger-soft);
        }

        .bgv-status svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .bgv-info-strip {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 14px 20px 0;
          padding: 10px 12px;
          border: 1px solid #dbeafe;
          border-radius: 11px;
          color: #1e40af;
          background: #eff6ff;
          font-size: 10px;
          line-height: 1.5;
        }

        .bgv-info-strip svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .bgv-sections {
          display: grid;
          gap: 12px;
          padding: 16px 20px 20px;
        }

        .bgv-section {
          overflow: hidden;
          border: 1px solid var(--bgv-border);
          border-radius: 14px;
          background: var(--bgv-card);
        }

        .bgv-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--bgv-border);
          background: #f8fafc;
        }

        .bgv-section-icon {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: grid;
          place-items: center;
          border: 1px solid #dbeafe;
          border-radius: 9px;
          color: var(--bgv-primary);
          background: #eff6ff;
        }

        .bgv-section-heading {
          min-width: 0;
        }

        .bgv-section-heading h4 {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
        }

        .bgv-section-heading p {
          margin: 3px 0 0;
          color: var(--bgv-subtext);
          font-size: 10px;
          line-height: 1.4;
        }

        .bgv-fields {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
        }

        .bgv-field {
          min-width: 0;
        }

        .bgv-field.full {
          grid-column: 1 / -1;
        }

        .bgv-field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
          color: var(--bgv-text);
          font-size: 10px;
          font-weight: 800;
        }

        .bgv-field-label svg {
          color: #64748b;
          flex: 0 0 auto;
        }

        .bgv-required {
          color: var(--bgv-danger);
        }

        .bgv-input-wrap {
          position: relative;
        }

        .bgv-input {
          width: 100%;
          min-height: 39px;
          padding: 9px 10px;
          border: 1px solid var(--bgv-border);
          border-radius: 9px;
          outline: none;
          color: var(--bgv-text);
          background: #fff;
          font: inherit;
          font-size: 11px;
          transition: 0.16s ease;
        }

        .bgv-input::placeholder {
          color: #94a3b8;
        }

        .bgv-input:hover:not(:disabled) {
          border-color: #cbd5e1;
        }

        .bgv-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
        }

        .bgv-input:disabled {
          color: #64748b;
          background: #f8fafc;
          cursor: not-allowed;
        }

        .bgv-field-help {
          margin-top: 4px;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.35;
        }

        .bgv-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 20px;
          border-top: 1px solid var(--bgv-border);
          background: #f8fafc;
        }

        .bgv-footer-note {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          color: var(--bgv-subtext);
          font-size: 10px;
          line-height: 1.45;
        }

        .bgv-footer-note svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .bgv-footer .bgv-save-btn {
          min-width: 130px;
        }

        @media (max-width: 900px) {
          .bgv-fields {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .bgv-profile-header {
            flex-direction: column;
          }

          .bgv-save-btn {
            width: 100%;
          }

          .bgv-status-area {
            padding-left: 14px;
            padding-right: 14px;
          }

          .bgv-info-strip {
            margin-left: 14px;
            margin-right: 14px;
          }

          .bgv-sections {
            padding: 12px 14px 14px;
          }

          .bgv-footer {
            padding: 12px 14px;
            flex-direction: column;
            align-items: stretch;
          }

          .bgv-footer .bgv-save-btn {
            width: 100%;
          }
        }

        @media (max-width: 500px) {
          .bgv-profile-shell {
            border-radius: 14px;
          }

          .bgv-profile-header {
            padding: 15px;
          }

          .bgv-profile-title-row {
            gap: 10px;
          }

          .bgv-profile-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
            border-radius: 10px;
          }

          .bgv-profile-heading h3 {
            font-size: 14px;
          }

          .bgv-profile-heading p {
            font-size: 11px;
          }

          .bgv-fields {
            grid-template-columns: 1fr;
            padding: 12px;
            gap: 10px;
          }

          .bgv-field.full {
            grid-column: auto;
          }

          .bgv-section-header {
            padding: 11px 12px;
          }

          .bgv-section-heading p {
            display: none;
          }
        }
      `}</style>

      <div className="bgv-profile-shell">
        <div className="bgv-profile-header">
          <div className="bgv-profile-title-row">
            <div className="bgv-profile-icon">
              <UserCheck size={21} strokeWidth={2.2} />
            </div>

            <div className="bgv-profile-heading">
              <h3>HR Verified Candidate Profile</h3>
              <p>
                Maintain the verified candidate master profile used as the
                expected source for every BGV document comparison.
              </p>

              <div className="bgv-master-badge">
                <BadgeCheck size={12} />
                Master BGV Reference
              </div>
            </div>
          </div>

          {canOperate && (
            <button
              type="button"
              className="bgv-save-btn"
              onClick={save}
              disabled={busy}
            >
              {busy ? (
                <Loader2 size={15} className="bgv-spin" />
              ) : (
                <Save size={15} />
              )}
              {busy ? "Saving..." : "Save Profile"}
            </button>
          )}
        </div>

        {(message || error) && (
          <div className="bgv-status-area">
            {message && (
              <div className="bgv-status success" role="status">
                <CheckCircle2 size={16} />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="bgv-status error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        <div className="bgv-info-strip">
          <Info size={14} />
          <span>
            Changes saved here become the expected values for BGV comparison.
            Document data entered by the verifier is compared against this
            profile, not against unsaved form values.
          </span>
        </div>

        <div className="bgv-sections">
          {SECTIONS.map((section) => {
            const SectionIcon = section.icon;

            return (
              <section className="bgv-section" key={section.key}>
                <div className="bgv-section-header">
                  <div className="bgv-section-icon">
                    <SectionIcon size={16} />
                  </div>

                  <div className="bgv-section-heading">
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>
                </div>

                <div className="bgv-fields">
                  {section.fields.map((key) => {
                    const field = FIELDS.find(([fieldKey]) => fieldKey === key);
                    if (!field) return null;

                    const [, label] = field;
                    const meta = FIELD_META[key] || {};
                    const FieldIcon = meta.icon || UserRound;

                    const isLarge =
                      key === "address" ||
                      key === "collegeName" ||
                      key === "specialization";

                    return (
                      <div
                        className={`bgv-field${isLarge ? " full" : ""}`}
                        key={key}
                      >
                        <label className="bgv-field-label" htmlFor={`bgv-${key}`}>
                          <FieldIcon size={12} />
                          <span>{label}</span>
                        </label>

                        <div className="bgv-input-wrap">
                          <input
                            id={`bgv-${key}`}
                            className="bgv-input"
                            disabled={!canOperate || busy}
                            type={meta.type || "text"}
                            value={form[key] || ""}
                            placeholder={meta.placeholder || ""}
                            min={
                              key === "passingYear"
                                ? 1950
                                : key === "totalExperienceYears" ||
                                    key === "noticePeriodDays"
                                  ? 0
                                  : undefined
                            }
                            step={
                              key === "totalExperienceYears" ? "0.1" : undefined
                            }
                            onChange={(e) => update(key, e.target.value)}
                          />
                        </div>

                        {key === "dateOfBirth" && (
                          <div className="bgv-field-help">
                            Age is derived automatically from the verified DOB.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="bgv-footer">
          <div className="bgv-footer-note">
            <BadgeCheck size={13} />
            <span>
              Verify the profile before starting document comparison. Saving
              this profile does not itself complete any BGV verification.
            </span>
          </div>

          {canOperate && (
            <button
              type="button"
              className="bgv-save-btn"
              onClick={save}
              disabled={busy}
            >
              {busy ? <Loader2 size={15} /> : <Save size={15} />}
              {busy ? "Saving..." : "Save Verified Profile"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
