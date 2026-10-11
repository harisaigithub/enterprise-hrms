import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    AlertTriangle,
    BadgeCheck,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    CircleHelp,
    ClipboardCheck,
    Eye,
    FileCheck2,
    FileText,
    GraduationCap,
    Hash,
    Home,
    IdCard,
    Info,
    MapPin,
    RefreshCw,
    Save,
    ShieldCheck,
    Sparkles,
    UserRound,
    UsersRound,
    X,
    XCircle,
} from "lucide-react";

import {
    saveBgvVerificationFields,
    compareBgvVerificationFields,
    requestBgvCandidateAction,
    startBgvVerification,
    completeBgvVerification,
} from "../../services/bgvService";

const FIELD_CONFIG = {
    IDENTITY: [
        "fullName",
        "dateOfBirth",
        "gender",
        "fatherName",
        "motherName",
        "address",
        "city",
        "state",
        "postalCode",
    ],
    ADDRESS: ["address", "city", "state", "country", "postalCode"],
    EDUCATION: [
        "highestEducation",
        "degree",
        "specialization",
        "collegeName",
        "passingYear",
    ],
    EMPLOYMENT: [
        "currentCompany",
        "currentDesignation",
        "totalExperienceYears",
    ],
    DOCUMENT: ["fullName", "dateOfBirth", "gender"],
    REFERENCE: ["fullName", "currentCompany", "currentDesignation"],
    CRIMINAL: ["fullName", "dateOfBirth"],
    CUSTOM: ["fullName"],
};

const LABELS = {
    fullName: "Full Name",
    dateOfBirth: "Date of Birth",
    gender: "Gender",
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    address: "Address",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "Postal Code",
    highestEducation: "Highest Education",
    degree: "Degree",
    specialization: "Specialization",
    collegeName: "College / University",
    passingYear: "Passing Year",
    currentCompany: "Company",
    currentDesignation: "Designation",
    totalExperienceYears: "Experience (Years)",
};

const FIELD_ICONS = {
    fullName: UserRound,
    dateOfBirth: CalendarDays,
    gender: UsersRound,
    fatherName: UserRound,
    motherName: UserRound,
    address: Home,
    city: MapPin,
    state: MapPin,
    country: MapPin,
    postalCode: Hash,
    highestEducation: GraduationCap,
    degree: GraduationCap,
    specialization: Sparkles,
    collegeName: Building2,
    passingYear: CalendarDays,
    currentCompany: Building2,
    currentDesignation: BadgeCheck,
    totalExperienceYears: ClipboardCheck,
};

const TYPE_META = {
    IDENTITY: {
        label: "Identity Verification",
        icon: IdCard,
        description: "Verify personal identity details against the candidate profile.",
    },
    ADDRESS: {
        label: "Address Verification",
        icon: Home,
        description: "Verify the residential address shown on the submitted document.",
    },
    EDUCATION: {
        label: "Education Verification",
        icon: GraduationCap,
        description: "Verify academic qualification and institution details.",
    },
    EMPLOYMENT: {
        label: "Employment Verification",
        icon: Building2,
        description: "Verify current or previous employment information.",
    },
    DOCUMENT: {
        label: "Document Verification",
        icon: FileText,
        description: "Verify general document identity information.",
    },
    REFERENCE: {
        label: "Reference Verification",
        icon: UsersRound,
        description: "Verify reference and professional information.",
    },
    CRIMINAL: {
        label: "Criminal Verification",
        icon: ShieldCheck,
        description: "Verify identity details for criminal background screening.",
    },
    CUSTOM: {
        label: "Custom Verification",
        icon: ClipboardCheck,
        description: "Review the configured custom verification fields.",
    },
};

const STATUS_META = {
    MATCH: {
        label: "MATCH",
        icon: CheckCircle2,
        className: "bgv-status-match",
    },
    MISMATCH: {
        label: "MISMATCH",
        icon: XCircle,
        className: "bgv-status-mismatch",
    },
    MISSING: {
        label: "MISSING",
        icon: AlertTriangle,
        className: "bgv-status-missing",
    },
    NOT_CHECKED: {
        label: "NOT CHECKED",
        icon: CircleHelp,
        className: "bgv-status-not-checked",
    },
};

