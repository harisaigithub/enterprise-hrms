import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface CertificatePdfData {
  employeeName: string;
  courseName: string;
  certificateNumber: string;
  score: number;
  issuedDate: Date;
  expiresAt?: Date | null;
  verificationUrl: string;
  companyName: string;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function generateCertificatePdf(
  data: CertificatePdfData
): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(data.verificationUrl, {
    type: "png",
    width: 180,
    margin: 1,
    errorCorrectionLevel: "H",
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    const width = doc.page.width;
    const height = doc.page.height;

    // Background
    doc
      .rect(0, 0, width, height)
      .fill("#ffffff");

    // Outer border
    doc
      .lineWidth(5)
      .strokeColor("#1e3a8a")
      .rect(28, 28, width - 56, height - 56)
      .stroke();

    // Inner border
    doc
      .lineWidth(1)
      .strokeColor("#cbd5e1")
      .rect(42, 42, width - 84, height - 84)
      .stroke();

    // Company
    doc
      .fontSize(18)
      .fillColor("#1e3a8a")
      .font("Helvetica-Bold")
      .text(data.companyName.toUpperCase(), 0, 72, {
        align: "center",
        width,
      });

    // Certificate title
    doc
      .fontSize(30)
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .text("CERTIFICATE OF COMPLETION", 0, 125, {
        align: "center",
        width,
      });

    // Subtitle
    doc
      .fontSize(13)
      .fillColor("#64748b")
      .font("Helvetica")
      .text("This certificate is proudly presented to", 0, 180, {
        align: "center",
        width,
      });

    // Employee
    doc
      .fontSize(32)
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .text(data.employeeName, 80, 215, {
        align: "center",
        width: width - 160,
      });

    // Divider
    doc
      .moveTo(220, 265)
      .lineTo(width - 220, 265)
      .lineWidth(1)
      .strokeColor("#cbd5e1")
      .stroke();

    // Completion statement
    doc
      .fontSize(13)
      .fillColor("#475569")
      .font("Helvetica")
      .text("for successfully completing the course", 0, 290, {
        align: "center",
        width,
      });

    // Course
    doc
      .fontSize(23)
      .fillColor("#1e3a8a")
      .font("Helvetica-Bold")
      .text(data.courseName, 80, 325, {
        align: "center",
        width: width - 160,
      });

    // Score
    doc
      .fontSize(13)
      .fillColor("#475569")
      .font("Helvetica")
      .text(`Final Score: ${data.score}%`, 0, 375, {
        align: "center",
        width,
      });

    // Date
    doc
      .fontSize(11)
      .fillColor("#64748b")
      .text(
        `Issued: ${formatDate(data.issuedDate)}`,
        80,
        430
      );

    if (data.expiresAt) {
      doc.text(
        `Valid Until: ${formatDate(data.expiresAt)}`,
        80,
        450
      );
    }

    // Certificate number
    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(
        `Certificate No: ${data.certificateNumber}`,
        80,
        480
      );

    // QR
    doc.image(
      qrBuffer,
      width - 190,
      height - 205,
      {
        width: 125,
        height: 125,
      }
    );

    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        "Scan to verify certificate",
        width - 205,
        height - 70,
        {
          width: 155,
          align: "center",
        }
      );

    // Verification URL
    doc
      .fontSize(7)
      .fillColor("#94a3b8")
      .text(
        data.verificationUrl,
        70,
        height - 65,
        {
          width: 350,
        }
      );

    doc.end();
  });
}