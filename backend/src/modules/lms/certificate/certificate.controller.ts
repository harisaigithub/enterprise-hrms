import { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { getCertificateStream } from "./certificate.storage";

/**
 * Get certificate details
 *
 * GET /api/lms/learning-certificates/:certificateId
 */
export async function getCertificate(
  req: Request,
  res: Response
) {
  const { certificateId } = req.params;

  const certificate =
    await prisma.courseCertificate.findUnique({
      where: {
        id: certificateId,
      },
      include: {
        enrollment: {
          include: {
            employee: true,
            course: true,
          },
        },
      },
    });

  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found",
    });
  }

  return res.json({
    success: true,

    data: {
      id: certificate.id,

      certificateNumber:
        certificate.certificateNumber,

      status:
        certificate.status,

      issuedDate:
        certificate.issuedAt,

      expiresAt:
        certificate.expiresAt,

      verificationToken:
        certificate.verificationToken,

      employeeName:
        `${certificate.enrollment.employee.firstName} ${certificate.enrollment.employee.lastName}`.trim(),

      courseName:
        certificate.enrollment.course.title,
    },
  });
}


/**
 * Download certificate PDF
 *
 * GET /api/lms/learning-certificates/:certificateId/download
 */
export async function downloadCertificate(
  req: Request,
  res: Response
) {
  const { certificateId } = req.params;

  const certificate =
    await prisma.courseCertificate.findUnique({
      where: {
        id: certificateId,
      },
    });

  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found",
    });
  }

  /**
   * Only issued certificates can be downloaded.
   */
  if (certificate.status !== "ISSUED") {
    return res.status(403).json({
      success: false,
      message:
        "This certificate is not available for download",
    });
  }

  /**
   * Certificate PDF must exist in MinIO.
   */
  if (!certificate.storageKey) {
    return res.status(404).json({
      success: false,
      message:
        "Certificate PDF is not available",
    });
  }

  /**
   * Get PDF stream from MinIO.
   */
  const stream =
    await getCertificateStream(
      certificate.storageKey
    );

  /**
   * Increment download count.
   */
  await prisma.courseCertificate.update({
    where: {
      id: certificate.id,
    },

    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });

  /**
   * PDF response headers.
   */
  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${certificate.certificateNumber}.pdf"`
  );

  res.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  stream.on("error", (error) => {
    req.log?.error?.(
      {
        error,
        certificateId,
      },
      "Certificate stream failed"
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message:
          "Unable to download certificate",
      });
    } else {
      res.destroy(error);
    }
  });

  stream.pipe(res);
}


/**
 * Public certificate verification
 *
 * GET /api/lms/learning-certificates/verify/:token
 */
export async function verifyCertificate(
  req: Request,
  res: Response
) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      verified: false,
      message:
        "Certificate verification token is required",
    });
  }

  const certificate =
    await prisma.courseCertificate.findUnique({
      where: {
        verificationToken: token,
      },

      include: {
        enrollment: {
          include: {
            employee: true,
            course: true,
          },
        },
      },
    });

  if (!certificate) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Certificate not found",
    });
  }

  /**
   * Check expiry dynamically.
   */
  const isExpired =
    certificate.expiresAt !== null &&
    certificate.expiresAt.getTime() <
    Date.now();

  /**
   * Certificate is valid only when:
   *
   * 1. status is ISSUED
   * 2. certificate is not expired
   */
  const verified =
    certificate.status === "ISSUED" &&
    !isExpired;

  /**
   * Display EXPIRED if expiry date has passed.
   */
  const displayStatus =
    isExpired &&
      certificate.status === "ISSUED"
      ? "EXPIRED"
      : certificate.status;

  return res.json({
    success: true,

    verified,

    data: {
      id: certificate.id,
      certificateNumber:
        certificate.certificateNumber,

      employeeName:
        `${certificate.enrollment.employee.firstName} ${certificate.enrollment.employee.lastName}`.trim(),

      courseName:
        certificate.enrollment.course.title,

      issuedDate:
        certificate.issuedAt,

      expiresAt:
        certificate.expiresAt,

      status:
        displayStatus,
    },
  });
}


