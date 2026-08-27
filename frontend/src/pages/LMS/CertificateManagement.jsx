import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Search,
    Eye,
    Download,
    Ban,
    ShieldCheck,
    X,
    Award,
    Loader2,
} from "lucide-react";

import {
    getAllCertificates,
    downloadCertificate,
    revokeCertificate,
    verifyCertificateById,
} from "../../services/lmsService";

import { saveBlobAsFile } from "../../utils/certificateDownload";


export default function CertificateManagement() {
    const [certificates, setCertificates] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [verifyingId, setVerifyingId] =
        useState(null);

    const [verificationResult, setVerificationResult] =
        useState(null);

    const [selectedCertificate, setSelectedCertificate] =
        useState(null);

    const [revokeTarget, setRevokeTarget] =
        useState(null);

    const [revokeReason, setRevokeReason] =
        useState("");

    const [revoking, setRevoking] =
        useState(false);

    const [downloadingId, setDownloadingId] =
        useState(null);


    /*
     * Load certificates
     */
    const loadCertificates = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await getAllCertificates();

            setCertificates(
                response?.data || []
            );
        } catch (err) {
            console.error(
                "Failed to load certificates:",
                err
            );

            setError(
                err?.response?.data?.message ||
                "Unable to load certificates."
            );
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadCertificates();
    }, []);


    /*
     * Statistics
     */
    const statistics = useMemo(() => {
        const total =
            certificates.length;

        const issued =
            certificates.filter(
                (certificate) =>
                    certificate.status === "ISSUED"
            ).length;

        const expired =
            certificates.filter(
                (certificate) =>
                    certificate.status === "EXPIRED"
            ).length;

        const revoked =
            certificates.filter(
                (certificate) =>
                    certificate.status === "REVOKED"
            ).length;

        return {
            total,
            issued,
            expired,
            revoked,
        };
    }, [certificates]);


    /*
     * Search + filter
     */
    const filteredCertificates =
        useMemo(() => {
            const searchValue =
                search
                    .trim()
                    .toLowerCase();

            return certificates.filter(
                (certificate) => {
                    const employeeName =
                        `${certificate.employee?.firstName || ""} ${certificate.employee?.lastName || ""
                            }`
                            .trim()
                            .toLowerCase();

                    const courseName =
                        certificate.course?.title
                            ?.toLowerCase() || "";

                    const certificateNumber =
                        certificate.certificateNumber
                            ?.toLowerCase() || "";

                    const matchesSearch =
                        !searchValue ||
                        employeeName.includes(
                            searchValue
                        ) ||
                        courseName.includes(
                            searchValue
                        ) ||
                        certificateNumber.includes(
                            searchValue
                        );

                    const matchesStatus =
                        statusFilter === "ALL" ||
                        certificate.status ===
                        statusFilter;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );
        }, [
            certificates,
            search,
            statusFilter,
        ]);


    /*
     * Download certificate
     */
    const handleDownload = async (
        certificate
    ) => {
        try {
            setDownloadingId(
                certificate.id
            );

            const response =
                await downloadCertificate(
                    certificate.id
                );

            saveBlobAsFile(
                response.data,
                `${certificate.certificateNumber}.pdf`
            );

        } catch (err) {
            console.error(
                "Certificate download failed:",
                err
            );

            alert(
                err?.response?.data?.message ||
                "Unable to download certificate."
            );

        } finally {
            setDownloadingId(null);
        }
    };


    const handleVerify = async (
        certificate
    ) => {
        try {
            setVerifyingId(certificate.id);

            const response =
                await verifyCertificateById(
                    certificate.id
                );

            setVerificationResult({
                certificate,
                result: response,
            });
        } catch (err) {
            console.error(
                "Certificate verification failed:",
                err
            );

            alert(
                err?.response?.data?.message ||
                "Unable to verify certificate."
            );
        } finally {
            setVerifyingId(null);
        }
    };


    /*
     * Revoke certificate
     */
    const handleRevoke = async () => {
        if (!revokeTarget) {
            return;
        }

        if (!revokeReason.trim()) {
            return;
        }

        try {
            setRevoking(true);

            await revokeCertificate(
                revokeTarget.id,
                revokeReason.trim()
            );

            setRevokeTarget(null);
            setRevokeReason("");

            await loadCertificates();
        } catch (err) {
            console.error(
                "Certificate revoke failed:",
                err
            );

            alert(
                err?.response?.data?.message ||
                "Unable to revoke certificate."
            );
        } finally {
            setRevoking(false);
        }
    };


    /*
     * Loading
     */
    if (loading) {
        return (
            <div
                style={{
                    padding: 48,
                    textAlign: "center",
                }}
            >
                <Loader2
                    size={30}
                    style={{
                        animation:
                            "spin 1s linear infinite",
                    }}
                />

                <p>
                    Loading certificates...
                </p>
            </div>
        );
    }


    /*
     * Main UI
     */
    return (
        <div
            style={{
                padding: "28px 0 60px",
            }}
        >

            {/* Header */}

            <div
                style={{
                    marginBottom: 28,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <Award
                        size={30}
                        color="var(--primary)"
                    />

                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 26,
                            }}
                        >
                            Certificate Management
                        </h2>

                        <p
                            style={{
                                margin:
                                    "6px 0 0",
                                color:
                                    "var(--muted)",
                            }}
                        >
                            Verify and manage employee
                            learning certificates.
                        </p>
                    </div>
                </div>
            </div>


            {/* Error */}

            {error && (
                <div
                    style={{
                        padding: 14,
                        marginBottom: 20,
                        borderRadius: 10,
                        background:
                            "#fef2f2",
                        color:
                            "#b91c1c",
                    }}
                >
                    {error}
                </div>
            )}


            {/* Statistics */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                    marginBottom: 24,
                }}
            >

                <StatCard
                    title="Total Certificates"
                    value={statistics.total}
                    icon={<Award size={22} />}
                />

                <StatCard
                    title="Issued"
                    value={statistics.issued}
                    icon={
                        <ShieldCheck
                            size={22}
                        />
                    }
                    iconColor="#059669"
                    background="#ecfdf5"
                />

                <StatCard
                    title="Expired"
                    value={statistics.expired}
                    icon={
                        <ShieldCheck
                            size={22}
                        />
                    }
                    iconColor="#d97706"
                    background="#fffbeb"
                />

                <StatCard
                    title="Revoked"
                    value={statistics.revoked}
                    icon={
                        <Ban size={22} />
                    }
                    iconColor="#dc2626"
                    background="#fef2f2"
                />

            </div>


            {/* Search */}

            <div
                style={{
                    background:
                        "var(--card)",
                    border:
                        "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 18,
                }}
            >

                <div
                    style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >

                    <div
                        style={{
                            position:
                                "relative",
                            flex: 1,
                            minWidth: 260,
                        }}
                    >
                        <Search
                            size={19}
                            style={{
                                position:
                                    "absolute",
                                left: 14,
                                top: "50%",
                                transform:
                                    "translateY(-50%)",
                                color:
                                    "var(--muted)",
                            }}
                        />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search employee, course or certificate..."
                            style={{
                                width: "100%",
                                height: 46,
                                padding:
                                    "0 16px 0 44px",
                                border:
                                    "1px solid var(--border)",
                                borderRadius: 10,
                                background:
                                    "var(--background)",
                                color:
                                    "var(--foreground)",
                                boxSizing:
                                    "border-box",
                            }}
                        />
                    </div>


                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                        style={{
                            height: 46,
                            minWidth: 150,
                            padding:
                                "0 14px",
                            border:
                                "1px solid var(--border)",
                            borderRadius: 10,
                            background:
                                "var(--background)",
                            color:
                                "var(--foreground)",
                        }}
                    >
                        <option value="ALL">
                            All Status
                        </option>

                        <option value="ISSUED">
                            Issued
                        </option>

                        <option value="EXPIRED">
                            Expired
                        </option>

                        <option value="REVOKED">
                            Revoked
                        </option>
                    </select>

                </div>

            </div>


            {/* Certificate table */}

            <div
                style={{
                    background:
                        "var(--card)",
                    border:
                        "1px solid var(--border)",
                    borderRadius: 14,
                    overflow: "hidden",
                }}
            >

                <div
                    style={{
                        padding: 20,
                        borderBottom:
                            "1px solid var(--border)",
                    }}
                >
                    <strong>
                        {filteredCertificates.length}{" "}
                        Certificate
                        {filteredCertificates.length !==
                            1
                            ? "s"
                            : ""}
                    </strong>
                </div>


                {filteredCertificates.length ===
                    0 ? (
                    <div
                        style={{
                            padding: 60,
                            textAlign: "center",
                            color:
                                "var(--muted)",
                        }}
                    >
                        <Award
                            size={42}
                            style={{
                                marginBottom: 12,
                            }}
                        />

                        <div>
                            No certificates found.
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            overflowX:
                                "auto",
                        }}
                    >

                        <table
                            style={{
                                width: "100%",
                                borderCollapse:
                                    "collapse",
                            }}
                        >

                            <thead>
                                <tr>
                                    <th style={thStyle}>
                                        Employee
                                    </th>

                                    <th style={thStyle}>
                                        Course
                                    </th>

                                    <th style={thStyle}>
                                        Score
                                    </th>

                                    <th style={thStyle}>
                                        Status
                                    </th>

                                    <th style={thStyle}>
                                        Certificate No.
                                    </th>

                                    <th
                                        style={{
                                            ...thStyle,
                                            textAlign:
                                                "right",
                                        }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>


                            <tbody>

                                {filteredCertificates.map(
                                    (certificate) => {

                                        const employeeName =
                                            `${certificate.employee?.firstName || ""} ${certificate.employee?.lastName || ""
                                                }`.trim();

                                        const score =
                                            certificate.score ??
                                            0;

                                        return (
                                            <tr
                                                key={
                                                    certificate.id
                                                }
                                            >

                                                <td
                                                    style={
                                                        tdStyle
                                                    }
                                                >
                                                    <strong>
                                                        {employeeName ||
                                                            "Unknown Employee"}
                                                    </strong>
                                                </td>


                                                <td
                                                    style={
                                                        tdStyle
                                                    }
                                                >
                                                    {certificate.course
                                                        ?.title ||
                                                        "Unknown Course"}
                                                </td>


                                                <td
                                                    style={
                                                        tdStyle
                                                    }
                                                >
                                                    <strong>
                                                        {score}%
                                                    </strong>
                                                </td>


                                                <td
                                                    style={
                                                        tdStyle
                                                    }
                                                >
                                                    <StatusBadge
                                                        status={
                                                            certificate.status
                                                        }
                                                    />
                                                </td>


                                                <td
                                                    style={
                                                        tdStyle
                                                    }
                                                >
                                                    <span
                                                        style={{
                                                            fontFamily:
                                                                "monospace",
                                                        }}
                                                    >
                                                        {
                                                            certificate.certificateNumber
                                                        }
                                                    </span>
                                                </td>


                                                <td
                                                    style={{
                                                        ...tdStyle,
                                                        textAlign:
                                                            "right",
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "flex-end",
                                                            gap: 8,
                                                            flexWrap:
                                                                "wrap",
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                handleVerify(certificate)
                                                            }
                                                            disabled={
                                                                verifyingId === certificate.id
                                                            }
                                                            style={{
                                                                ...actionButtonStyle,
                                                                background: "#ecfdf5",
                                                                color: "#059669",
                                                            }}
                                                        >
                                                            {verifyingId === certificate.id ? (
                                                                <Loader2
                                                                    size={16}
                                                                    style={{
                                                                        animation:
                                                                            "spin 1s linear infinite",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <ShieldCheck size={16} />
                                                            )}

                                                            Verify
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                setSelectedCertificate(
                                                                    certificate
                                                                )
                                                            }
                                                            style={
                                                                actionButtonStyle
                                                            }
                                                        >
                                                            <Eye
                                                                size={16}
                                                            />
                                                            View
                                                        </button>


                                                        {certificate.status ===
                                                            "ISSUED" && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDownload(
                                                                            certificate
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        downloadingId ===
                                                                        certificate.id
                                                                    }
                                                                    style={{
                                                                        ...actionButtonStyle,
                                                                        background:
                                                                            "#eff6ff",
                                                                        color:
                                                                            "#2563eb",
                                                                    }}
                                                                >
                                                                    {downloadingId ===
                                                                        certificate.id ? (
                                                                        <Loader2
                                                                            size={16}
                                                                            style={{
                                                                                animation:
                                                                                    "spin 1s linear infinite",
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Download
                                                                            size={16}
                                                                        />
                                                                    )}

                                                                    Download
                                                                </button>
                                                            )}


                                                        {certificate.status ===
                                                            "ISSUED" && (
                                                                <button
                                                                    onClick={() =>
                                                                        setRevokeTarget(
                                                                            certificate
                                                                        )
                                                                    }
                                                                    style={{
                                                                        ...actionButtonStyle,
                                                                        background:
                                                                            "#fef2f2",
                                                                        color:
                                                                            "#dc2626",
                                                                    }}
                                                                >
                                                                    <Ban
                                                                        size={16}
                                                                    />

                                                                    Revoke
                                                                </button>
                                                            )}

                                                    </div>

                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>


            {/* View modal */}

            {selectedCertificate && (
                <ViewCertificateModal
                    certificate={
                        selectedCertificate
                    }
                    onClose={() =>
                        setSelectedCertificate(
                            null
                        )
                    }
                    onDownload={() =>
                        handleDownload(
                            selectedCertificate
                        )
                    }
                />
            )}


            {/* Revoke modal */}

            {revokeTarget && (
                <div
                    style={overlayStyle}
                >

                    <div
                        style={{
                            ...modalStyle,
                            maxWidth: 520,
                        }}
                    >

                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                                marginBottom: 20,
                            }}
                        >

                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                    }}
                                >
                                    Revoke Certificate?
                                </h2>

                                <p
                                    style={{
                                        margin:
                                            "6px 0 0",
                                        color:
                                            "var(--muted)",
                                    }}
                                >
                                    This action will invalidate
                                    the certificate.
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setRevokeTarget(
                                        null
                                    )
                                }
                                style={closeButtonStyle}
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <div
                            style={{
                                marginBottom: 18,
                            }}
                        >

                            <label
                                style={labelStyle}
                            >
                                Certificate
                            </label>

                            <div
                                style={valueBoxStyle}
                            >
                                {
                                    revokeTarget.certificateNumber
                                }
                            </div>

                        </div>


                        <div
                            style={{
                                marginBottom: 18,
                            }}
                        >

                            <label
                                style={labelStyle}
                            >
                                Employee
                            </label>

                            <div
                                style={valueBoxStyle}
                            >
                                {`${revokeTarget.employee?.firstName || ""} ${revokeTarget.employee?.lastName || ""
                                    }`.trim()}
                            </div>

                        </div>


                        <div
                            style={{
                                marginBottom: 22,
                            }}
                        >

                            <label
                                style={labelStyle}
                            >
                                Reason
                            </label>

                            <textarea
                                value={revokeReason}
                                onChange={(event) =>
                                    setRevokeReason(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter reason..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: 14,
                                    border:
                                        "1px solid var(--border)",
                                    borderRadius: 10,
                                    resize:
                                        "vertical",
                                    boxSizing:
                                        "border-box",
                                    background:
                                        "var(--background)",
                                    color:
                                        "var(--foreground)",
                                }}
                            />

                        </div>


                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "flex-end",
                                gap: 10,
                            }}
                        >

                            <button
                                onClick={() => {
                                    setRevokeTarget(
                                        null
                                    );

                                    setRevokeReason("");
                                }}
                                style={
                                    secondaryButtonStyle
                                }
                            >
                                Cancel
                            </button>

                            <button
                                onClick={
                                    handleRevoke
                                }
                                disabled={
                                    revoking ||
                                    !revokeReason.trim()
                                }
                                style={{
                                    ...dangerButtonStyle,
                                    opacity:
                                        revoking ||
                                            !revokeReason.trim()
                                            ? 0.5
                                            : 1,
                                }}
                            >
                                {revoking && (
                                    <Loader2
                                        size={16}
                                        style={{
                                            animation:
                                                "spin 1s linear infinite",
                                        }}
                                    />
                                )}

                                Revoke Certificate
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {verificationResult && (
                <div style={overlayStyle}>
                    <div
                        style={{
                            ...modalStyle,
                            maxWidth: 520,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 24,
                            }}
                        >
                            <div>
                                <h2 style={{ margin: 0 }}>
                                    Certificate Verification
                                </h2>

                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        color: "var(--muted)",
                                    }}
                                >
                                    Certificate authenticity check
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setVerificationResult(null)
                                }
                                style={closeButtonStyle}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div
                            style={{
                                padding: 20,
                                borderRadius: 12,
                                textAlign: "center",
                                marginBottom: 22,

                                background:
                                    verificationResult.result?.verified
                                        ? "#ecfdf5"
                                        : "#fef2f2",

                                color:
                                    verificationResult.result?.verified
                                        ? "#059669"
                                        : "#dc2626",
                            }}
                        >
                            {verificationResult.result?.verified ? (
                                <>
                                    <ShieldCheck
                                        size={48}
                                        style={{
                                            marginBottom: 8,
                                        }}
                                    />

                                    <h3
                                        style={{
                                            margin: "5px 0",
                                        }}
                                    >
                                        Certificate Verified
                                    </h3>

                                    <p
                                        style={{
                                            margin: 0,
                                        }}
                                    >
                                        This certificate is authentic
                                        and currently valid.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck
                                        size={48}
                                        style={{
                                            marginBottom: 8,
                                        }}
                                    />

                                    <h3
                                        style={{
                                            margin: "5px 0",
                                        }}
                                    >
                                        Certificate Not Valid
                                    </h3>

                                    <p
                                        style={{
                                            margin: 0,
                                        }}
                                    >
                                        This certificate is expired
                                        or revoked.
                                    </p>
                                </>
                            )}
                        </div>

                        <DetailRow
                            label="Employee"
                            value={
                                verificationResult.result?.data
                                    ?.employeeName
                            }
                        />

                        <DetailRow
                            label="Course"
                            value={
                                verificationResult.result?.data
                                    ?.courseName
                            }
                        />

                        <DetailRow
                            label="Score"
                            value={`${verificationResult.result?.data?.score ?? 0}%`}
                        />

                        <DetailRow
                            label="Certificate No."
                            value={
                                verificationResult.result?.data
                                    ?.certificateNumber
                            }
                        />

                        <DetailRow
                            label="Status"
                            value={
                                <StatusBadge
                                    status={
                                        verificationResult.result
                                            ?.data?.status
                                    }
                                />
                            }
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 24,
                            }}
                        >
                            <button
                                onClick={() =>
                                    setVerificationResult(null)
                                }
                                style={secondaryButtonStyle}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}


