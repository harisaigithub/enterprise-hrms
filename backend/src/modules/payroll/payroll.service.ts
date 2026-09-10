import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import PDFDocument from "pdfkit";
import minioClient, { MINIO_BUCKET } from "../../config/minio";
import {
  maskBankAccount,
  maskPAN,
  maskUAN,
  maskPFAccount,
  maskCIN,
  maskGSTIN,
  maskPFRegistration,
  maskESICRegistration,
} from "../../lib/masking";

import { decryptPII } from "../../lib/encryption";

import {
  serializePayrollRunList,
  serializePayslipList,
  serializePayslip,
  runPublicId,
  buildPayslipAmounts,
} from "../../serializers/payroll.serializer";

const RUN_INCLUDE = { approvedByEmployee: { select: { employeeCode: true } } };
const SLIP_INCLUDE = {
  employee: { select: { employeeCode: true, firstName: true, lastName: true } },
  payrollRun: true,
};

export async function listPayrollRuns() {
  const runs = await prisma.payrollRun.findMany({
    include: RUN_INCLUDE,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return { data: serializePayrollRunList(runs) };
}

export async function getPayrollRun(id: string) {
  const parsed = parseRunPublicId(id);
  const run = await prisma.payrollRun.findUnique({
    where: { month_year: { month: parsed.month, year: parsed.year } },
    include: RUN_INCLUDE,
  });
  if (!run) throw AppError.notFound("Payroll run not found");
  return { data: serializePayrollRunList([run])[0] };
}

export async function listPayslips(employeeId?: string) {
  const where = employeeId ? { employee: { employeeCode: employeeId } } : {};
  const slips = await prisma.payslip.findMany({
    where,
    include: SLIP_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return { data: serializePayslipList(slips) };
}

export async function getPayslip(id: string) {
  // Public payslip id format: PS-YYYY-MM-EMPCODE
  const parts = id.split("-");
  if (parts.length < 4 || parts[0] !== "PS") throw AppError.badRequest("Invalid payslip id");
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const employeeCode = parts.slice(3).join("-");

  const run = await prisma.payrollRun.findUnique({ where: { month_year: { month, year } } });
  const employee = await prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } });
  if (!run || !employee) throw AppError.notFound("Payslip not found");

  const slip = await prisma.payslip.findUnique({
    where: { payrollRunId_employeeId: { payrollRunId: run.id, employeeId: employee.id } },
    include: SLIP_INCLUDE,
  });
  if (!slip) throw AppError.notFound("Payslip not found");
  return { data: serializePayslipList([slip])[0] };
}

/**
 * Process a payroll run: validate it's in Draft, generate payslips for all
 * active employees from their active salary structure, and move to Processing.
 * High-impact action — requires payroll:write + four-eyes via approve.
 */
export async function processPayrollRun(id: string, actorEmployeeId?: string) {
  const parsed = parseRunPublicId(id);
  const run = await prisma.payrollRun.findUnique({
    where: { month_year: { month: parsed.month, year: parsed.year } },
  });
  if (!run) throw AppError.notFound("Payroll run not found");
  if (run.status === "Locked" || run.status === "Paid") {
    throw AppError.conflict(`Payroll run is ${run.status} and cannot be modified.`);
  }
  if (run.status !== "Draft") {
    throw AppError.conflict(`Only Draft runs can be processed (current: ${run.status})`);
  }

  const [employees, structures] = await Promise.all([
    prisma.employee.findMany({ where: { status: "Active" }, select: { id: true, employeeCode: true } }),
    prisma.salaryStructure.findMany({
      where: { isActive: true },
      include: { employee: { select: { id: true, status: true } } },
    }),
  ]);

  const activeEmployeeIds = new Set(employees.map((e) => e.id));
  const structureByEmployee = new Map<string, (typeof structures)[number]>();
  for (const s of structures) {
    if (activeEmployeeIds.has(s.employeeId)) structureByEmployee.set(s.employeeId, s);
  }

  let gross = 0;
  let deductions = 0;
  let net = 0;

  const slipData = employees.map((emp) => {
    const structure = structureByEmployee.get(emp.id);
    if (!structure) return null;
    const amounts = buildPayslipAmounts(structure);
    gross += amounts.earnings.total;
    deductions += amounts.deductions.total;
    net += amounts.netPay;
    return {
      employeeId: emp.id,
      salaryStructureId: structure.id,
      earnings: amounts.earnings,
      deductions: amounts.deductions,
      netPay: amounts.netPay,
    };
  });

  const valid = slipData.filter((s): s is NonNullable<typeof s> => s !== null);

  const updated = await prisma.$transaction(async (tx: any) => {
    await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });
    for (const slip of valid) {
      await tx.payslip.create({
        data: {
          payrollRunId: run.id,
          period: `${run.period}`,
          employeeId: slip.employeeId,
          salaryStructureId: slip.salaryStructureId,
          earnings: slip.earnings,
          deductions: slip.deductions,
          netPay: slip.netPay,
        },
      });
    }
    return tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "Processing",
        totalEmployees: valid.length,
        grossPayroll: Math.round(gross),
        totalDeductions: Math.round(deductions),
        netPayroll: Math.round(net),
      },
      include: RUN_INCLUDE,
    });
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "PayrollRun",
    entityId: run.id,
    actorUserId: actorEmployeeId ?? undefined,
    oldValue: { status: "Draft" },
    newValue: { status: "Processing", totalEmployees: valid.length, grossPayroll: gross, netPayroll: net },
  });

  return {
    data: { id: runPublicId(updated), status: updated.status, startedAt: new Date().toISOString() },
  };
}

/**
 * Approve a processed run (four-eyes / second-person approval). Requires
 * payroll:approve permission — enforced at route level.
 */
export async function approvePayrollRun(id: string, approverEmployeeId: string) {
  const parsed = parseRunPublicId(id);
  const run = await prisma.payrollRun.findUnique({
    where: { month_year: { month: parsed.month, year: parsed.year } },
  });
  if (!run) throw AppError.notFound("Payroll run not found");
  if (run.status !== "Processing") {
    throw AppError.conflict(`Only Processing runs can be approved (current: ${run.status})`);
  }

  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "Paid",
      processedOn: new Date(),
      approvedBy: approverEmployeeId,
    },
    include: RUN_INCLUDE,
  });

  await prisma.payslip.updateMany({
    where: { payrollRunId: run.id },
    data: { status: "Paid", paidOn: new Date(), paymentMode: "Bank Transfer" },
  });

  writeAuditLog({
    action: "APPROVE",
    entityType: "PayrollRun",
    entityId: run.id,
    actorUserId: approverEmployeeId ?? undefined,
    oldValue: { status: "Processing" },
    newValue: { status: "Paid" },
  });

  return { data: serializePayrollRunList([updated])[0] };
}

/**
 * Lock a payroll run. Once LOCKED, no recalculations, edits, or payslip additions can be made.
 */
