import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { getFileUrl } from "../../utils/uploadFileUrl";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();


/* =========================================================
   OPEN CONTENT
========================================================= */

function openContent(content) {
    if (!content) return;

    let url = "";

    if (
        content.type === "PDF" ||
        content.type === "VIDEO"
    ) {
        url = getFileUrl(content.fileUrl);
    }

    if (content.type === "LINK") {
        url = content.fileUrl;
    }

    if (url) {
        window.open(url, "_blank");
    }
}

/* =========================================================
   OPEN BUTTON
========================================================= */

function OpenInNewTabButton({ content }) {
    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "14px",
            }}
        >
            <button
                type="button"
                onClick={() => openContent(content)}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    padding: "9px 14px",
                    background: "var(--primary)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                }}
            >
                ↗ Open in New Tab
            </button>
        </div>
    );
}

/* =========================================================
   TEXT
========================================================= */

function TextViewer({ content }) {
    return (
        <div
            style={{
                padding: "20px",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: "1px solid var(--border)",
                borderRadius: "8px",
            }}
        >
            {content.content || "No text content available."}
        </div>
    );
}

/* =========================================================
   LINK
========================================================= */

function LinkViewer({ content }) {
    return (
        <div
            style={{
                padding: "30px",
                textAlign: "center",
                border: "1px solid var(--border)",
                borderRadius: "8px",
            }}
        >
            <h3>{content.title}</h3>

            <p style={{ marginBottom: "20px" }}>
                External learning resource
            </p>

            <a
                href={content.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    color: "var(--primary)",
                    fontWeight: 600,
                }}
            >
                Open Learning Resource
            </a>
        </div>
    );
}

/* =========================================================
   PDF
========================================================= */

function PdfViewer({ content }) {
    const [numPages, setNumPages] = useState(0);

    const pdfUrl = getFileUrl(content.fileUrl);

    return (
        <div
            style={{
                width: "100%",
                maxHeight: "600px",
                overflow: "auto",
                background: "#f5f5f5",
                padding: "12px",
                boxSizing: "border-box",
                borderRadius: "8px",
            }}
        >
            <Document
                file={pdfUrl}
                loading={
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                        }}
                    >
                        Loading PDF...
                    </div>
                }
                error={
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "red",
                        }}
                    >
                        Unable to load PDF.
                    </div>
                }
                onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                }}
            >
                {Array.from(
                    { length: numPages },
                    (_, index) => (
                        <div
                            key={index + 1}
                            style={{
                                marginBottom: "20px",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <Page
                                pageNumber={index + 1}
                                width={550}
                            />
                        </div>
                    )
                )}
            </Document>
        </div>
    );
}

/* =========================================================
   VIDEO
========================================================= */

function VideoViewer({ content }) {
    const videoUrl = getFileUrl(content.fileUrl);

    return (
        <div
            style={{
                width: "100%",
                background: "#000",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            <video
                controls
                preload="metadata"
                playsInline
                crossOrigin="use-credentials"
                style={{
                    width: "100%",
                    display: "block",
                    maxHeight: "500px",
                }}
                onError={(e) => {
                    console.error(
                        "VIDEO PLAYBACK ERROR:",
                        e.currentTarget.error
                    );

                    console.log(
                        "VIDEO URL:",
                        videoUrl
                    );
                }}
            >
                <source src={videoUrl} />

                Your browser does not support video playback.
            </video>
        </div>
    );
}

/* =========================================================
   MAIN VIEWER
========================================================= */

export default function CourseContentViewer({
    content,
}) {
    if (!content) {
        return (
            <div>
                No content selected.
            </div>
        );
    }

    return (
        <div
            style={{
                width: "100%",
            }}
        >
            {/* ALWAYS SHOW BUTTON */}
            <OpenInNewTabButton
                content={content}
            />

            {/* CONTENT */}

            {content.type === "TEXT" && (
                <TextViewer content={content} />
            )}

            {content.type === "LINK" && (
                <LinkViewer content={content} />
            )}

            {content.type === "PDF" && (
                <PdfViewer content={content} />
            )}

            {content.type === "VIDEO" && (
                <VideoViewer content={content} />
            )}

            {![
                "TEXT",
                "LINK",
                "PDF",
                "VIDEO",
            ].includes(content.type) && (
                    <div>
                        Unsupported content type: {content.type}
                    </div>
                )}
        </div>
    );
}