/*
 * Statistics card
 */

function StatCard({
    title,
    value,
    icon,
    iconColor,
    background,
}) {
    return (
        <div
            style={{
                padding: 20,
                border:
                    "1px solid var(--border)",
                borderRadius: 14,
                background:
                    "var(--card)",
            }}
        >

            <div
                style={{
                    display:
                        "flex",
                    justifyContent:
                        "space-between",
                    alignItems:
                        "center",
                }}
            >

                <span
                    style={{
                        color:
                            "var(--muted)",
                        fontSize: 14,
                    }}
                >
                    {title}
                </span>

                <span
                    style={{
                        width: 42,
                        height: 42,
                        display:
                            "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "center",
                        borderRadius: 10,
                        color:
                            iconColor ||
                            "var(--primary)",
                        background:
                            background ||
                            "var(--background)",
                    }}
                >
                    {icon}
                </span>

            </div>

            <div
                style={{
                    marginTop: 12,
                    fontSize: 28,
                    fontWeight: 700,
                }}
            >
                {value}
            </div>

        </div>
    );
}


/*
 * Status badge
 */

function StatusBadge({
    status,
}) {
    const config = {
        ISSUED: {
            label: "ISSUED",
            color: "#059669",
            background:
                "#ecfdf5",
        },

        EXPIRED: {
            label: "EXPIRED",
            color: "#d97706",
            background:
                "#fffbeb",
        },

        REVOKED: {
            label: "REVOKED",
            color: "#dc2626",
            background:
                "#fef2f2",
        },

        PENDING: {
            label: "PENDING",
            color: "#2563eb",
            background:
                "#eff6ff",
        },
    };

    const current =
        config[status] ||
        config.PENDING;

    return (
        <span
            style={{
                display:
                    "inline-flex",
                alignItems:
                    "center",
                padding:
                    "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                color:
                    current.color,
                background:
                    current.background,
            }}
        >
            {current.label}
        </span>
    );
}