export async function lockPayrollRun(id: string, actorEmployeeId?: string) {
  const parsed = parseRunPublicId(id);
  const run = await prisma.payrollRun.findUnique({
    where: { month_year: { month: parsed.month, year: parsed.year } },
  });
  if (!run) throw AppError.notFound("Payroll run not found");
  if (run.status === "Locked") {
    return { data: serializePayrollRunList([run])[0] };
  }

  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: "Locked",
    },
    include: RUN_INCLUDE,
  });

  writeAuditLog({
    action: "UPDATE",
    entityType: "PayrollRun",
    entityId: run.id,
    actorUserId: actorEmployeeId ?? undefined,
    oldValue: { status: run.status },
    newValue: { status: "Locked" },
  });

  return { data: serializePayrollRunList([updated])[0] };
}

/** Parse a PR-YYYY-MM public id. */
export function parseRunPublicId(id: string): { year: number; month: number } {
  const match = /^PR-(\d{4})-(\d{2})$/.exec(id);
  if (!match) throw AppError.badRequest("Invalid payroll run id — expected PR-YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw AppError.badRequest("Invalid month in payroll run id");
  return { year, month };
}

export async function generatePayslipPdf(id: string) {
  // ============================================================
  // 1. Parse public payslip ID
  // PS-YYYY-MM-EMPXXX
  // ============================================================

  const parts = id.split("-");

  if (parts.length < 4 || parts[0] !== "PS") {
    throw AppError.badRequest("Invalid payslip id");
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const employeeCode = parts.slice(3).join("-");

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !employeeCode
  ) {
    throw AppError.badRequest("Invalid payslip id");
  }

  // ============================================================
  // 2. Find payroll run
  // ============================================================

  const run = await prisma.payrollRun.findUnique({
    where: {
      month_year: {
        month,
        year,
      },
    },
  });

  if (!run) {
    throw AppError.notFound("Payslip not found");
  }

  // ============================================================
  // 3. Find employee WITH department/designation/location
  // ============================================================

  const employee = await prisma.employee.findUnique({
    where: {
      employeeCode,
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,

      uan: true,
      pan: true,
      bankName: true,
      bankAccount: true,
      ifsc: true,
      pfAccount: true,

      department: {
        select: {
          name: true,

          company: {
            select: {
              name: true,
              registrationNumber: true,
              cin: true,
              gstin: true,
              pfRegistration: true,
              esicRegistration: true,
            },
          },
        },
      },

      designation: {
        select: {
          title: true,
        },
      },

      location: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!employee) {
    throw AppError.notFound("Payslip not found");
  }

  // ============================================================
  // 4. Find CURRENT payslip from database
  // ============================================================

  const slip = await prisma.payslip.findUnique({
    where: {
      payrollRunId_employeeId: {
        payrollRunId: run.id,
        employeeId: employee.id,
      },
    },
    include: SLIP_INCLUDE,
  });

  if (!slip) {
    throw AppError.notFound("Payslip not found");
  }

  // ============================================================
  // 5. Serialize payslip
  // ============================================================

  const payslip = serializePayslip(slip);

  // ============================================================
  // 6. Employee information
  // ============================================================

  const employeeName =
    `${employee.firstName} ${employee.lastName}`.trim();

  const pan = employee.pan
    ? maskPAN(decryptPII(employee.pan))
    : "-";

  const uan = employee.uan
    ? maskUAN(decryptPII(employee.uan))
    : "-";

  const bankName =
    employee.bankName ?? "-";

  const bankAccount = employee.bankAccount
    ? maskBankAccount(decryptPII(employee.bankAccount))
    : "-";

  const ifsc =
    employee.ifsc ?? "-";

  const pfAccount = employee.pfAccount
    ? maskPFAccount(decryptPII(employee.pfAccount))
    : "-";

  const department =
    employee.department?.name ?? "-";

  // --------------------------------------------------------
  // Employer / Company Details
  // --------------------------------------------------------

  const company = employee.department?.company;

  const companyName =
    company?.name ?? "-";

  const registrationNumber =
    company?.registrationNumber ?? "-";

  const cin = company?.cin
    ? maskCIN(decryptPII(company.cin))
    : "-";

  const gstin = company?.gstin
    ? maskGSTIN(decryptPII(company.gstin))
    : "-";

  const pfRegistration = company?.pfRegistration
    ? maskPFRegistration(decryptPII(company.pfRegistration))
    : "-";

  const esicRegistration = company?.esicRegistration
    ? maskESICRegistration(decryptPII(company.esicRegistration))
    : "-";

  const designation =
    employee.designation?.title ?? "-";

  const location =
    employee.location?.name ?? "-";

  // ============================================================
  // 10. PDF helpers
  // ============================================================

  const formatMoney = (value: unknown): string => {
    const amount = Number(value || 0);

    return amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (value: unknown): string => {
    if (!value) return "-";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generatedDate = formatDate(new Date());

  const drawLine = (
    doc: PDFKit.PDFDocument,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = "#D9E2EC",
    width = 0.7,
  ) => {
    doc
      .save()
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .strokeColor(color)
      .lineWidth(width)
      .stroke()
      .restore();
  };

  const drawBox = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    fill = "#FFFFFF",
    stroke = "#D9E2EC",
    radius = 8,
  ) => {
    doc
      .save()
      .roundedRect(
        x,
        y,
        width,
        height,
        radius,
      )
      .fillAndStroke(fill, stroke)
      .restore();
  };

  const drawSectionHeader = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    title: string,
    icon: (
      doc: PDFKit.PDFDocument,
      x: number,
      y: number,
    ) => void,
  ) => {
    doc
      .save()
      .roundedRect(
        x,
        y,
        width,
        31,
        8,
      )
      .fill("#EDF5FC");

    doc
      .rect(
        x,
        y + 17,
        width,
        14,
      )
      .fill("#EDF5FC");

    icon(
      doc,
      x + 12,
      y + 4,
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor("#173F6B")
      .text(
        title,
        x + 39,
        y + 9,
      );

    doc.restore();
  };

  const drawField = (
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
  ) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(6.4)
      .fillColor("#718096")
      .text(
        label.toUpperCase(),
        x,
        y,
        {
          width,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(8.2)
      .fillColor("#172B4D")
      .text(
        value || "-",
        x,
        y + 9,
        {
          width,
          height: 20,
          ellipsis: true,
        },
      );
  };

  // ============================================================
  // ICONS
  // ============================================================

  const drawPersonIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .circle(
        x + 10,
        y + 7,
        4.5,
      )
      .fill("#173F6B");

    doc
      .roundedRect(
        x + 3,
        y + 14,
        14,
        9,
        4.5,
      )
      .fill("#173F6B");

    doc.restore();
  };

  const drawBuildingIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .rect(
        x + 4,
        y + 3,
        15,
        19,
      )
      .fill("#173F6B");

    doc
      .rect(
        x + 7,
        y + 7,
        3,
        3,
      )
      .fill("#FFFFFF");

    doc
      .rect(
        x + 13,
        y + 7,
        3,
        3,
      )
      .fill("#FFFFFF");

    doc
      .rect(
        x + 7,
        y + 13,
        3,
        3,
      )
      .fill("#FFFFFF");

    doc
      .rect(
        x + 13,
        y + 13,
        3,
        3,
      )
      .fill("#FFFFFF");

    doc.restore();
  };

  const drawBankIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .moveTo(x + 2, y + 8)
      .lineTo(x + 11, y + 2)
      .lineTo(x + 20, y + 8)
      .closePath()
      .fill("#173F6B");

    doc
      .rect(
        x + 4,
        y + 9,
        14,
        3,
      )
      .fill("#173F6B");

    doc
      .rect(
        x + 5,
        y + 13,
        2.5,
        7,
      )
      .fill("#173F6B");

    doc
      .rect(
        x + 9,
        y + 13,
        2.5,
        7,
      )
      .fill("#173F6B");

    doc
      .rect(
        x + 13,
        y + 13,
        2.5,
        7,
      )
      .fill("#173F6B");

    doc
      .rect(
        x + 3,
        y + 21,
        16,
        2,
      )
      .fill("#173F6B");

    doc.restore();
  };

  const drawWalletIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .roundedRect(
        x + 2,
        y + 5,
        19,
        15,
        3,
      )
      .fill("#147D50");

    doc
      .roundedRect(
        x + 8,
        y + 2,
        12,
        7,
        2,
      )
      .fill("#147D50");

    doc
      .circle(
        x + 17,
        y + 12,
        2,
      )
      .fill("#FFFFFF");

    doc.restore();
  };

  const drawDeductionIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .circle(
        x + 11,
        y + 11,
        10,
      )
      .fill("#C62828");

    doc
      .moveTo(
        x + 11,
        y + 11,
      )
      .lineTo(
        x + 11,
        y + 2,
      )
      .lineTo(
        x + 19,
        y + 6,
      )
      .closePath()
      .fill("#FFFFFF");

    doc.restore();
  };

  const drawMoneyIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .roundedRect(
        x,
        y + 5,
        24,
        16,
        3,
      )
      .fill("#FFFFFF");

    doc
      .circle(
        x + 12,
        y + 13,
        4,
      )
      .fill("#2867A3");

    doc.restore();
  };

  const drawDocumentIcon = (
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ) => {
    doc.save();

    doc
      .roundedRect(
        x + 3,
        y + 1,
        17,
        22,
        2,
      )
      .fill("#173F6B");

    doc
      .moveTo(
        x + 14,
        y + 1,
      )
      .lineTo(
        x + 20,
        y + 7,
      )
      .lineTo(
        x + 14,
        y + 7,
      )
      .closePath()
      .fill("#FFFFFF");

    doc
      .strokeColor("#FFFFFF")
      .lineWidth(1)
      .moveTo(
        x + 7,
        y + 12,
      )
      .lineTo(
        x + 16,
        y + 12,
      )
      .stroke();

    doc
      .strokeColor("#FFFFFF")
      .lineWidth(1)
      .moveTo(
        x + 7,
        y + 16,
      )
      .lineTo(
        x + 16,
        y + 16,
      )
      .stroke();

    doc.restore();
  };

  // ============================================================
  // LOGO
  // ============================================================

  const logoPath = path.join(
    process.cwd(),
    "assets",
    "proteccio-logo.png",
  );

  const logoExists =
    fs.existsSync(logoPath);

  // ============================================================
  // 11. Generate PDF
  // ============================================================

  const pdfBuffer =
    await new Promise<Buffer>(
      (resolve, reject) => {
        const doc =
          new PDFDocument({
            size: "A4",
            margin: 0,

            info: {
              Title:
                `Payslip - ${employeeName}`,

              Author:
                "PROTECCIO",

              Subject:
                `Employee Payslip - ${payslip.period}`,
            },
          });

        const chunks: Buffer[] = [];

        doc.on(
          "data",
          (chunk) => {
            chunks.push(chunk);
          },
        );

        doc.on(
          "end",
          () => {
            resolve(
              Buffer.concat(chunks),
            );
          },
        );

        doc.on(
          "error",
          reject,
        );

        // ======================================================
        // PAGE
        // ======================================================

        const pageWidth = 595.28;
        const pageHeight = 841.89;

        const left = 30;
        const right = 565;
        const width = right - left;

        const navy = "#173F6B";
        const dark = "#172B4D";
        const muted = "#718096";
        const border = "#D9E2EC";
        const green = "#147D50";
        const red = "#C62828";

        // ======================================================
        // HEADER
        // ======================================================

        doc
          .rect(
            0,
            0,
            pageWidth,
            72,
          )
          .fill(navy);

        if (logoExists) {
          try {
            doc.image(
              logoPath,
              25,
              12,
              {
                fit: [48, 48],
              },
            );
          } catch {
            doc
              .circle(
                49,
                36,
                21,
              )
              .fill("#2F9BE8");

            doc
              .font("Helvetica-Bold")
              .fontSize(20)
              .fillColor("#FFFFFF")
              .text(
                "P",
                42,
                26,
              );
          }
        } else {
          doc
            .circle(
              49,
              36,
              21,
            )
            .fill("#2F9BE8");

          doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .fillColor("#FFFFFF")
            .text(
              "P",
              42,
              26,
            );
        }

        doc
          .font("Helvetica-Bold")
          .fontSize(23)
          .fillColor("#FFFFFF")
          .text(
            "PROTECCIO",
            84,
            18,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#DCEBFA")
          .text(
            "PEOPLE  |  PROCESS  |  PROGRESS",
            86,
            46,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(17)
          .fillColor("#FFFFFF")
          .text(
            "EMPLOYEE PAYSLIP",
            370,
            20,
            {
              width: 190,
              align: "right",
            },
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#DCEBFA")
          .text(
            "CONFIDENTIAL & PROPRIETARY",
            370,
            46,
            {
              width: 190,
              align: "right",
            },
          );

        // ======================================================
        // SUMMARY STRIP
        // ======================================================

        let y = 88;

        drawBox(
          doc,
          left,
          y,
          width,
          50,
          "#F7FAFD",
          border,
          7,
        );

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(navy)
          .text(
            companyName,
            left + 14,
            y + 10,
            {
              width: 285,
            },
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(muted)
          .text(
            "Employee Payroll Statement",
            left + 14,
            y + 28,
          );

        drawLine(
          doc,
          365,
          y + 7,
          365,
          y + 43,
          "#C7D5E2",
          0.8,
        );

        drawField(
          doc,
          "Pay Period",
          payslip.period || "-",
          382,
          y + 8,
          80,
        );

        drawField(
          doc,
          "Payslip No.",
          payslip.id || "-",
          470,
          y + 8,
          80,
        );

        // ======================================================
        // EMPLOYER DETAILS
        // ======================================================

        y = 148;

        const employerHeight = 91;

        drawBox(
          doc,
          left,
          y,
          width,
          employerHeight,
          "#FFFFFF",
          border,
          8,
        );

        drawSectionHeader(
          doc,
          left,
          y,
          width,
          "Employer Details",
          drawBuildingIcon,
        );

        const employerY = y + 43;

        drawField(
          doc,
          "Company",
          companyName,
          left + 14,
          employerY,
          165,
        );

        drawField(
          doc,
          "Registration No.",
          registrationNumber,
          left + 190,
          employerY,
          105,
        );

        drawField(
          doc,
          "CIN",
          cin,
          left + 310,
          employerY,
          105,
        );

        drawField(
          doc,
          "GSTIN",
          gstin,
          left + 430,
          employerY,
          90,
        );

        drawField(
          doc,
          "PF Registration",
          pfRegistration,
          left + 14,
          employerY + 29,
          230,
        );

        drawField(
          doc,
          "ESIC Registration",
          esicRegistration,
          left + 265,
          employerY + 29,
          250,
        );

        // ======================================================
        // EMPLOYEE DETAILS
        // ======================================================

        y = 251;

        const employeeHeight = 103;

        drawBox(
          doc,
          left,
          y,
          width,
          employeeHeight,
          "#FFFFFF",
          border,
          8,
        );

        drawSectionHeader(
          doc,
          left,
          y,
          width,
          "Employee Details",
          drawPersonIcon,
        );

        const employeeY = y + 43;

        drawField(
          doc,
          "Employee Name",
          employeeName,
          left + 14,
          employeeY,
          170,
        );

        drawField(
          doc,
          "Employee ID",
          payslip.employeeId || "-",
          left + 200,
          employeeY,
          90,
        );

        drawField(
          doc,
          "Designation",
          designation,
          left + 305,
          employeeY,
          115,
        );

        drawField(
          doc,
          "Department",
          department,
          left + 435,
          employeeY,
          85,
        );

        drawField(
          doc,
          "Location",
          location,
          left + 14,
          employeeY + 31,
          170,
        );

        drawField(
          doc,
          "Payment Status",
          payslip.status || "-",
          left + 200,
          employeeY + 31,
          90,
        );

        drawField(
          doc,
          "Disbursement Date",
          payslip.paidOn || "-",
          left + 305,
          employeeY + 31,
          115,
        );

        drawField(
          doc,
          "Payment Mode",
          payslip.paymentMode || "-",
          left + 435,
          employeeY + 31,
          85,
        );

        // ======================================================
        // STATUTORY / BANKING DETAILS
        // ======================================================

        y = 366;

        const statutoryHeight = 103;

        drawBox(
          doc,
          left,
          y,
          width,
          statutoryHeight,
          "#FFFFFF",
          border,
          8,
        );

        drawSectionHeader(
          doc,
          left,
          y,
          width,
          "Statutory / Banking Details",
          drawBankIcon,
        );

        const statutoryY = y + 43;

        drawField(
          doc,
          "UAN",
          uan,
          left + 14,
          statutoryY,
          105,
        );

        drawField(
          doc,
          "PAN",
          pan,
          left + 135,
          statutoryY,
          105,
        );

        drawField(
          doc,
          "Bank",
          bankName,
          left + 255,
          statutoryY,
          115,
        );

        drawField(
          doc,
          "A/C No.",
          bankAccount,
          left + 385,
          statutoryY,
          135,
        );

        drawField(
          doc,
          "IFSC",
          ifsc,
          left + 14,
          statutoryY + 31,
          150,
        );

        drawField(
          doc,
          "PF No.",
          pfAccount,
          left + 180,
          statutoryY + 31,
          170,
        );

        doc
          .font("Helvetica")
          .fontSize(6.7)
          .fillColor("#718096")
          .text(
            "Confidential employee information is displayed in masked form.",
            left + 14,
            statutoryY + 66,
            {
              width: 500,
            },
          );

        // ======================================================
        // EARNINGS / DEDUCTIONS
        // ======================================================

        y = 481;

        const gap = 14;
        const columnWidth =
          (width - gap) / 2;

        const earningsX = left;
        const deductionsX =
          left + columnWidth + gap;

        const earningsRows: Array<
          [string, number]
        > = [
            [
              "Basic Salary",
              Number(
                payslip.earnings.basicSalary,
              ),
            ],
            [
              "HRA",
              Number(
                payslip.earnings.hra,
              ),
            ],
            [
              "Conveyance Allowance",
              Number(
                payslip.earnings
                  .conveyanceAllowance,
              ),
            ],
            [
              "Medical Allowance",
              Number(
                payslip.earnings
                  .medicalAllowance,
              ),
            ],
            [
              "Performance Bonus",
              Number(
                payslip.earnings
                  .performanceBonus,
              ),
            ],
            [
              "Other Allowances",
              Number(
                payslip.earnings
                  .otherAllowances,
              ),
            ],
          ];

        const deductionRows: Array<
          [string, number]
        > = [
            [
              "Provident Fund",
              Number(
                payslip.deductions
                  .providentFund,
              ),
            ],
            [
              "Professional Tax",
              Number(
                payslip.deductions
                  .professionalTax,
              ),
            ],
            [
              "Income Tax",
              Number(
                payslip.deductions
                  .incomeTax,
              ),
            ],
            [
              "Health Insurance",
              Number(
                payslip.deductions
                  .healthInsurance,
              ),
            ],
          ];

        const tableHeight = 218;
        const headerHeight = 34;
        const rowHeight = 24;
        const totalHeight = 30;

        // ======================================================
        // EARNINGS BOX
        // ======================================================

        drawBox(
          doc,
          earningsX,
          y,
          columnWidth,
          tableHeight,
          "#FFFFFF",
          "#CDE8D9",
          8,
        );

        doc
          .roundedRect(
            earningsX,
            y,
            columnWidth,
            36,
            8,
          )
          .fill("#EAF8F1");

        doc
          .rect(
            earningsX,
            y + 20,
            columnWidth,
            16,
          )
          .fill("#EAF8F1");

        drawWalletIcon(
          doc,
          earningsX + 12,
          y + 7,
        );

        doc
          .font("Helvetica-Bold")
          .fontSize(11.5)
          .fillColor(green)
          .text(
            "Gross Earnings",
            earningsX + 42,
            y + 10,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(muted)
          .text(
            "COMPONENT",
            earningsX + 38,
            y + 47,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(muted)
          .text(
            "AMOUNT",
            earningsX + columnWidth - 68,
            y + 47,
            {
              width: 55,
              align: "right",
            },
          );

        earningsRows.forEach(
          ([label, amount], index) => {
            const rowY =
              y +
              headerHeight +
              16 +
              index *
              rowHeight;

            if (index % 2 === 0) {
              doc
                .rect(
                  earningsX + 1,
                  rowY - 3,
                  columnWidth - 2,
                  rowHeight,
                )
                .fill("#FAFCFE");
            }

            doc
              .font("Helvetica")
              .fontSize(7.8)
              .fillColor(dark)
              .text(
                label,
                earningsX + 38,
                rowY + 3,
                {
                  width:
                    columnWidth - 112,
                  ellipsis: true,
                },
              );

            doc
              .font("Helvetica")
              .fontSize(7.8)
              .fillColor(dark)
              .text(
                formatMoney(amount),
                earningsX +
                columnWidth -
                75,
                rowY + 3,
                {
                  width: 62,
                  align: "right",
                },
              );

            drawLine(
              doc,
              earningsX + 10,
              rowY + rowHeight - 4,
              earningsX +
              columnWidth -
              10,
              rowY + rowHeight - 4,
              "#EDF2F7",
              0.5,
            );
          },
        );

        const earningsTotalY =
          y +
          tableHeight -
          totalHeight;

        doc
          .rect(
            earningsX + 1,
            earningsTotalY,
            columnWidth - 2,
            totalHeight - 1,
          )
          .fill("#EAF8F1");

        doc
          .font("Helvetica-Bold")
          .fontSize(8.2)
          .fillColor(dark)
          .text(
            "TOTAL EARNINGS",
            earningsX + 38,
            earningsTotalY + 10,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(8.2)
          .fillColor(green)
          .text(
            formatMoney(
              payslip.earnings.total,
            ),
            earningsX +
            columnWidth -
            75,
            earningsTotalY + 10,
            {
              width: 62,
              align: "right",
            },
          );

        // ======================================================
        // DEDUCTIONS BOX
        // ======================================================

        drawBox(
          doc,
          deductionsX,
          y,
          columnWidth,
          tableHeight,
          "#FFFFFF",
          "#F0D1D1",
          8,
        );

        doc
          .roundedRect(
            deductionsX,
            y,
            columnWidth,
            36,
            8,
          )
          .fill("#FCEBEC");

        doc
          .rect(
            deductionsX,
            y + 20,
            columnWidth,
            16,
          )
          .fill("#FCEBEC");

        drawDeductionIcon(
          doc,
          deductionsX + 12,
          y + 7,
        );

        doc
          .font("Helvetica-Bold")
          .fontSize(11.5)
          .fillColor(red)
          .text(
            "Deductions & Taxes",
            deductionsX + 42,
            y + 10,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(muted)
          .text(
            "COMPONENT",
            deductionsX + 38,
            y + 47,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor(muted)
          .text(
            "AMOUNT",
            deductionsX + columnWidth - 68,
            y + 47,
            {
              width: 55,
              align: "right",
            },
          );

        deductionRows.forEach(
          ([label, amount], index) => {
            const rowY =
              y +
              headerHeight +
              16 +
              index *
              rowHeight;

            if (index % 2 === 0) {
              doc
                .rect(
                  deductionsX + 1,
                  rowY - 3,
                  columnWidth - 2,
                  rowHeight,
                )
                .fill("#FFFCFC");
            }

            doc
              .font("Helvetica")
              .fontSize(7.8)
              .fillColor(dark)
              .text(
                label,
                deductionsX + 38,
                rowY + 3,
                {
                  width:
                    columnWidth - 112,
                  ellipsis: true,
                },
              );

            doc
              .font("Helvetica")
              .fontSize(7.8)
              .fillColor(red)
              .text(
                `- ${formatMoney(amount)}`,
                deductionsX +
                columnWidth -
                75,
                rowY + 3,
                {
                  width: 62,
                  align: "right",
                },
              );

            drawLine(
              doc,
              deductionsX + 10,
              rowY + rowHeight - 4,
              deductionsX +
              columnWidth -
              10,
              rowY + rowHeight - 4,
              "#F3E5E5",
              0.5,
            );
          },
        );

        const deductionTotalY =
          y +
          tableHeight -
          totalHeight;

        doc
          .rect(
            deductionsX + 1,
            deductionTotalY,
            columnWidth - 2,
            totalHeight - 1,
          )
          .fill("#FCEBEC");

        doc
          .font("Helvetica-Bold")
          .fontSize(8.2)
          .fillColor(dark)
          .text(
            "TOTAL DEDUCTIONS",
            deductionsX + 38,
            deductionTotalY + 10,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(8.2)
          .fillColor(red)
          .text(
            `- ${formatMoney(
              payslip.deductions.total,
            )}`,
            deductionsX +
            columnWidth -
            75,
            deductionTotalY + 10,
            {
              width: 62,
              align: "right",
            },
          );

        // ======================================================
        // NET PAY
        // ======================================================

        y = 711;

        const netHeight = 63;

        drawBox(
          doc,
          left,
          y,
          width,
          netHeight,
          "#EDF5FC",
          "#D4E3F2",
          8,
        );

        doc
          .roundedRect(
            left +
            width * 0.55,
            y,
            width * 0.45,
            netHeight,
            8,
          )
          .fill("#2867A3");

        drawMoneyIcon(
          doc,
          left + 18,
          y + 19,
        );

        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor(navy)
          .text(
            "Net Take-Home Pay",
            left + 53,
            y + 15,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(muted)
          .text(
            "Gross Earnings - Total Deductions",
            left + 53,
            y + 37,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(18)
          .fillColor("#FFFFFF")
          .text(
            `Rs. ${formatMoney(
              payslip.netPay,
            )}`,
            left +
            width * 0.55 +
            8,
            y + 13,
            {
              width:
                width * 0.45 -
                16,
              align: "center",
            },
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#EAF3FC")
          .text(
            "NET SALARY PAYABLE",
            left +
            width * 0.55 +
            8,
            y + 41,
            {
              width:
                width * 0.45 -
                16,
              align: "center",
            },
          );

        // ======================================================
        // DISBURSEMENT INFO
        // ======================================================

        y = 785;

        doc
          .font("Helvetica")
          .fontSize(7.2)
          .fillColor(muted)
          .text(
            `Disbursed to ${bankName} A/C ${bankAccount.replace(
              /^XXXX XXXX /,
              "XXXX ",
            )} on ${payslip.paidOn || "-"}`,
            left,
            y,
            {
              width,
              align: "center",
            },
          );

        // ======================================================
        // FOOTER
        // ======================================================

        const footerY =
          pageHeight - 25;

        drawLine(
          doc,
          left,
          footerY - 7,
          right,
          footerY - 7,
          "#C7D5E2",
          0.7,
        );

        doc
          .font("Helvetica-Bold")
          .fontSize(6.8)
          .fillColor(navy)
          .text(
            "PROTECCIO",
            left,
            footerY,
          );

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(muted)
          .text(
            "This is a computer-generated document. No signature is required.",
            left + 100,
            footerY,
            {
              width: 300,
              align: "center",
            },
          );

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor(muted)
          .text(
            generatedDate,
            right - 75,
            footerY,
            {
              width: 75,
              align: "right",
            },
          );

        // ======================================================
        // END
        // ======================================================

        doc.end();
      },
    );

  // ============================================================
  // 12. Store generated PDF in MinIO
  // ============================================================

  const fileName =
    `${payslip.id}.pdf`;

  const objectName =
    `payroll/payslips/${fileName}`;

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    pdfBuffer,
    pdfBuffer.length,
    {
      "Content-Type":
        "application/pdf",
    },
  );

  return {
    buffer: pdfBuffer,
    fileName,
    objectName,
  };
}

export async function generateAnnualStatementPdf(
  employeeId: string | undefined,
) {
  if (!employeeId) {
    throw AppError.badRequest("Employee information is required");
  }

  // ------------------------------------------------------------
  // 1. Find employee
  // ------------------------------------------------------------

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,

      department: {
        select: {
          name: true,
          company: {
            select: {
              name: true,
              registrationNumber: true,
            },
          },
        },
      },

      designation: {
        select: {
          title: true,
        },
      },

      location: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!employee) {
    throw AppError.notFound("Employee not found");
  }

  // ------------------------------------------------------------
  // 2. Get current financial year
  // ------------------------------------------------------------

  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const financialYearStart =
    currentMonth >= 4
      ? currentYear
      : currentYear - 1;

  const financialYearEnd = financialYearStart + 1;

  // ------------------------------------------------------------
  // 3. Get payroll runs for financial year
  // ------------------------------------------------------------

  const runs = await prisma.payrollRun.findMany({
    where: {
      OR: [
        {
          year: financialYearStart,
          month: {
            gte: 4,
          },
        },
        {
          year: financialYearEnd,
          month: {
            lte: 3,
          },
        },
      ],
    },
    orderBy: [
      {
        year: "asc",
      },
      {
        month: "asc",
      },
    ],
  });

  // ------------------------------------------------------------
  // 4. Find payslips for employee
  // ------------------------------------------------------------

  const slips = await prisma.payslip.findMany({
    where: {
      employeeId: employee.id,
      payrollRunId: {
        in: runs.map((run) => run.id),
      },
    },
    include: SLIP_INCLUDE,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!slips.length) {
    throw AppError.notFound(
      "No payroll records found for this financial year",
    );
  }

  const serializedSlips = slips.map((slip) =>
    serializePayslip(slip),
  );

  // ------------------------------------------------------------
  // 5. Calculate totals
  // ------------------------------------------------------------

  let totalBasic = 0;
  let totalHra = 0;
  let totalConveyance = 0;
  let totalMedical = 0;
  let totalBonus = 0;
  let totalOtherAllowances = 0;

  let totalEarnings = 0;

  let totalPF = 0;
  let totalProfessionalTax = 0;
  let totalIncomeTax = 0;
  let totalHealthInsurance = 0;

  let totalDeductions = 0;
  let totalNetPay = 0;

  serializedSlips.forEach((slip: any) => {
    totalBasic += Number(
      slip.earnings?.basicSalary ?? 0,
    );

    totalHra += Number(
      slip.earnings?.hra ?? 0,
    );

    totalConveyance += Number(
      slip.earnings?.conveyanceAllowance ?? 0,
    );

    totalMedical += Number(
      slip.earnings?.medicalAllowance ?? 0,
    );

    totalBonus += Number(
      slip.earnings?.performanceBonus ?? 0,
    );

    totalOtherAllowances += Number(
      slip.earnings?.otherAllowances ?? 0,
    );

    totalEarnings += Number(
      slip.earnings?.total ?? 0,
    );

    totalPF += Number(
      slip.deductions?.providentFund ?? 0,
    );

    totalProfessionalTax += Number(
      slip.deductions?.professionalTax ?? 0,
    );

    totalIncomeTax += Number(
      slip.deductions?.incomeTax ?? 0,
    );

    totalHealthInsurance += Number(
      slip.deductions?.healthInsurance ?? 0,
    );

    totalDeductions += Number(
      slip.deductions?.total ?? 0,
    );

    totalNetPay += Number(
      slip.netPay ?? 0,
    );
  });

  // ------------------------------------------------------------
  // 6. Company
  // ------------------------------------------------------------

  const company = employee.department?.company;

  const companyName =
    company?.name ?? "Proteccio Technologies Pvt. Ltd.";

  const registrationNumber =
    company?.registrationNumber ?? "-";

  // ------------------------------------------------------------
  // 7. Helpers
  // ------------------------------------------------------------

  const money = (value: number) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const employeeName =
    `${employee.firstName} ${employee.lastName}`.trim();

  const department =
    employee.department?.name ?? "-";

  const designation =
    employee.designation?.title ?? "-";

  const location =
    employee.location?.name ?? "-";

  // ------------------------------------------------------------
  // 8. Generate PDF
  // ------------------------------------------------------------

  const pdfBuffer = await new Promise<Buffer>(
    (resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) =>
        chunks.push(chunk),
      );

      doc.on("end", () =>
        resolve(Buffer.concat(chunks)),
      );

      doc.on("error", reject);

      const pageWidth = 595;
      const left = 40;
      const right = pageWidth - 40;
      const contentWidth = right - left;

      const dark = "#172B4D";
      const muted = "#64748B";
      const border = "#D9E2EC";
      const light = "#F5F8FC";

      // --------------------------------------------------------
      // Header
      // --------------------------------------------------------

      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(dark)
        .text(companyName, left, 40);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(muted)
        .text(
          "ANNUAL PAYROLL STATEMENT",
          left,
          66,
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(
          `Financial Year ${financialYearStart}-${String(
            financialYearEnd,
          ).slice(-2)}`,
          right - 130,
          45,
          {
            width: 130,
            align: "right",
          },
        );

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(
          `Generated: ${new Date().toLocaleDateString(
            "en-IN",
          )}`,
          right - 130,
          59,
          {
            width: 130,
            align: "right",
          },
        );

      doc
        .moveTo(left, 85)
        .lineTo(right, 85)
        .lineWidth(0.8)
        .strokeColor(border)
        .stroke();

      // --------------------------------------------------------
      // Employee Details
      // --------------------------------------------------------

      let y = 105;

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(dark)
        .text("Employee Details", left, y);

      y += 25;

      doc
        .roundedRect(
          left,
          y,
          contentWidth,
          72,
          6,
        )
        .fillColor(light)
        .fill();

      doc
        .roundedRect(
          left,
          y,
          contentWidth,
          72,
          6,
        )
        .lineWidth(0.7)
        .strokeColor(border)
        .stroke();

      const col1 = left + 14;
      const col2 = left + 190;
      const col3 = left + 370;

      const detail = (
        label: string,
        value: string,
        x: number,
        yy: number,
      ) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor(muted)
          .text(label.toUpperCase(), x, yy);

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(dark)
          .text(value || "-", x, yy + 9, {
            width: 155,
          });
      };

      detail(
        "Employee",
        employeeName,
        col1,
        y + 12,
      );

      detail(
        "Employee ID",
        employee.employeeCode,
        col2,
        y + 12,
      );

      detail(
        "Department",
        department,
        col3,
        y + 12,
      );

      detail(
        "Designation",
        designation,
        col1,
        y + 42,
      );

      detail(
        "Location",
        location,
        col2,
        y + 42,
      );

      detail(
        "Registration No",
        registrationNumber,
        col3,
        y + 42,
      );

      y += 95;

      // --------------------------------------------------------
      // Monthly Payroll
      // --------------------------------------------------------

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(dark)
        .text("Monthly Payroll Summary", left, y);

      y += 20;

      const tableX = left;
      const tableWidth = contentWidth;

      doc
        .rect(
          tableX,
          y,
          tableWidth,
          25,
        )
        .fillColor(dark)
        .fill();

      const headers = [
        "Month",
        "Gross Earnings",
        "Deductions",
        "Net Pay",
      ];

      const widths = [
        150,
        140,
        140,
        85,
      ];

      let x = tableX;

      headers.forEach(
        (header, index) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#FFFFFF")
            .text(
              header,
              x + 7,
              y + 8,
              {
                width: widths[index] - 14,
                align:
                  index === 0
                    ? "left"
                    : "right",
              },
            );

          x += widths[index];
        },
      );

      y += 25;

      serializedSlips.forEach(
        (slip: any, index: number) => {
          if (y > 700) {
            doc.addPage();
            y = 45;
          }

          if (index % 2 === 0) {
            doc
              .rect(
                tableX,
                y,
                tableWidth,
                24,
              )
              .fillColor("#FAFCFE")
              .fill();
          }

          const period =
            slip.period ?? "-";

          const row = [
            period,
            money(
              Number(
                slip.earnings?.total ?? 0,
              ),
            ),
            money(
              Number(
                slip.deductions?.total ?? 0,
              ),
            ),
            money(
              Number(
                slip.netPay ?? 0,
              ),
            ),
          ];

          let rx = tableX;

          row.forEach(
            (value, index) => {
              doc
                .font("Helvetica")
                .fontSize(7.5)
                .fillColor(dark)
                .text(
                  value,
                  rx + 7,
                  y + 8,
                  {
                    width:
                      widths[index] - 14,
                    align:
                      index === 0
                        ? "left"
                        : "right",
                  },
                );

              rx += widths[index];
            },
          );

          doc
            .moveTo(tableX, y + 24)
            .lineTo(
              tableX + tableWidth,
              y + 24,
            )
            .lineWidth(0.5)
            .strokeColor(border)
            .stroke();

          y += 24;
        },
      );

      // --------------------------------------------------------
      // Totals
      // --------------------------------------------------------

      y += 18;

      if (y > 680) {
        doc.addPage();
        y = 50;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(dark)
        .text("Annual Totals", left, y);

      y += 20;

      const totals: [string, number][] = [
        ["Basic Salary", totalBasic],
        ["HRA", totalHra],
        ["Conveyance", totalConveyance],
        ["Medical Allowance", totalMedical],
        ["Performance Bonus", totalBonus],
        ["Other Allowances", totalOtherAllowances],
        ["Total Earnings", totalEarnings],
        ["Provident Fund", totalPF],
        ["Professional Tax", totalProfessionalTax],
        ["Income Tax", totalIncomeTax],
        ["Health Insurance", totalHealthInsurance],
        ["Total Deductions", totalDeductions],
      ];

      totals.forEach(
        ([label, value], index) => {
          const yy =
            y + index * 20;

          doc
            .font(
              label.includes("Total")
                ? "Helvetica-Bold"
                : "Helvetica",
            )
            .fontSize(8)
            .fillColor(dark)
            .text(
              label,
              left + 10,
              yy,
            );

          doc
            .text(
              money(Number(value)),
              right - 110,
              yy,
              {
                width: 100,
                align: "right",
              },
            );
        },
      );

      y += totals.length * 20 + 12;

      // --------------------------------------------------------
      // Net Pay
      // --------------------------------------------------------

      doc
        .roundedRect(
          left,
          y,
          contentWidth,
          52,
          7,
        )
        .fillColor(dark)
        .fill();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#FFFFFF")
        .text(
          "TOTAL NET TAKE-HOME PAY",
          left + 15,
          y + 12,
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor("#FFFFFF")
        .text(
          money(totalNetPay),
          right - 160,
          y + 10,
          {
            width: 145,
            align: "right",
          },
        );

      y += 75;

      // --------------------------------------------------------
      // Footer
      // --------------------------------------------------------

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.6)
        .strokeColor(border)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(muted)
        .text(
          "This is a computer-generated payroll statement.",
          left,
          y + 12,
        );

      doc
        .text(
          "For payroll discrepancies, please raise a ticket under Helpdesk → Payroll.",
          left,
          y + 24,
        );

      doc.end();
    },
  );

  // ------------------------------------------------------------
  // 9. Store PDF in MinIO
  // ------------------------------------------------------------

  const fileName =
    `annual-payroll-${employee.employeeCode}-${financialYearStart}-${String(
      financialYearEnd,
    ).slice(-2)}.pdf`;

  const objectName =
    `payroll/annual-statements/${fileName}`;

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    pdfBuffer,
    pdfBuffer.length,
    {
      "Content-Type": "application/pdf",
    },
  );

  return {
    buffer: pdfBuffer,
    fileName,
    objectName,
  };
}

export async function generateForm16Pdf(
  employeeId: string | undefined,
) {
  if (!employeeId) {
    throw AppError.badRequest("Employee information is required");
  }

  // ------------------------------------------------------------
  // 1. Employee
  // ------------------------------------------------------------

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,

      department: {
        select: {
          name: true,
          company: {
            select: {
              name: true,
              registrationNumber: true,
              cin: true,
              gstin: true,
              pfRegistration: true,
              esicRegistration: true,
            },
          },
        },
      },

      designation: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!employee) {
    throw AppError.notFound("Employee not found");
  }

  // ------------------------------------------------------------
  // 2. Financial year
  // ------------------------------------------------------------

  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const financialYearStart =
    currentMonth >= 4
      ? currentYear
      : currentYear - 1;

  const financialYearEnd =
    financialYearStart + 1;

  // ------------------------------------------------------------
  // 3. Payroll runs
  // ------------------------------------------------------------

  const runs =
    await prisma.payrollRun.findMany({
      where: {
        OR: [
          {
            year: financialYearStart,
            month: {
              gte: 4,
            },
          },
          {
            year: financialYearEnd,
            month: {
              lte: 3,
            },
          },
        ],
      },
      orderBy: [
        {
          year: "asc",
        },
        {
          month: "asc",
        },
      ],
    });

  // ------------------------------------------------------------
  // 4. Payslips
  // ------------------------------------------------------------

  const slips =
    await prisma.payslip.findMany({
      where: {
        employeeId: employee.id,
        payrollRunId: {
          in: runs.map(
            (run) => run.id,
          ),
        },
      },
      include: SLIP_INCLUDE,
      orderBy: {
        createdAt: "asc",
      },
    });

  if (!slips.length) {
    throw AppError.notFound(
      "No payroll records found for this financial year",
    );
  }

  const serializedSlips =
    slips.map((slip) =>
      serializePayslip(slip),
    );

  // ------------------------------------------------------------
  // 5. Calculate Form-16 summary
  // ------------------------------------------------------------

  let grossSalary = 0;
  let providentFund = 0;
  let professionalTax = 0;
  let incomeTax = 0;
  let healthInsurance = 0;

  serializedSlips.forEach(
    (slip: any) => {
      grossSalary += Number(
        slip.earnings?.total ?? 0,
      );

      providentFund += Number(
        slip.deductions?.providentFund ?? 0,
      );

      professionalTax += Number(
        slip.deductions?.professionalTax ?? 0,
      );

      incomeTax += Number(
        slip.deductions?.incomeTax ?? 0,
      );

      healthInsurance += Number(
        slip.deductions?.healthInsurance ?? 0,
      );
    },
  );

  const totalDeductions =
    providentFund +
    professionalTax +
    incomeTax +
    healthInsurance;

  const taxableIncome =
    Math.max(
      0,
      grossSalary -
      providentFund -
      professionalTax,
    );

  const company =
    employee.department?.company;

  const companyName =
    company?.name ??
    "Proteccio Technologies Pvt. Ltd.";

  const employeeName =
    `${employee.firstName} ${employee.lastName}`.trim();

  const department =
    employee.department?.name ?? "-";

  const designation =
    employee.designation?.title ?? "-";

  const money = (value: number) =>
    `₹${Number(value || 0).toLocaleString(
      "en-IN",
    )}`;

  // ------------------------------------------------------------
  // 6. PDF
  // ------------------------------------------------------------

  const pdfBuffer =
    await new Promise<Buffer>(
      (resolve, reject) => {
        const doc = new PDFDocument({
          size: "A4",
          margin: 45,
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk) =>
          chunks.push(chunk),
        );

        doc.on("end", () =>
          resolve(
            Buffer.concat(chunks),
          ),
        );

        doc.on("error", reject);

        const left = 45;
        const right = 550;
        const width = right - left;

        const dark = "#172B4D";
        const muted = "#64748B";
        const border = "#D9E2EC";

        // ------------------------------------------------------
        // Header
        // ------------------------------------------------------

        doc
          .font("Helvetica-Bold")
          .fontSize(19)
          .fillColor(dark)
          .text(
            companyName,
            left,
            45,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(dark)
          .text(
            "FORM-16 / TAX SUMMARY",
            left,
            78,
          );

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(muted)
          .text(
            `Financial Year ${financialYearStart}-${String(
              financialYearEnd,
            ).slice(-2)}`,
            right - 150,
            80,
            {
              width: 150,
              align: "right",
            },
          );

        doc
          .moveTo(left, 102)
          .lineTo(right, 102)
          .lineWidth(0.8)
          .strokeColor(border)
          .stroke();

        // ------------------------------------------------------
        // Employer
        // ------------------------------------------------------

        let y = 120;

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(dark)
          .text(
            "Employer Details",
            left,
            y,
          );

        y += 22;

        doc
          .roundedRect(
            left,
            y,
            width,
            70,
            6,
          )
          .fillColor("#F5F8FC")
          .fill();

        doc
          .roundedRect(
            left,
            y,
            width,
            70,
            6,
          )
          .lineWidth(0.7)
          .strokeColor(border)
          .stroke();

        const item = (
          label: string,
          value: string,
          x: number,
          yy: number,
        ) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor(muted)
            .text(
              label.toUpperCase(),
              x,
              yy,
            );

          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor(dark)
            .text(
              value || "-",
              x,
              yy + 9,
              {
                width: 150,
              },
            );
        };

        item(
          "Employer",
          companyName,
          left + 12,
          y + 12,
        );

        item(
          "Registration No",
          company?.registrationNumber ?? "-",
          left + 185,
          y + 12,
        );

        item(
          "Department",
          department,
          left + 360,
          y + 12,
        );

        item(
          "Employee",
          employeeName,
          left + 12,
          y + 42,
        );

        item(
          "Employee ID",
          employee.employeeCode,
          left + 185,
          y + 42,
        );

        item(
          "Designation",
          designation,
          left + 360,
          y + 42,
        );

        y += 95;

        // ------------------------------------------------------
        // Income
        // ------------------------------------------------------

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(dark)
          .text(
            "Income Summary",
            left,
            y,
          );

        y += 22;

        const incomeRows: [string, number][] = [
          ["Gross Salary", grossSalary],
          ["Provident Fund", providentFund],
          ["Professional Tax", professionalTax],
          ["Taxable Income", taxableIncome],
        ];

        incomeRows.forEach(
          ([label, amount], index) => {
            const rowY =
              y + index * 28;

            if (index % 2 === 0) {
              doc
                .rect(
                  left,
                  rowY,
                  width,
                  28,
                )
                .fillColor("#FAFCFE")
                .fill();
            }

            doc
              .font(
                label ===
                  "Taxable Income"
                  ? "Helvetica-Bold"
                  : "Helvetica",
              )
              .fontSize(8.5)
              .fillColor(dark)
              .text(
                label,
                left + 12,
                rowY + 9,
              );

            doc
              .font(
                label ===
                  "Taxable Income"
                  ? "Helvetica-Bold"
                  : "Helvetica",
              )
              .text(
                money(
                  Number(amount),
                ),
                right - 120,
                rowY + 9,
                {
                  width: 105,
                  align: "right",
                },
              );

            doc
              .moveTo(
                left,
                rowY + 28,
              )
              .lineTo(
                right,
                rowY + 28,
              )
              .lineWidth(0.5)
              .strokeColor(border)
              .stroke();
          },
        );

        y +=
          incomeRows.length * 28 +
          25;

        // ------------------------------------------------------
        // Tax deducted
        // ------------------------------------------------------

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(dark)
          .text(
            "Tax & Statutory Deductions",
            left,
            y,
          );

        y += 22;

        const taxRows: [string, number][] = [
          ["Income Tax Deducted", incomeTax],
          ["Provident Fund", providentFund],
          ["Professional Tax", professionalTax],
          ["Health Insurance", healthInsurance],
          ["Total Deductions", totalDeductions],
        ];

        taxRows.forEach(
          ([label, amount], index) => {
            const rowY =
              y + index * 28;

            if (index % 2 === 0) {
              doc
                .rect(
                  left,
                  rowY,
                  width,
                  28,
                )
                .fillColor("#FAFCFE")
                .fill();
            }

            doc
              .font(
                label ===
                  "Total Deductions"
                  ? "Helvetica-Bold"
                  : "Helvetica",
              )
              .fontSize(8.5)
              .fillColor(dark)
              .text(
                label,
                left + 12,
                rowY + 9,
              );

            doc
              .font(
                label ===
                  "Total Deductions"
                  ? "Helvetica-Bold"
                  : "Helvetica",
              )
              .text(
                money(
                  Number(amount),
                ),
                right - 120,
                rowY + 9,
                {
                  width: 105,
                  align: "right",
                },
              );

            doc
              .moveTo(
                left,
                rowY + 28,
              )
              .lineTo(
                right,
                rowY + 28,
              )
              .lineWidth(0.5)
              .strokeColor(border)
              .stroke();
          },
        );

        y +=
          taxRows.length * 28 +
          25;

        // ------------------------------------------------------
        // Taxable income highlight
        // ------------------------------------------------------

        doc
          .roundedRect(
            left,
            y,
            width,
            58,
            7,
          )
          .fillColor(dark)
          .fill();

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#FFFFFF")
          .text(
            "TAXABLE INCOME",
            left + 15,
            y + 12,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(16)
          .fillColor("#FFFFFF")
          .text(
            money(taxableIncome),
            right - 170,
            y + 10,
            {
              width: 150,
              align: "right",
            },
          );

        y += 90;

        // ------------------------------------------------------
        // Footer
        // ------------------------------------------------------

        doc
          .moveTo(left, y)
          .lineTo(right, y)
          .lineWidth(0.6)
          .strokeColor(border)
          .stroke();

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(muted)
          .text(
            "This is a computer-generated tax summary.",
            left,
            y + 12,
          );

        doc
          .text(
            "For payroll discrepancies, please raise a ticket under Helpdesk → Payroll.",
            left,
            y + 24,
          );

        doc.end();
      },
    );

  // ------------------------------------------------------------
  // 7. MinIO
  // ------------------------------------------------------------

  const fileName =
    `form16-${employee.employeeCode}-${financialYearStart}-${String(
      financialYearEnd,
    ).slice(-2)}.pdf`;

  const objectName =
    `payroll/form16/${fileName}`;

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    pdfBuffer,
    pdfBuffer.length,
    {
      "Content-Type": "application/pdf",
    },
  );

  return {
    buffer: pdfBuffer,
    fileName,
    objectName,
  };
}