function profileValue(candidate, field) {
    if (!candidate) return "";
    if (field === "fullName") {
        return [candidate.firstName, candidate.lastName]
            .filter(Boolean)
            .join(" ");
    }

    const value = candidate[field];
    if (value === null || value === undefined) return "";
    if (field === "dateOfBirth") return String(value).slice(0, 10);

    return String(value);
}

export default function BgvVerificationEvidenceCard({
    verification,
    candidate,
    canOperate = true,
    onRefresh,
    onViewDocument,
}) {
    const verificationType = verification?.type || "CUSTOM";
    const configuredFields =
        FIELD_CONFIG[verificationType] || FIELD_CONFIG.CUSTOM;

    const typeMeta = TYPE_META[verificationType] || TYPE_META.CUSTOM;
    const TypeIcon = typeMeta.icon;

    const [values, setValues] = useState({});
    const [remarks, setRemarks] = useState({});
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [comparison, setComparison] = useState(null);

    const fields = useMemo(() => {
        const existing = verification.fields || [];
        const byName = new Map(
            existing.map((item) => [item.fieldName, item])
        );

        return configuredFields.map(
            (fieldName) =>
                byName.get(fieldName) || {
                    fieldName,
                    actualValue: "",
                    expectedValue: profileValue(candidate, fieldName),
                    matchStatus: "NOT_CHECKED",
                    remarks: "",
                }
        );
    }, [verification.fields, configuredFields, candidate]);

    useEffect(() => {
        const next = {};
        const nextRemarks = {};

        fields.forEach((field) => {
            next[field.fieldName] = field.actualValue || "";
            nextRemarks[field.fieldName] = field.remarks || "";
        });

        setValues(next);
        setRemarks(nextRemarks);
        setComparison(null);
    }, [verification.id, verification.fields]);

    const setValue = (fieldName, value) => {
        setValues((prev) => ({ ...prev, [fieldName]: value }));
    };

    const save = async () => {
        setBusy("save");
        setError("");
        setNotice("");

        try {
            const response = await saveBgvVerificationFields(
                verification.id,
                {
                    fields: fields.map((field) => ({
                        id: field.id,
                        fieldName: field.fieldName,
                        actualValue: values[field.fieldName] || "",
                        remarks:
                            remarks[field.fieldName] || undefined,
                    })),
                }
            );

            setNotice("Document data saved and comparison completed.");
            setComparison(response.data?.summary || null);
            await onRefresh?.();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Failed to save document data"
            );
        } finally {
            setBusy("");
        }
    };

    const compare = async () => {
        setBusy("compare");
        setError("");
        setNotice("");

        try {
            const response = await compareBgvVerificationFields(
                verification.id
            );

            setComparison(
                response.data?.summary || response.summary || null
            );
            setNotice("Candidate profile comparison refreshed.");
            await onRefresh?.();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Comparison failed"
            );
        } finally {
            setBusy("");
        }
    };

    const candidateAction = async () => {
        const message = window.prompt(
            "Tell the candidate what must be corrected or re-uploaded:",
            "Please upload a corrected document because one or more fields do not match your submitted profile."
        );

        if (!message?.trim()) return;

        setBusy("candidate");
        setError("");
        setNotice("");

        try {
            await requestBgvCandidateAction(verification.id, {
                remarks: message.trim(),
            });

            setNotice("Candidate action requested.");
            await onRefresh?.();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Failed to request candidate action"
            );
        } finally {
            setBusy("");
        }
    };

    const start = async () => {
        setBusy("start");
        setError("");
        setNotice("");

        try {
            await startBgvVerification(verification.id);
            setNotice("Verification started.");
            await onRefresh?.();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Failed to start verification"
            );
        } finally {
            setBusy("");
        }
    };

    const clear = async () => {
        setBusy("complete");
        setError("");
        setNotice("");

        try {
            await completeBgvVerification(verification.id, {
                result: "CLEAR",
                remarks:
                    "All configured document fields matched candidate profile data.",
            });

            setNotice("Verification cleared successfully.");
            await onRefresh?.();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Cannot complete verification"
            );
        } finally {
            setBusy("");
        }
    };

    const mismatchCount =
        comparison?.mismatch ??
        fields.filter((f) => f.matchStatus === "MISMATCH").length;

    const missingCount =
        comparison?.missing ??
        fields.filter((f) => f.matchStatus === "MISSING").length;

    const notCheckedCount =
        comparison?.notChecked ??
        fields.filter((f) => f.matchStatus === "NOT_CHECKED").length;

    const matchedCount =
        comparison?.matched ??
        fields.filter((f) => f.matchStatus === "MATCH").length;

    const completableStatuses = [
        "IN_PROGRESS",
        "SUBMITTED",
        "UNDER_REVIEW",
        "DISCREPANCY",
    ];

    const allValuesEntered = fields.every((f) =>
        (values[f.fieldName] || "").trim()
    );

    const canClear =
        completableStatuses.includes(verification.status) &&
        fields.length > 0 &&
        mismatchCount === 0 &&
        missingCount === 0 &&
        notCheckedCount === 0 &&
        allValuesEntered;

    const checkedCount = matchedCount + mismatchCount + missingCount;
    const progress =
        fields.length > 0
            ? Math.round((checkedCount / fields.length) * 100)
            : 0;

    const isCompleted = verification.status === "COMPLETED";
    const hasProblem = mismatchCount > 0 || missingCount > 0;

    return (
        <section className="bgv-card">
            <style>{`
                .bgv-card {
                    --bgv-border: var(--border, #e5e7eb);
                    --bgv-card: var(--card, #ffffff);
                    --bgv-bg: var(--background, #f8fafc);
                    --bgv-text: var(--text, #0f172a);
                    --bgv-subtext: var(--subtext, #64748b);
                    width: 100%;
                    box-sizing: border-box;
                    margin-top: 16px;
                    border: 1px solid var(--bgv-border);
                    border-radius: 18px;
                    background: var(--bgv-card);
                    overflow: hidden;
                    box-shadow: 0 8px 28px rgba(15, 23, 42, .06);
                    color: var(--bgv-text);
                }

                .bgv-header {
                    padding: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    border-bottom: 1px solid var(--bgv-border);
                    background: linear-gradient(180deg, rgba(248,250,252,.95), var(--bgv-card));
                }

                .bgv-title-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }

                .bgv-type-icon {
                    width: 44px;
                    height: 44px;
                    flex: 0 0 44px;
                    border-radius: 13px;
                    display: grid;
                    place-items: center;
                    background: #eff6ff;
                    color: #2563eb;
                    border: 1px solid #dbeafe;
                }

                .bgv-title {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 850;
                    letter-spacing: -.01em;
                }

                .bgv-subtitle {
                    margin-top: 4px;
                    color: var(--bgv-subtext);
                    font-size: 11px;
                    line-height: 1.5;
                }

                .bgv-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 7px 10px;
                    border-radius: 999px;
                    background: var(--bgv-bg);
                    border: 1px solid var(--bgv-border);
                    font-size: 10px;
                    font-weight: 850;
                    white-space: nowrap;
                }

                .bgv-document {
                    margin: 14px 18px 0;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    border: 1px solid var(--bgv-border);
                    border-radius: 13px;
                    background: var(--bgv-bg);
                }

                .bgv-document-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .bgv-document-icon {
                    width: 36px;
                    height: 36px;
                    flex: 0 0 36px;
                    display: grid;
                    place-items: center;
                    border-radius: 10px;
                    background: var(--bgv-card);
                    border: 1px solid var(--bgv-border);
                }

                .bgv-document-name {
                    font-size: 12px;
                    font-weight: 800;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .bgv-document-type {
                    color: var(--bgv-subtext);
                    font-size: 10px;
                    margin-top: 3px;
                }

                .bgv-body {
                    padding: 18px;
                }

                .bgv-alert {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    margin-bottom: 12px;
                    padding: 11px 12px;
                    border-radius: 11px;
                    font-size: 11px;
                    line-height: 1.5;
                }

                .bgv-alert-error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                .bgv-alert-success {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }

                .bgv-summary {
                    display: grid;
                    grid-template-columns: minmax(180px, 1fr) auto;
                    gap: 18px;
                    align-items: center;
                    padding: 14px;
                    margin-bottom: 14px;
                    border: 1px solid var(--bgv-border);
                    border-radius: 14px;
                    background: var(--bgv-bg);
                }

                .bgv-progress-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 7px;
                    font-size: 11px;
                    font-weight: 750;
                }

                .bgv-progress-track {
                    height: 7px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: #e2e8f0;
                }

                .bgv-progress-fill {
                    height: 100%;
                    border-radius: inherit;
                    background: #2563eb;
                    transition: width .25s ease;
                }

                .bgv-counts {
                    display: flex;
                    gap: 7px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .bgv-count {
                    min-width: 58px;
                    padding: 7px 9px;
                    text-align: center;
                    border-radius: 10px;
                    border: 1px solid var(--bgv-border);
                    background: var(--bgv-card);
                }

                .bgv-count strong {
                    display: block;
                    font-size: 14px;
                }

                .bgv-count span {
                    display: block;
                    margin-top: 2px;
                    color: var(--bgv-subtext);
                    font-size: 8px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .bgv-fields {
                    display: grid;
                    gap: 9px;
                }

                .bgv-field {
                    border: 1px solid var(--bgv-border);
                    border-radius: 14px;
                    padding: 12px;
                    background: var(--bgv-card);
                }

                .bgv-field-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .bgv-field-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    font-size: 11px;
                    font-weight: 800;
                }

                .bgv-field-icon {
                    width: 28px;
                    height: 28px;
                    flex: 0 0 28px;
                    display: grid;
                    place-items: center;
                    border-radius: 8px;
                    background: var(--bgv-bg);
                    color: #475569;
                    border: 1px solid var(--bgv-border);
                }

                .bgv-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 5px 8px;
                    border-radius: 999px;
                    font-size: 8px;
                    font-weight: 900;
                    white-space: nowrap;
                }

                .bgv-status-match {
                    color: #166534;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                }

                .bgv-status-mismatch {
                    color: #991b1b;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                }

                .bgv-status-missing {
                    color: #92400e;
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                }

                .bgv-status-not-checked {
                    color: #475569;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                }

                .bgv-values {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 10px;
                }

                .bgv-value-box {
                    min-width: 0;
                    padding: 9px;
                    border-radius: 10px;
                    background: var(--bgv-bg);
                    border: 1px solid var(--bgv-border);
                }

                .bgv-value-label {
                    margin-bottom: 5px;
                    color: var(--bgv-subtext);
                    font-size: 8px;
                    font-weight: 850;
                    letter-spacing: .05em;
                    text-transform: uppercase;
                }

                .bgv-expected {
                    min-height: 32px;
                    display: flex;
                    align-items: center;
                    font-size: 11px;
                    line-height: 1.45;
                    overflow-wrap: anywhere;
                }

                .bgv-input {
                    width: 100%;
                    min-height: 34px;
                    box-sizing: border-box;
                    border: 1px solid var(--bgv-border);
                    border-radius: 8px;
                    padding: 7px 9px;
                    background: var(--bgv-card);
                    color: var(--bgv-text);
                    outline: none;
                    font: inherit;
                    font-size: 11px;
                }

                .bgv-input:focus {
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 3px rgba(37,99,235,.10);
                }

                .bgv-input:disabled {
                    opacity: .65;
                    cursor: not-allowed;
                }

                .bgv-field-remark {
                    margin-top: 8px;
                }

                .bgv-actions {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-top: 15px;
                    padding-top: 14px;
                    border-top: 1px solid var(--bgv-border);
                }

                .bgv-actions-left {
                    font-size: 10px;
                    color: var(--bgv-subtext);
                }

                .bgv-actions-right {
                    display: flex;
                    gap: 7px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .bgv-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    min-height: 35px;
                    padding: 7px 11px;
                    border-radius: 9px;
                    border: 1px solid var(--bgv-border);
                    background: var(--bgv-card);
                    color: var(--bgv-text);
                    font-size: 10px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: .15s ease;
                }

                .bgv-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(15,23,42,.08);
                }

                .bgv-btn:disabled {
                    opacity: .55;
                    cursor: not-allowed;
                }

                .bgv-btn-primary {
                    color: #fff;
                    background: #2563eb;
                    border-color: #2563eb;
                }

                .bgv-btn-success {
                    color: #fff;
                    background: #16a34a;
                    border-color: #16a34a;
                }

                .bgv-btn-warning {
                    color: #92400e;
                    background: #fffbeb;
                    border-color: #fde68a;
                }

                .bgv-btn-danger {
                    color: #991b1b;
                    background: #fef2f2;
                    border-color: #fecaca;
                }

                .bgv-problem {
                    display: flex;
                    gap: 9px;
                    align-items: flex-start;
                    margin-top: 12px;
                    padding: 12px;
                    border-radius: 11px;
                    color: #991b1b;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    font-size: 10px;
                    line-height: 1.5;
                }

                .bgv-complete {
                    display: flex;
                    gap: 9px;
                    align-items: flex-start;
                    margin-top: 12px;
                    padding: 12px;
                    border-radius: 11px;
                    color: #166534;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    font-size: 10px;
                    line-height: 1.5;
                }

                @media (max-width: 760px) {
                    .bgv-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .bgv-status-pill {
                        width: 100%;
                        justify-content: center;
                    }

                    .bgv-summary {
                        grid-template-columns: 1fr;
                    }

                    .bgv-counts {
                        justify-content: stretch;
                    }

                    .bgv-count {
                        flex: 1;
                    }

                    .bgv-values {
                        grid-template-columns: 1fr;
                    }

                    .bgv-actions {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .bgv-actions-right {
                        justify-content: stretch;
                    }

                    .bgv-btn {
                        flex: 1 1 calc(50% - 7px);
                    }
                }

                @media (max-width: 480px) {
                    .bgv-header,
                    .bgv-body {
                        padding: 13px;
                    }

                    .bgv-document {
                        margin: 12px 13px 0;
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .bgv-document .bgv-btn {
                        width: 100%;
                    }

                    .bgv-title {
                        font-size: 14px;
                    }

                    .bgv-field {
                        padding: 10px;
                    }

                    .bgv-field-top {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .bgv-status {
                        align-self: flex-start;
                    }

                    .bgv-btn {
                        flex: 1 1 100%;
                        width: 100%;
                    }
                }
            `}</style>

            <header className="bgv-header">
                <div className="bgv-title-row">
                    <div className="bgv-type-icon">
                        <TypeIcon size={21} />
                    </div>

                    <div>
                        <h3 className="bgv-title">{typeMeta.label}</h3>
                        <div className="bgv-subtitle">
                            {typeMeta.description}
                        </div>
                    </div>
                </div>

                <div className="bgv-status-pill">
                    {isCompleted ? (
                        <CheckCircle2 size={14} />
                    ) : (
                        <ShieldCheck size={14} />
                    )}
                    {verification.status || "PENDING"}
                </div>
            </header>

            {error && (
                <div className="bgv-body">
                    <div className="bgv-alert bgv-alert-error">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {notice && (
                <div className="bgv-body">
                    <div className="bgv-alert bgv-alert-success">
                        <CheckCircle2 size={16} />
                        <span>{notice}</span>
                    </div>
                </div>
            )}

            {verification.candidateDocument && (
                <div className="bgv-document">
                    <div className="bgv-document-info">
                        <div className="bgv-document-icon">
                            <FileCheck2 size={17} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <div className="bgv-document-name">
                                {verification.candidateDocument.fileName}
                            </div>
                            <div className="bgv-document-type">
                                {verification.candidateDocument.documentType ||
                                    "Candidate document"}
                            </div>
                        </div>
                    </div>

                    {onViewDocument && (
                        <button
                            type="button"
                            className="bgv-btn"
                            onClick={() =>
                                onViewDocument(
                                    verification.candidateDocument
                                )
                            }
                        >
                            <Eye size={14} />
                            View Document
                        </button>
                    )}
                </div>
            )}

            <div className="bgv-body">
                <div className="bgv-summary">
                    <div>
                        <div className="bgv-progress-head">
                            <span>Verification progress</span>
                            <strong>{progress}%</strong>
                        </div>

                        <div className="bgv-progress-track">
                            <div
                                className="bgv-progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 6,
                                color: "var(--bgv-subtext)",
                                fontSize: 9,
                            }}
                        >
                            {checkedCount} of {fields.length} fields reviewed
                        </div>
                    </div>

                    <div className="bgv-counts">
                        <div className="bgv-count">
                            <strong>{matchedCount}</strong>
                            <span>Matched</span>
                        </div>

                        <div className="bgv-count">
                            <strong>{mismatchCount}</strong>
                            <span>Mismatch</span>
                        </div>

                        <div className="bgv-count">
                            <strong>{missingCount}</strong>
                            <span>Missing</span>
                        </div>

                        <div className="bgv-count">
                            <strong>{notCheckedCount}</strong>
                            <span>Pending</span>
                        </div>
                    </div>
                </div>

                <div className="bgv-fields">
                    {fields.map((field) => {
                        const status =
                            field.matchStatus || "NOT_CHECKED";
                        const meta =
                            STATUS_META[status] ||
                            STATUS_META.NOT_CHECKED;

                        const StatusIcon = meta.icon;
                        const FieldIcon =
                            FIELD_ICONS[field.fieldName] || Info;

                        return (
                            <article
                                key={field.fieldName}
                                className="bgv-field"
                            >
                                <div className="bgv-field-top">
                                    <div className="bgv-field-label">
                                        <span className="bgv-field-icon">
                                            <FieldIcon size={14} />
                                        </span>
                                        <span>
                                            {LABELS[field.fieldName] ||
                                                field.fieldName}
                                        </span>
                                    </div>

                                    <span
                                        className={`bgv-status ${meta.className}`}
                                    >
                                        <StatusIcon size={11} />
                                        {meta.label}
                                    </span>
                                </div>

                                <div className="bgv-values">
                                    <div className="bgv-value-box">
                                        <div className="bgv-value-label">
                                            Candidate Profile
                                        </div>

                                        <div className="bgv-expected">
                                            {field.expectedValue ||
                                                profileValue(
                                                    candidate,
                                                    field.fieldName
                                                ) ||
                                                "—"}
                                        </div>
                                    </div>

                                    <div className="bgv-value-box">
                                        <div className="bgv-value-label">
                                            Document Data
                                        </div>

                                        <input
                                            className="bgv-input"
                                            disabled={!canOperate}
                                            value={
                                                values[field.fieldName] ||
                                                ""
                                            }
                                            onChange={(e) =>
                                                setValue(
                                                    field.fieldName,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter value from document"
                                        />
                                    </div>
                                </div>

                                <div className="bgv-field-remark">
                                    <input
                                        className="bgv-input"
                                        disabled={!canOperate}
                                        value={
                                            remarks[field.fieldName] || ""
                                        }
                                        onChange={(e) =>
                                            setRemarks((prev) => ({
                                                ...prev,
                                                [field.fieldName]:
                                                    e.target.value,
                                            }))
                                        }
                                        placeholder="Optional field remark"
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="bgv-actions">
                    <div className="bgv-actions-left">
                        <b>{fields.length}</b> fields configured for this
                        verification
                    </div>

                    <div className="bgv-actions-right">
                        {verification.status === "ASSIGNED" &&
                            canOperate && (
                                <button
                                    type="button"
                                    className="bgv-btn bgv-btn-primary"
                                    onClick={start}
                                    disabled={!!busy}
                                >
                                    <ShieldCheck size={14} />
                                    {busy === "start"
                                        ? "Starting..."
                                        : "Start Verification"}
                                </button>
                            )}

                        {canOperate && (
                            <button
                                type="button"
                                className="bgv-btn bgv-btn-primary"
                                onClick={save}
                                disabled={busy === "save"}
                            >
                                <Save size={14} />
                                {busy === "save"
                                    ? "Saving..."
                                    : "Save & Compare"}
                            </button>
                        )}

                        {canOperate && (
                            <button
                                type="button"
                                className="bgv-btn"
                                onClick={compare}
                                disabled={busy === "compare"}
                            >
                                <RefreshCw size={14} />
                                {busy === "compare"
                                    ? "Comparing..."
                                    : "Re-compare"}
                            </button>
                        )}

                        {canOperate &&
                            !canClear &&
                            hasProblem && (
                                <button
                                    type="button"
                                    className="bgv-btn bgv-btn-warning"
                                    onClick={candidateAction}
                                    disabled={busy === "candidate"}
                                >
                                    <UserRound size={14} />
                                    {busy === "candidate"
                                        ? "Requesting..."
                                        : "Candidate Action"}
                                </button>
                            )}

                        {canOperate &&
                            canClear &&
                            !isCompleted && (
                                <button
                                    type="button"
                                    className="bgv-btn bgv-btn-success"
                                    onClick={clear}
                                    disabled={busy === "complete"}
                                >
                                    <Check size={14} />
                                    {busy === "complete"
                                        ? "Clearing..."
                                        : "Clear Verification"}
                                </button>
                            )}
                    </div>
                </div>

                {hasProblem && (
                    <div className="bgv-problem">
                        <AlertTriangle size={16} />
                        <span>
                            <b>Discrepancy detected.</b> Do not clear this
                            verification. Review the highlighted document
                            values and request the appropriate candidate
                            action.
                        </span>
                    </div>
                )}

                {isCompleted && !hasProblem && (
                    <div className="bgv-complete">
                        <BadgeCheck size={16} />
                        <span>
                            <b>Verification completed.</b> All configured
                            document fields have passed the comparison gate.
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}