/*
 * View certificate modal
 */

function ViewCertificateModal({
    certificate,
    onClose,
    onDownload,
}) {
    const employeeName =
        `${certificate.employee?.firstName || ""} ${certificate.employee?.lastName || ""
            }`.trim();

    return (
        <div
            style={overlayStyle}
        >

            <div
                style={{
                    ...modalStyle,
                    maxWidth: 620,
                }}
            >

                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        marginBottom: 24,
                    }}
                >

                    <div>
                        <h2
                            style={{
                                margin: 0,
                            }}
                        >
                            Certificate Details
                        </h2>

                        <p
                            style={{
                                margin:
                                    "5px 0 0",
                                color:
                                    "var(--muted)",
                            }}
                        >
                            Certificate information
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        style={
                            closeButtonStyle
                        }
                    >
                        <X size={20} />
                    </button>

                </div>


                <DetailRow
                    label="Employee"
                    value={employeeName}
                />

                <DetailRow
                    label="Course"
                    value={
                        certificate.course
                            ?.title
                    }
                />

                <DetailRow
                    label="Score"
                    value={`${certificate.score ?? 0}%`}
                />

                <DetailRow
                    label="Certificate No."
                    value={
                        certificate.certificateNumber
                    }
                />

                <DetailRow
                    label="Issued"
                    value={
                        certificate.issuedAt
                            ? new Date(
                                certificate.issuedAt
                            ).toLocaleDateString(
                                "en-IN"
                            )
                            : "-"
                    }
                />

                <DetailRow
                    label="Expires"
                    value={
                        certificate.expiresAt
                            ? new Date(
                                certificate.expiresAt
                            ).toLocaleDateString(
                                "en-IN"
                            )
                            : "No expiry"
                    }
                />

                <DetailRow
                    label="Status"
                    value={
                        <StatusBadge
                            status={
                                certificate.status
                            }
                        />
                    }
                />


                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "flex-end",
                        gap: 10,
                        marginTop: 24,
                    }}
                >

                    <button
                        onClick={onClose}
                        style={
                            secondaryButtonStyle
                        }
                    >
                        Close
                    </button>

                    {certificate.status ===
                        "ISSUED" && (
                            <button
                                onClick={onDownload}
                                style={
                                    primaryButtonStyle
                                }
                            >
                                <Download
                                    size={17}
                                />

                                Download Certificate
                            </button>
                        )}

                </div>

            </div>

        </div>
    );
}