/**
 * Revoke certificate
 *
 * PATCH /api/lms/learning-certificates/:certificateId/revoke
 */
export async function revokeCertificate(
  req: Request,
  res: Response
) {
  const { certificateId } = req.params;

  const reason =
    String(
      req.body?.reason || ""
    ).trim();

  if (!reason) {
    return res.status(400).json({
      success: false,
      message:
        "Revoke reason is required",
    });
  }

  const certificate =
    await prisma.courseCertificate.findUnique({
      where: {
        id: certificateId,
      },
    });

  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found",
    });
  }

  if (certificate.status !== "ISSUED") {
    return res.status(400).json({
      success: false,
      message:
        "Only issued certificates can be revoked",
    });
  }

  const updated =
    await prisma.courseCertificate.update({
      where: {
        id: certificateId,
      },

      data: {
        status: "REVOKED",

        revokedAt:
          new Date(),

        revokeReason:
          reason,
      },
    });

  return res.json({
    success: true,

    message:
      "Certificate revoked successfully",

    data: {
      id: updated.id,

      certificateNumber:
        updated.certificateNumber,

      status:
        updated.status,

      revokedAt:
        updated.revokedAt,

      revokeReason:
        updated.revokeReason,
    },
  });
}

/**
 * Get all certificates
 *
 * GET /api/lms/certificate/learning-certificates
 */
export async function getAllCertificates(
  req: Request,
  res: Response
) {
  const certificates =
    await prisma.courseCertificate.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        enrollment: {
          include: {
            employee: true,
            course: true,
          },
        },
      },
    });

  const now = new Date();

  const data = certificates.map((certificate) => {
    const isExpired =
      certificate.expiresAt !== null &&
      certificate.expiresAt.getTime() < now.getTime();

    const displayStatus =
      isExpired &&
      certificate.status === "ISSUED"
        ? "EXPIRED"
        : certificate.status;

    return {
      id: certificate.id,

      certificateNumber:
        certificate.certificateNumber,

      status: displayStatus,

      issuedAt:
        certificate.issuedAt,

      expiresAt:
        certificate.expiresAt,

      downloadCount:
        certificate.downloadCount,

      employee: {
        id:
          certificate.enrollment.employee.id,

        firstName:
          certificate.enrollment.employee.firstName,

        lastName:
          certificate.enrollment.employee.lastName,
      },

      course: {
        id:
          certificate.enrollment.course.id,

        title:
          certificate.enrollment.course.title,
      },

      score:
        certificate.enrollment.score,
    };
  });

  return res.json({
    success: true,
    data,
  });
}

export async function verifyCertificateById(
  req: Request,
  res: Response
) {
  const { certificateId } = req.params;

  const certificate =
    await prisma.courseCertificate.findUnique({
      where: {
        id: certificateId,
      },
      include: {
        enrollment: {
          include: {
            employee: true,
            course: true,
          },
        },
      },
    });

  if (!certificate) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: "Certificate not found",
    });
  }

  const isExpired =
    certificate.expiresAt !== null &&
    certificate.expiresAt.getTime() < Date.now();

  const verified =
    certificate.status === "ISSUED" &&
    !isExpired;

  const displayStatus =
    isExpired && certificate.status === "ISSUED"
      ? "EXPIRED"
      : certificate.status;

  return res.json({
    success: true,
    verified,

    data: {
      id: certificate.id,

      certificateNumber:
        certificate.certificateNumber,

      employeeName:
        `${certificate.enrollment.employee.firstName} ${certificate.enrollment.employee.lastName}`.trim(),

      courseName:
        certificate.enrollment.course.title,

      score:
        certificate.enrollment.score,

      issuedDate:
        certificate.issuedAt,

      expiresAt:
        certificate.expiresAt,

      status:
        displayStatus,

      verified,
    },
  });
}