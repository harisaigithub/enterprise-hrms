import { prisma } from "../../../lib/prisma";
import {
  generateCertificateNumber,
  generateVerificationToken,
  sha256,
} from "./certificate.util";
import { generateCertificatePdf } from "./certificate.pdf";
import { uploadCertificate } from "./certificate.storage";

interface CreateCertificateInput {
  enrollmentId: string;

  /*
   * These are kept in the input for compatibility
   * with the existing submitQuiz() call.
   *
   * They are NOT stored directly in CourseCertificate.
   * Employee and Course are already available through
   * CourseEnrollment.
   */
  employeeId: string;
  courseId: string;

  employeeName: string;
  courseName: string;
  score: number;
  expiresAt?: Date | null;
}

export async function createCertificate(
  input: CreateCertificateInput
) {
  /*
   * --------------------------------------------------
   * 1. Check whether certificate already exists
   * --------------------------------------------------
   *
   * CourseCertificate has:
   *
   * enrollmentId String @unique
   *
   * Therefore one enrollment can have only one
   * certificate.
   */

  const existing =
    await prisma.courseCertificate.findUnique({
      where: {
        enrollmentId: input.enrollmentId,
      },
    });

  if (existing) {
    const verifyBase =
      process.env.CERTIFICATE_VERIFY_URL!;

    const verificationUrl =
      `${verifyBase}/${existing.verificationToken}`;

    return {
      id: existing.id,

      certificateNumber:
        existing.certificateNumber,

      status:
        existing.status,

      verificationUrl,

      issuedAt:
        existing.issuedAt,

      expiresAt:
        existing.expiresAt,
    };
  }

  /*
   * --------------------------------------------------
   * 2. Generate certificate metadata
   * --------------------------------------------------
   */

  const certificateNumber =
    generateCertificateNumber();

  const verificationToken =
    generateVerificationToken();

  const issuedAt = new Date();

  const verifyBase =
    process.env.CERTIFICATE_VERIFY_URL;

  if (!verifyBase) {
    throw new Error(
      "CERTIFICATE_VERIFY_URL is not configured"
    );
  }

  const verificationUrl =
    `${verifyBase.replace(/\/$/, "")}/${verificationToken}`;

  /*
   * --------------------------------------------------
   * 3. Generate PDF
   * --------------------------------------------------
   */

  const pdf =
    await generateCertificatePdf({
      employeeName:
        input.employeeName,

      courseName:
        input.courseName,

      certificateNumber,

      score:
        input.score,

      issuedDate:
        issuedAt,

      expiresAt:
        input.expiresAt ?? null,

      verificationUrl,

      companyName:
        process.env.COMPANY_NAME ||
        "PROTECCIO HRMS",
    });

  /*
   * --------------------------------------------------
   * 4. Generate SHA-256 hash
   * --------------------------------------------------
   *
   * This gives us a fingerprint of the exact PDF.
   */

  const pdfSha256 =
    sha256(pdf);

  /*
   * --------------------------------------------------
   * 5. Generate MinIO storage key
   * --------------------------------------------------
   */

  const year =
    issuedAt.getFullYear();

  const storageKey =
    `lms/certificates/${year}/${certificateNumber}.pdf`;

  /*
   * --------------------------------------------------
   * 6. Upload PDF to MinIO
   * --------------------------------------------------
   */

  await uploadCertificate(
    storageKey,
    pdf
  );

  /*
   * --------------------------------------------------
   * 7. Create certificate record
   * --------------------------------------------------
   *
   * IMPORTANT:
   *
   * We use Prisma instead of raw SQL.
   *
   * Actual database table:
   *
   * course_certificates
   *
   * Prisma model:
   *
   * CourseCertificate
   * --------------------------------------------------
   */

  const created =
    await prisma.courseCertificate.create({
      data: {
        enrollmentId:
          input.enrollmentId,

        certificateNumber,

        status: "ISSUED",

        issuedAt,

        expiresAt:
          input.expiresAt ?? null,

        storageKey,

        verificationToken,

        pdfSha256,

        generatedAt:
          new Date(),
      },
    });

  /*
   * --------------------------------------------------
   * 8. Return certificate information
   * --------------------------------------------------
   */

  return {
    id:
      created.id,

    certificateNumber:
      created.certificateNumber,

    status:
      created.status,

    verificationUrl,

    issuedAt:
      created.issuedAt,

    expiresAt:
      created.expiresAt,
  };
}