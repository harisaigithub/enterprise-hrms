import { prisma } from "../../lib/prisma";

const separationInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  settlement: true,
} as const;

function serializeSeparation(separation: any) {
  return {
    ...separation,
    employeeName: separation.employee
      ? `${separation.employee.firstName} ${separation.employee.lastName}`
      : separation.employeeId,
    settlement: separation.settlement
      ? {
          ...separation.settlement,
          pendingSalary: Number(separation.settlement.pendingSalary),
          leaveEncashment: Number(
            separation.settlement.leaveEncashment
          ),
          reimbursements: Number(
            separation.settlement.reimbursements
          ),
          recoveries: Number(separation.settlement.recoveries),
          netSettlement: Number(
            separation.settlement.netSettlement
          ),
        }
      : null,
  };
}

/* =========================================================
   SEPARATIONS
========================================================= */

export async function getSeparations() {
  const separations = await prisma.separation.findMany({
    include: separationInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return separations.map(serializeSeparation);
}

export async function initiateSeparation(input: {
  employeeId: string;
  type: string;
  reason: string;
  submittedOn: string | Date;
  lastWorkingDay: string | Date;
  noticePeriodDays: number;
}) {
  /* =========================================================
     VALIDATION
  ========================================================= */

  if (!input.employeeId?.trim()) {
    throw new Error("Employee is required");
  }

  if (!input.reason?.trim()) {
    throw new Error("Separation reason is required");
  }

  if (!["Resignation", "Termination"].includes(input.type)) {
    throw new Error("Invalid separation type");
  }

  const noticePeriodDays = Number(
    input.noticePeriodDays
  );

  if (
    !Number.isInteger(noticePeriodDays) ||
    noticePeriodDays < 0
  ) {
    throw new Error(
      "Notice period must be a valid non-negative number"
    );
  }

  /* =========================================================
     RESOLVE EMPLOYEE

     Frontend sends:
       employeeId = "EMP001"

     Employee table:
       id           = actual UUID
       employeeCode = "EMP001"

     Therefore lookup by employeeCode.
  ========================================================= */

  const employee = await prisma.employee.findUnique({
    where: {
      employeeCode: input.employeeId.trim(),
    },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  /* =========================================================
     EMPLOYEE STATUS VALIDATION
  ========================================================= */

  if (employee.status !== "Active") {
    throw new Error(
      "Separation can only be initiated for an active employee"
    );
  }

  /* =========================================================
     CHECK EXISTING ACTIVE SEPARATION

     IMPORTANT:
     Use employee.id here, NOT employeeCode.
  ========================================================= */

  const existing = await prisma.separation.findFirst({
    where: {
      employeeId: employee.id,
      status: {
        notIn: ["Alumni", "Completed"],
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existing) {
    throw new Error(
      "Employee already has an active separation"
    );
  }

  /* =========================================================
     DATE VALIDATION
  ========================================================= */

  const submittedOn = new Date(
    input.submittedOn
  );

  const lastWorkingDay = new Date(
    input.lastWorkingDay
  );

  if (Number.isNaN(submittedOn.getTime())) {
    throw new Error(
      "Invalid submitted date"
    );
  }

  if (Number.isNaN(lastWorkingDay.getTime())) {
    throw new Error(
      "Invalid last working day"
    );
  }

  if (lastWorkingDay < submittedOn) {
    throw new Error(
      "Last working day cannot be before submitted date"
    );
  }

  /* =========================================================
     CREATE SEPARATION + CLEARANCE CHECKLIST

     Transaction ensures that either everything is created
     or nothing is created.
  ========================================================= */

  const separation =
    await prisma.$transaction(async (tx: any) => {
      const createdSeparation =
        await tx.separation.create({
          data: {
            /*
             * VERY IMPORTANT:
             * Store actual Employee UUID.
             */
            employeeId: employee.id,

            type: input.type,

            reason: input.reason.trim(),

            submittedOn,

            lastWorkingDay,

            noticePeriodDays,

            status: "Notice Period",

            exitInterviewCompleted: false,

            accessRevoked: false,
          },

          include: separationInclude,
        });

      /*
       * Backend creates the standard clearance
       * checklist. Frontend cannot manipulate this.
       */

      await tx.separationClearance.createMany({
        data: [
          {
            separationId:
              createdSeparation.id,
            item: "IT Asset Return",
            owner: "IT",
            status: "Pending",
          },
          {
            separationId:
              createdSeparation.id,
            item: "Finance Clearance",
            owner: "Finance",
            status: "Pending",
          },
          {
            separationId:
              createdSeparation.id,
            item: "HR Clearance",
            owner: "HR",
            status: "Pending",
          },
          {
            separationId:
              createdSeparation.id,
            item: "Manager Clearance",
            owner: "Manager",
            status: "Pending",
          },
        ],
      });

      return createdSeparation;
    });

  /* =========================================================
     RESPONSE
  ========================================================= */

  return serializeSeparation(separation);
}

/* =========================================================
   CLEARANCE
========================================================= */

export async function getClearanceItems(
  separationId: string
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  return prisma.separationClearance.findMany({
    where: {
      separationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function updateClearanceItem(
  id: string,
  status: string,
  notes?: string
) {
  if (!["Pending", "Complete", "Flagged"].includes(status)) {
    throw new Error("Invalid clearance status");
  }

  const item = await prisma.separationClearance.findUnique({
    where: {
      id,
    },
  });

  if (!item) {
    throw new Error("Clearance item not found");
  }

  const updated = await prisma.separationClearance.update({
    where: {
      id,
    },
    data: {
      status,
      notes: notes?.trim() || null,
      completedAt:
        status === "Complete"
          ? new Date()
          : null,
    },
  });

  /*
   * Automatically update parent separation status.
   */
  const remaining =
    await prisma.separationClearance.count({
      where: {
        separationId: item.separationId,
        status: {
          not: "Complete",
        },
      },
    });

  await prisma.separation.update({
    where: {
      id: item.separationId,
    },
    data: {
      status:
        remaining === 0
          ? "Cleared"
          : "Clearance In Progress",
    },
  });

  return updated;
}

/* =========================================================
   EXIT INTERVIEW
========================================================= */

export async function getExitInterview(
  separationId: string
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  return prisma.exitInterview.findUnique({
    where: {
      separationId,
    },
  });
}

export async function recordExitInterview(
  separationId: string,
  responses: unknown,
  conductedBy: string
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  const interview =
    await prisma.exitInterview.upsert({
      where: {
        separationId,
      },
      create: {
        separationId,
        responses: responses as any,
        conductedBy,
      },
      update: {
        responses: responses as any,
        conductedBy,
        conductedAt: new Date(),
      },
    });

  await prisma.separation.update({
    where: {
      id: separationId,
    },
    data: {
      exitInterviewCompleted: true,
    },
  });

  return interview;
}

/* =========================================================
   SETTLEMENT
========================================================= */

export async function computeSettlement(
  separationId: string,
  breakdown: {
    pendingSalary: number;
    leaveEncashment: number;
    reimbursements: number;
    recoveries: number;
  },
  override: boolean,
  overrideReason?: string
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  const incomplete =
    await prisma.separationClearance.count({
      where: {
        separationId,
        status: {
          not: "Complete",
        },
      },
    });

  if (
    incomplete > 0 &&
    (!override || !overrideReason?.trim())
  ) {
    return {
      error:
        "Clearance is incomplete. HR override with a documented reason is required.",
    };
  }

  const pendingSalary = Number(
    breakdown.pendingSalary || 0
  );

  const leaveEncashment = Number(
    breakdown.leaveEncashment || 0
  );

  const reimbursements = Number(
    breakdown.reimbursements || 0
  );

  const recoveries = Number(
    breakdown.recoveries || 0
  );

  const netSettlement =
    pendingSalary +
    leaveEncashment +
    reimbursements -
    recoveries;

  const settlement =
    await prisma.separationSettlement.upsert({
      where: {
        separationId,
      },
      create: {
        separationId,
        pendingSalary,
        leaveEncashment,
        reimbursements,
        recoveries,
        netSettlement,
        override,
        overrideReason:
          overrideReason?.trim() || null,
      },
      update: {
        pendingSalary,
        leaveEncashment,
        reimbursements,
        recoveries,
        netSettlement,
        override,
        overrideReason:
          overrideReason?.trim() || null,
        approvedAt: new Date(),
      },
    });

  const updatedSeparation =
    await prisma.separation.update({
      where: {
        id: separationId,
      },
      data: {
        status: "Settlement Approved",
      },
      include: separationInclude,
    });

  return {
    separation: serializeSeparation(
      updatedSeparation
    ),
    settlement: {
      ...settlement,
      pendingSalary: Number(
        settlement.pendingSalary
      ),
      leaveEncashment: Number(
        settlement.leaveEncashment
      ),
      reimbursements: Number(
        settlement.reimbursements
      ),
      recoveries: Number(
        settlement.recoveries
      ),
      netSettlement: Number(
        settlement.netSettlement
      ),
    },
  };
}

/* =========================================================
   REVOKE ACCESS
========================================================= */

export async function revokeAccess(
  separationId: string
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
    include: {
      settlement: true,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  if (!separation.settlement) {
    throw new Error(
      "Settlement must be completed before access revocation"
    );
  }

  if (separation.accessRevoked) {
    return separation;
  }

  return prisma.separation.update({
    where: {
      id: separationId,
    },
    data: {
      accessRevoked: true,
    },
    include: separationInclude,
  });
}

/* =========================================================
   ALUMNI
========================================================= */

export async function convertToAlumni(
  separationId: string,
  tenure: string,
  role: string,
  eligibleForRehire: boolean
) {
  const separation = await prisma.separation.findUnique({
    where: {
      id: separationId,
    },
    include: {
      employee: true,
    },
  });

  if (!separation) {
    throw new Error("Separation not found");
  }

  if (!separation.accessRevoked) {
    throw new Error(
      "Access must be revoked before converting to alumni"
    );
  }

  if (!tenure?.trim() || !role?.trim()) {
    throw new Error(
      "Role and tenure are required"
    );
  }

  const existing = await prisma.alumni.findUnique({
    where: {
      separationId,
    },
  });

  if (existing) {
    return existing;
  }

  const alumni = await prisma.alumni.create({
    data: {
      separationId,
      employeeId: separation.employeeId,
      name: `${separation.employee.firstName} ${separation.employee.lastName}`,
      role: role.trim(),
      tenure: tenure.trim(),
      eligibleForRehire,
      exitedOn: separation.lastWorkingDay,
    },
  });

  await prisma.separation.update({
    where: {
      id: separationId,
    },
    data: {
      status: "Alumni",
    },
  });

  return alumni;
}

export async function getAlumni() {
  return prisma.alumni.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}