function DetailRow({
    label,
    value,
}) {
    return (
        <div
            style={{
                display:
                    "grid",
                gridTemplateColumns:
                    "170px 1fr",
                gap: 16,
                padding:
                    "13px 0",
                borderBottom:
                    "1px solid var(--border)",
            }}
        >

            <span
                style={{
                    color:
                        "var(--muted)",
                    fontWeight: 500,
                }}
            >
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


/*
 * Styles
 */

const thStyle = {
    textAlign: "left",
    padding: "15px 18px",
    fontSize: 13,
    color: "var(--muted)",
    background:
        "var(--background)",
    borderBottom:
        "1px solid var(--border)",
    whiteSpace: "nowrap",
};

const tdStyle = {
    padding: "17px 18px",
    borderBottom:
        "1px solid var(--border)",
    fontSize: 14,
};

const actionButtonStyle = {
    border: "none",
    borderRadius: 8,
    padding:
        "8px 11px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    background: "#f8fafc",
    color: "#334155",
    fontWeight: 600,
};

const primaryButtonStyle = {
    border: "none",
    borderRadius: 9,
    padding:
        "10px 15px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
    background:
        "var(--primary)",
    color: "#fff",
    fontWeight: 600,
};

const secondaryButtonStyle = {
    border:
        "1px solid var(--border)",
    borderRadius: 9,
    padding:
        "10px 15px",
    cursor: "pointer",
    background:
        "var(--card)",
    color:
        "var(--foreground)",
    fontWeight: 600,
};

const dangerButtonStyle = {
    border: "none",
    borderRadius: 9,
    padding:
        "10px 15px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 600,
};

const closeButtonStyle = {
    border: "none",
    background:
        "transparent",
    cursor: "pointer",
    padding: 5,
};

const labelStyle = {
    display: "block",
    marginBottom: 7,
    fontSize: 13,
    fontWeight: 600,
    color:
        "var(--muted)",
};

const valueBoxStyle = {
    padding: 12,
    border:
        "1px solid var(--border)",
    borderRadius: 9,
    background:
        "var(--background)",
};

const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background:
        "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
};

const modalStyle = {
    width: "100%",
    background:
        "var(--card)",
    borderRadius: 16,
    padding: 26,
    boxShadow:
        "0 20px 60px rgba(0,0,0,0.2)",
};