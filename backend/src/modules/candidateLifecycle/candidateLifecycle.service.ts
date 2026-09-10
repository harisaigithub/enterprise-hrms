import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/password";
import { env } from "../../config/env";
import { sendOfferInvitationEmail } from "./offerInvitationEmail.service";
import path from "node:path";
import { randomUUID } from "node:crypto";

import minioClient, {
  MINIO_BUCKET,
} from "../../config/minio";

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const lifecycleInclude = {
  candidate: true,
  requisition: { include: { department: true, designation: true, location: true } },
  offer: true,
  documents: { orderBy: { createdAt: "desc" as const } },
};

export async function listPublicJobs() {
  return prisma.jobRequisition.findMany({
    where: { status: { in: ["Open", "Approved"] } },
    select: {
      id: true, requisitionCode: true, title: true, openings: true, grade: true,
      department: { select: { name: true } },
      designation: { select: { title: true } },
      location: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitApplication(input: any) {
  const requisition = await prisma.jobRequisition.findFirst({
    where: { id: input.requisitionId, status: { in: ["Open", "Approved"] } },
  });
  if (!requisition) throw AppError.notFound("This vacancy is not open for applications");

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.application.findFirst({
    where: { requisitionId: input.requisitionId, candidate: { email } },
  });
  if (existing) throw AppError.conflict("You have already applied for this vacancy");

  const suffix = `${Date.now()}`.slice(-8);
  return prisma.application.create({
    data: {
      requisition: { connect: { id: input.requisitionId } },
      stage: "Applied",
      approvalStatus: "HR Review",
      candidate: {
        create: {
          candidateCode: `CAN-${suffix}`,
          firstName: input.firstName.trim(),
          lastName: input.lastName?.trim() || null,
          email,
          phone: input.phone?.trim() || null,
          resumeSummary: input.resumeSummary?.trim() || null,
        },
      },
    },
    include: lifecycleInclude,
  });
}

export async function getPortal(invitationToken: string) {
  const offer = await prisma.offer.findUnique({
    where: { invitationTokenHash: sha256(invitationToken) },
    include: { application: { include: lifecycleInclude } },
  });
  if (!offer || !offer.invitationExpiresAt || offer.invitationExpiresAt < new Date()) {
    throw AppError.unauthorized("Invitation is invalid or has expired");
  }
  const application = offer.application;
  return {
    candidate: { firstName: application.candidate.firstName, lastName: application.candidate.lastName },
    job: application.requisition.title,
    offer: { id: offer.id, proposedSalary: Number(offer.proposedSalary), status: offer.status, joiningDate: offer.joiningDate },
    documents: application.documents,
    onboardingStatus: application.approvalStatus,
  };
}

export async function decideOffer(token: string, decision: "Accepted" | "Declined") {
  const offer = await findValidOffer(token);
  if (offer.status !== "Sent — Awaiting Signature") {
    throw AppError.badRequest("This offer has already been processed");
  }
  return prisma.$transaction(async (tx: any) => {
    const updated = await tx.offer.update({ where: { id: offer.id }, data: { status: decision, decisionAt: new Date() } });
    await tx.application.update({ where: { id: offer.applicationId }, data: {
      approvalStatus: decision === "Accepted" ? "Documents Pending" : "Offer Declined",
      ...(decision === "Declined" ? { stage: "Rejected" } : {}),
    } });
    return updated;
  });
}

export async function uploadDocument(
  token: string,
  input: {
    documentType: string;
    file: Express.Multer.File;
  }
) {
  const offer = await findValidOffer(token);

  if (offer.status !== "Accepted") {
    throw AppError.badRequest(
      "Accept the offer before uploading documents"
    );
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(input.file.mimetype)) {
    throw AppError.badRequest(
      "Only PDF, JPG and PNG files are allowed"
    );
  }

  if (input.file.size > 5 * 1024 * 1024) {
    throw AppError.badRequest(
      "Document size must be less than 5 MB"
    );
  }

  const extension = path.extname(
    input.file.originalname
  );

  const objectName =
    `candidate/documents/${randomUUID()}${extension}`;

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    input.file.buffer,
    input.file.size,
    {
      "Content-Type": input.file.mimetype,
    }
  );

  /*
   * IMPORTANT:
   * Do NOT store MinIO's internal object name
   * as a browser URL.
   *
   * Store our backend file route.
   */
  const fileUrl =
    `/uploads/candidate/${objectName
      .replace("candidate/documents/", "")}`;

  return prisma.$transaction(async (tx: any) => {
    const document =
      await tx.candidateDocument.create({
        data: {
          applicationId: offer.applicationId,
          documentType: input.documentType,
          fileName: input.file.originalname,
          fileUrl,
        },
      });

    await tx.application.update({
      where: {
        id: offer.applicationId,
      },
      data: {
        approvalStatus: "Document Verification",
      },
    });

    return document;
  });
}

async function findValidOffer(token: string) {
  const offer = await prisma.offer.findUnique({ where: { invitationTokenHash: sha256(token) } });
  if (!offer || !offer.invitationExpiresAt || offer.invitationExpiresAt < new Date()) {
    throw AppError.unauthorized("Invitation is invalid or has expired");
  }
  return offer;
}

export async function listLifecycleApplications() {
  return prisma.application.findMany({ include: lifecycleInclude, orderBy: { createdAt: "desc" } });
}

export async function firstApprove(applicationId: string, actorUserId: string, notes?: string) {
  const application = await getApplication(applicationId);
  if (application.approvalStatus !== "HR Review") throw AppError.badRequest("Application is not awaiting first approval");
  return prisma.application.update({
    where: { id: applicationId },
    data: { approvalStatus: "Second Approval", firstApprovedBy: actorUserId, firstApprovedAt: new Date(), approvalNotes: notes },
    include: lifecycleInclude,
  });
}

export async function secondApprove(applicationId: string, actorUserId: string, input: any) {
  const application = await getApplication(applicationId);
  if (application.approvalStatus !== "Second Approval" || !application.firstApprovedBy) {
    throw AppError.badRequest("First approval must be completed before second approval");
  }
  if (application.firstApprovedBy === actorUserId) throw AppError.forbidden("The second approver must be a different user");
  if (application.offer) throw AppError.conflict("An offer already exists for this application");

  const salary = Number(input.proposedSalary);
  if (salary < Number(application.requisition.salaryMin) || salary > Number(application.requisition.salaryMax)) {
    throw AppError.badRequest("Proposed salary must be inside the approved requisition range");
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      stage: "Offer", approvalStatus: "Offer Sent", secondApprovedBy: actorUserId, secondApprovedAt: new Date(),
      offer: { create: {
        proposedSalary: salary, status: "Sent — Awaiting Signature", consentOnFile: true,
        sentAt: new Date(), joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
        invitationTokenHash: sha256(token), invitationExpiresAt: expiresAt,
      } },
    },
    include: lifecycleInclude,
  });
  const invitationUrl = `${env.CANDIDATE_PORTAL_URL.replace(/\/$/, "")}/${token}`;
  const candidateName = [updated.candidate.firstName, updated.candidate.lastName].filter(Boolean).join(" ");
  const emailDelivery = await sendOfferInvitationEmail({
    candidateEmail: updated.candidate.email,
    candidateName,
    jobTitle: updated.requisition.title,
    proposedSalary: salary,
    joiningDate: updated.offer?.joiningDate ?? null,
    invitationUrl,
    expiresAt,
  });

  return {
    application: updated,
    invitationToken: token,
    invitationUrl,
    invitationExpiresAt: expiresAt,
    emailDelivery,
  };
}

export async function rejectApplication(applicationId: string, actorUserId: string, reason: string) {
  const application = await getApplication(applicationId);
  if (["Employee Created", "Rejected"].includes(application.approvalStatus)) throw AppError.badRequest("Application can no longer be rejected");
  return prisma.application.update({
    where: { id: applicationId },
    data: { stage: "Rejected", approvalStatus: "Rejected", approvalNotes: reason,
      firstApprovedBy: application.firstApprovedBy || actorUserId, firstApprovedAt: application.firstApprovedAt || new Date() },
    include: lifecycleInclude,
  });
}

export async function verifyDocument(documentId: string, actorUserId: string, input: any) {
  const document = await prisma.candidateDocument.findUnique({ where: { id: documentId } });
  if (!document) throw AppError.notFound("Document not found");
  return prisma.candidateDocument.update({
    where: { id: documentId },
    data: { status: input.status, rejectionReason: input.status === "Rejected" ? input.reason : null, verifiedBy: actorUserId, verifiedAt: new Date() },
  });
}

export async function createEmployeeAccount(applicationId: string) {
    const application = await getApplication(applicationId);

    if (application.offer?.status !== "Accepted") {
        throw AppError.badRequest(
            "Candidate must accept the offer first"
        );
    }

    if (
        !application.documents.length ||
        application.documents.some(
            (doc: any) => doc.status !== "Verified"
        )
    ) {
        throw AppError.badRequest(
            "All onboarding documents must be verified first"
        );
    }

    if (application.employeeId) {
        throw AppError.conflict(
            "Employee account has already been created"
        );
    }

    const employeeRole = await prisma.role.findUnique({
        where: {
            name: "EMPLOYEE",
        },
    });

    if (!employeeRole) {
        throw AppError.badRequest(
            "EMPLOYEE role is not configured"
        );
    }

    const email =
        application.candidate.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (existingUser) {
        throw AppError.conflict(
            "A user account already exists for this email"
        );
    }

    const latestEmployee =
        await prisma.employee.findFirst({
            orderBy: {
                employeeCode: "desc",
            },
            select: {
                employeeCode: true,
            },
        });

    const nextNumber =
        Number(
            latestEmployee?.employeeCode.match(/\d+$/)?.[0] || 0
        ) + 1;

    const employeeCode = `EMP${String(
        nextNumber
    ).padStart(3, "0")}`;

    const temporaryPassword = `Welcome@${crypto.randomInt(
        1000,
        9999
    )}`;

    const passwordHash =
        await hashPassword(temporaryPassword);

    const joiningDate =
        application.offer.joiningDate || new Date();

    // 90 days probation
    const probationEndDate = new Date(joiningDate);
    probationEndDate.setDate(
        probationEndDate.getDate() + 90
    );

    const result = await prisma.$transaction(
        async (tx: any) => {

            // =====================================================
            // 1. CREATE USER
            // =====================================================

            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    roleId: employeeRole.id,
                },
            });

            // =====================================================
            // 2. CREATE EMPLOYEE
            // =====================================================

            const employee =
                await tx.employee.create({
                    data: {
                        userId: user.id,

                        employeeCode,

                        firstName:
                            application.candidate.firstName,

                        lastName:
                            application.candidate.lastName || "",

                        personalEmail:
                            email,

                        personalMobile:
                            application.candidate.phone,

                        departmentId:
                            application.requisition.departmentId,

                        designationId:
                            application.requisition.designationId,

                        locationId:
                            application.requisition.locationId,

                        dateOfJoining:
                            joiningDate,
                    },
                });

            // =====================================================
            // 3. CREATE ONBOARDING
            // =====================================================

            const onboarding =
                await tx.onboarding.create({
                    data: {
                        employeeId: employee.id,

                        offerId:
                            application.offer?.id ?? null,

                        joinDate: joiningDate,

                        probationEndDate,

                        buddy: null,

                        status: "NOT_STARTED",
                    },
                });

            // =====================================================
            // 4. CREATE CHECKLIST ITEMS
            // =====================================================

            const checklistItems = [
                {
                    title: "Document Verification",
                    category: "Documentation",
                    owner: "HR",
                    dueDays: 1,
                },
                {
                    title: "Create Employee Account",
                    category: "IT",
                    owner: "IT",
                    dueDays: 1,
                },
                {
                    title: "Laptop / Equipment Allocation",
                    category: "Procurement",
                    owner: "IT",
                    dueDays: 2,
                },
                {
                    title: "Email Account Setup",
                    category: "IT",
                    owner: "IT",
                    dueDays: 2,
                },
                {
                    title: "HR Orientation",
                    category: "Orientation",
                    owner: "HR",
                    dueDays: 3,
                },
                {
                    title: "Department Introduction",
                    category: "Orientation",
                    owner: "Manager",
                    dueDays: 5,
                },
                {
                    title: "Assign Buddy",
                    category: "People",
                    owner: "HR",
                    dueDays: 5,
                },
                {
                    title: "First Week Check-in",
                    category: "Check-in",
                    owner: "Manager",
                    dueDays: 7,
                },
            ];

            for (const item of checklistItems) {

                const dueDate = new Date(joiningDate);

                dueDate.setDate(
                    dueDate.getDate() + item.dueDays
                );

                await tx.onboardingChecklistItem.create({
                    data: {
                        onboardingId:
                            onboarding.id,

                        title: item.title,

                        category:
                            item.category,

                        owner:
                            item.owner,

                        dueDate,

                        status: "Pending",
                    },
                });
            }

            // =====================================================
            // 5. UPDATE APPLICATION
            // =====================================================

            await tx.application.update({
                where: {
                    id: applicationId,
                },

                data: {
                    employeeId: employee.id,

                    stage: "Hired",

                    approvalStatus:
                        "Employee Created",
                },
            });

            // =====================================================
            // 6. RECORD JOINING MOVEMENT
            // =====================================================
            await tx.employeeMovement.create({
                data: {
                    employeeId: employee.id,
                    movementType: "Joining",
                    toDepartmentId: application.requisition.departmentId,
                    toDesignationId: application.requisition.designationId,
                    effectiveDate: joiningDate,
                    remarks: "Employee joined from recruitment pipeline",
                },
            });

            // =====================================================
            // 7. COPY CANDIDATE DOCUMENTS TO EMPLOYEE DOCUMENTS
            // =====================================================
            for (const cDoc of application.documents) {
                await tx.employeeDocument.create({
                    data: {
                        employeeId: employee.id,
                        documentType: cDoc.documentType,
                        category: "Identity",
                        fileName: cDoc.fileName,
                        fileUrl: cDoc.fileUrl,
                        status: cDoc.status === "Verified" ? "Verified" : "Pending",
                        verifiedById: cDoc.verifiedBy,
                        verifiedAt: cDoc.verifiedAt,
                    },
                });
            }

            // =====================================================
            // 8. INITIALIZE SALARY STRUCTURE FROM OFFER
            // =====================================================
            if (application.offer?.proposedSalary) {
                const annual = Number(application.offer.proposedSalary);
                const monthly = annual / 12;
                const basic = Math.round(monthly * 0.50);
                const hra = Math.round(monthly * 0.20);
                const special = Math.round(monthly * 0.30);
                const pf = Math.min(1800, Math.round(basic * 0.12));
                const pt = 200;
                await tx.salaryStructure.create({
                    data: {
                        employeeId: employee.id,
                        effectiveFrom: joiningDate,
                        basicSalary: basic,
                        hra: hra,
                        conveyanceAllowance: 0,
                        medicalAllowance: 0,
                        performanceBonus: 0,
                        otherAllowances: special,
                        providentFund: pf,
                        professionalTax: pt,
                        incomeTax: 0,
                        healthInsurance: 500,
                        isActive: true,
                    },
                });
            }

            // =====================================================
            // 9. INITIALIZE LEAVE BALANCES
            // =====================================================
            const leaveTypes = await tx.leaveType.findMany({ where: { isActive: true } });
            const curYear = joiningDate.getFullYear();
            for (const lt of leaveTypes) {
                await tx.leaveBalance.create({
                    data: {
                        employeeId: employee.id,
                        leaveTypeId: lt.id,
                        year: curYear,
                        totalDays: lt.defaultAnnualDays,
                        usedDays: 0,
                    },
                });
            }

            // =====================================================
            // 10. EXPIRE OFFER INVITATION
            // =====================================================

            if (application.offer) {
                await tx.offer.update({
                    where: {
                        id: application.offer.id,
                    },

                    data: {
                        invitationExpiresAt:
                            new Date(),
                    },
                });
            }

            return {
                employee,
                onboarding,
            };
        }
    );

    return {
        employee: result.employee,

        onboarding: result.onboarding,

        loginEmail: email,

        temporaryPassword,
    };
}

async function getApplication(id: string) {
  const application = await prisma.application.findUnique({ where: { id }, include: lifecycleInclude });
  if (!application) throw AppError.notFound("Application not found");
  return application;
}
