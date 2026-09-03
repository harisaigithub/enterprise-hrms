import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAuditLog } from "../../services/audit.service";
import {
  serializeReviewCycle,
  serializeGoal,
  serializeGoalList,
  serializeReview,
  serializeFeedback,
  serializeFeedbackList,
  serializeOneOnOne,
  serializeOneOnOneList,
  serializeRatingHistoryList,
} from "../../serializers/performance.serializer";

const GOAL_INCLUDE = {
  employee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  reviewCycle: {
    select: {
      name: true,
    },
  },
  keyResults: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.PerformanceGoalInclude;

const REVIEW_INCLUDE = {
  employee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  reviewer: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  items: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.PerformanceReviewInclude;

const FEEDBACK_INCLUDE = {
  fromEmployee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  toEmployee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.PerformanceFeedbackInclude;

const ONE_ON_ONE_INCLUDE = {
  employee: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: {
        select: {
          title: true,
        },
      },
    },
  },
  manager: {
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      designation: {
        select: {
          title: true,
        },
      },
    },
  },
  agendas: {
    orderBy: {
      orderIndex: "asc" as const,
    },
  },
  actionItems: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.PerformanceOneOnOneInclude;

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

async function resolveEmployee(codeOrId: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      codeOrId
    );

  const employee = await prisma.employee.findFirst({
    where: isUuid
      ? {
          id: codeOrId,
        }
      : {
          employeeCode: codeOrId,
        },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      reportingManagerId: true,
    },
  });

  if (!employee) {
    throw AppError.notFound(`Employee not found: ${codeOrId}`);
  }

  return employee;
}

/* -------------------------------------------------------------------------- */
/*                              Review Cycle                                  */
/* -------------------------------------------------------------------------- */

export async function getActiveCycle() {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!cycle) {
    throw AppError.notFound("No active performance review cycle found");
  }

  return {
    data: serializeReviewCycle(cycle),
  };
}

/* -------------------------------------------------------------------------- */
/*                              Employee Goals                                */
/* -------------------------------------------------------------------------- */

export async function getGoals(
  employeeCode: string,
  cycleCode?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const cycle = cycleCode
    ? await prisma.performanceReviewCycle.findUnique({
        where: {
          cycleCode,
        },
      })
    : await prisma.performanceReviewCycle.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  const where: Prisma.PerformanceGoalWhereInput = {
    employeeId: emp.id,
  };

  if (cycle) {
    where.reviewCycleId = cycle.id;
  }

  const goals = await prisma.performanceGoal.findMany({
    where,
    include: GOAL_INCLUDE,
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    data: serializeGoalList(goals),
  };
}

export interface CreateGoalInput {
  title: string;
  category: string;
  keyResults: Array<{
    text: string;
    progress?: number;
  }>;
  cycleCode?: string;
}

export async function createGoal(
  employeeCode: string,
  input: CreateGoalInput,
  actorUserId?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const cycle = input.cycleCode
    ? await prisma.performanceReviewCycle.findUnique({
        where: {
          cycleCode: input.cycleCode,
        },
      })
    : await prisma.performanceReviewCycle.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  if (!cycle) {
    throw AppError.badRequest(
      "No active review cycle found to attach goal to"
    );
  }

  if (cycle.phase !== "Goal Setting") {
    throw AppError.badRequest(
      `Goal setting is closed for cycle ${cycle.name} (current phase: ${cycle.phase})`
    );
  }

  const validKRs = input.keyResults.filter(
    (kr) => kr.text && kr.text.trim()
  );

  if (validKRs.length === 0) {
    throw AppError.badRequest(
      "A goal must contain at least one key result"
    );
  }

  const goal = await prisma.$transaction(async (tx: any) => {
    return tx.performanceGoal.create({
      data: {
        employeeId: emp.id,
        reviewCycleId: cycle.id,
        title: input.title.trim(),
        category: input.category || "Technical",
        status: "Pending Approval",

        keyResults: {
          create: validKRs.map((kr) => ({
            text: kr.text.trim(),
            progress: kr.progress ?? 0,
          })),
        },
      },
      include: GOAL_INCLUDE,
    });
  });

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceGoal",
    entityId: goal.id,
    newValue: {
      title: goal.title,
      category: goal.category,
      employeeCode: emp.employeeCode,
    },
  });

  return {
    data: serializeGoal(goal),
  };
}

export interface UpdateGoalInput {
  title?: string;
  category?: string;
  status?: string;

  keyResults?: Array<{
    id?: string;
    text: string;
    progress: number;
  }>;
}

export async function updateGoal(
  goalId: string,
  input: UpdateGoalInput,
  actorUserId?: string
) {
  const existing = await prisma.performanceGoal.findUnique({
    where: {
      id: goalId,
    },
    include: GOAL_INCLUDE,
  });

  if (!existing) {
    throw AppError.notFound("Goal not found");
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    if (input.keyResults) {
      for (const kr of input.keyResults) {
        if (kr.id) {
          await tx.performanceKeyResult.update({
            where: {
              id: kr.id,
            },
            data: {
              text: kr.text,
              progress: Math.min(
                100,
                Math.max(0, kr.progress)
              ),
            },
          });
        } else if (kr.text?.trim()) {
          await tx.performanceKeyResult.create({
            data: {
              goalId,
              text: kr.text.trim(),
              progress: Math.min(
                100,
                Math.max(0, kr.progress)
              ),
            },
          });
        }
      }
    }

    const data: Prisma.PerformanceGoalUpdateInput = {};

    if (input.title !== undefined) {
      data.title = input.title;
    }

    if (input.category !== undefined) {
      data.category = input.category;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    return tx.performanceGoal.update({
      where: {
        id: goalId,
      },
      data,
      include: GOAL_INCLUDE,
    });
  });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "PerformanceGoal",
    entityId: goalId,
    oldValue: {
      title: existing.title,
      status: existing.status,
    },
    newValue: {
      title: updated.title,
      status: updated.status,
    },
  });

  return {
    data: serializeGoal(updated),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Manager Goals                                  */
/* -------------------------------------------------------------------------- */

export async function getManagerGoals(
  managerEmployeeCode: string,
  cycleCode?: string
) {
  const manager = await resolveEmployee(managerEmployeeCode);

  const cycle = cycleCode
    ? await prisma.performanceReviewCycle.findUnique({
        where: {
          cycleCode,
        },
      })
    : await prisma.performanceReviewCycle.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  const where: Prisma.PerformanceGoalWhereInput = {
    employee: {
      reportingManagerId: manager.id,
    },
  };

  if (cycle) {
    where.reviewCycleId = cycle.id;
  }

  const goals = await prisma.performanceGoal.findMany({
    where,
    include: GOAL_INCLUDE,
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    data: serializeGoalList(goals),
  };
}

export async function approveGoal(
  goalId: string,
  managerEmployeeCode: string,
  actorUserId?: string
) {
  const manager = await resolveEmployee(
    managerEmployeeCode
  );

  const goal = await prisma.performanceGoal.findUnique({
    where: {
      id: goalId,
    },
    include: GOAL_INCLUDE,
  });

  if (!goal) {
    throw AppError.notFound("Goal not found");
  }

  const employee = await prisma.employee.findUnique({
    where: {
      id: goal.employeeId,
    },
    select: {
      id: true,
      employeeCode: true,
      reportingManagerId: true,
    },
  });

  if (!employee) {
    throw AppError.notFound("Employee not found");
  }

  /*
   * SECURITY:
   * A manager is only allowed to approve goals belonging
   * to employees who directly report to them.
   */
  if (employee.reportingManagerId !== manager.id) {
    throw AppError.forbidden(
      "You can only approve goals belonging to your direct reports"
    );
  }

  if (goal.status !== "Pending Approval") {
    throw AppError.badRequest(
      `Only goals pending approval can be approved (current status: ${goal.status})`
    );
  }

  const updated =
    await prisma.performanceGoal.update({
      where: {
        id: goalId,
      },
      data: {
        status: "Locked",
      },
      include: GOAL_INCLUDE,
    });

  await writeAuditLog({
    actorUserId,
    action: "APPROVE",
    entityType: "PerformanceGoal",
    entityId: goalId,
    oldValue: {
      status: goal.status,
    },
    newValue: {
      status: updated.status,
      approvedBy: manager.employeeCode,
    },
  });

  return {
    data: serializeGoal(updated),
  };
}

export async function rejectGoal(
  goalId: string,
  managerEmployeeCode: string,
  actorUserId?: string
) {
  const manager = await resolveEmployee(
    managerEmployeeCode
  );

  const goal = await prisma.performanceGoal.findUnique({
    where: {
      id: goalId,
    },
    include: GOAL_INCLUDE,
  });

  if (!goal) {
    throw AppError.notFound("Goal not found");
  }

  const employee = await prisma.employee.findUnique({
    where: {
      id: goal.employeeId,
    },
    select: {
      id: true,
      employeeCode: true,
      reportingManagerId: true,
    },
  });

  if (!employee) {
    throw AppError.notFound("Employee not found");
  }

  /*
   * SECURITY:
   * Managers cannot reject goals belonging to employees
   * outside their reporting hierarchy.
   */
  if (employee.reportingManagerId !== manager.id) {
    throw AppError.forbidden(
      "You can only reject goals belonging to your direct reports"
    );
  }

  if (goal.status !== "Pending Approval") {
    throw AppError.badRequest(
      `Only goals pending approval can be rejected (current status: ${goal.status})`
    );
  }

  const updated =
    await prisma.performanceGoal.update({
      where: {
        id: goalId,
      },
      data: {
        status: "Revision Requested",
      },
      include: GOAL_INCLUDE,
    });

  await writeAuditLog({
    actorUserId,
    action: "REJECT",
    entityType: "PerformanceGoal",
    entityId: goalId,
    oldValue: {
      status: goal.status,
    },
    newValue: {
      status: updated.status,
      rejectedBy: manager.employeeCode,
    },
  });

  return {
    data: serializeGoal(updated),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Self Assessment                                */
/* -------------------------------------------------------------------------- */

export async function getSelfAssessment(
  employeeCode: string,
  cycleCode?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const cycle = cycleCode
    ? await prisma.performanceReviewCycle.findUnique({
        where: {
          cycleCode,
        },
      })
    : await prisma.performanceReviewCycle.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  if (!cycle) {
    return {
      data: serializeReview(null),
    };
  }

  const review =
    await prisma.performanceReview.findUnique({
      where: {
        employeeId_reviewerId_reviewCycleId_reviewType: {
          employeeId: emp.id,
          reviewerId: emp.id,
          reviewCycleId: cycle.id,
          reviewType: "Self",
        },
      },
      include: REVIEW_INCLUDE,
    });

  return {
    data: serializeReview(review),
  };
}

export interface SelfAssessmentResponseItem {
  goalId: string;
  rating: number;
  comments?: string;
}

export async function submitSelfAssessment(
  employeeCode: string,
  responses: SelfAssessmentResponseItem[],
  actorUserId?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const cycle =
    await prisma.performanceReviewCycle.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!cycle) {
    throw AppError.badRequest(
      "No active review cycle found"
    );
  }

  if (!responses || responses.length === 0) {
    throw AppError.badRequest(
      "Responses cannot be empty"
    );
  }

  const review = await prisma.$transaction(
    async (tx: any) => {
      const rev =
        await tx.performanceReview.upsert({
          where: {
            employeeId_reviewerId_reviewCycleId_reviewType:
              {
                employeeId: emp.id,
                reviewerId: emp.id,
                reviewCycleId: cycle.id,
                reviewType: "Self",
              },
          },
          create: {
            employeeId: emp.id,
            reviewerId: emp.id,
            reviewCycleId: cycle.id,
            reviewType: "Self",
            status: "Submitted",
            submittedAt: new Date(),
          },
          update: {
            status: "Submitted",
            submittedAt: new Date(),
          },
        });

      for (const r of responses) {
        await tx.performanceReviewItem.upsert({
          where: {
            reviewId_goalId: {
              reviewId: rev.id,
              goalId: r.goalId,
            },
          },
          create: {
            reviewId: rev.id,
            goalId: r.goalId,
            rating: Math.min(
              5,
              Math.max(1, r.rating || 3)
            ),
            comments: r.comments || "",
          },
          update: {
            rating: Math.min(
              5,
              Math.max(1, r.rating || 3)
            ),
            comments: r.comments || "",
          },
        });
      }

      return tx.performanceReview.findUniqueOrThrow({
        where: {
          id: rev.id,
        },
        include: REVIEW_INCLUDE,
      });
    }
  );

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceReview",
    entityId: review.id,
    newValue: {
      type: "Self",
      employeeCode: emp.employeeCode,
      cycle: cycle.name,
    },
  });

  return {
    data: serializeReview(review),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Manager Review                                 */
/* -------------------------------------------------------------------------- */

export async function assertCanReadEmployeePerformance(
  requesterEmployeeCode: string | undefined,
  targetEmployeeCode: string,
  requesterRole: string | undefined
) {
  const role = requesterRole?.toUpperCase();

  if (role === "ADMIN" || role === "HR") {
    return;
  }

  if (!requesterEmployeeCode) {
    throw AppError.forbidden(
      "Authenticated user is not linked to an employee"
    );
  }

  const requester = await resolveEmployee(requesterEmployeeCode);
  const target = await resolveEmployee(targetEmployeeCode);

  const isSelf = requester.id === target.id;
  const isDirectManager = target.reportingManagerId === requester.id;

  if (!isSelf && !isDirectManager) {
    throw AppError.forbidden(
      "You can only view your own performance or that of your direct reports"
    );
  }
}

const REVIEW_PHASES = [
  "Goal Setting",
  "Continuous Feedback",
  "Self-Assessment",
  "Manager Review",
  "Calibration",
  "Completed",
] as const;

export async function advanceActiveCyclePhase(
  requestedPhase: string,
  actorUserId?: string
) {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!cycle) {
    throw AppError.notFound("No active performance review cycle found");
  }

  if (!REVIEW_PHASES.includes(requestedPhase as (typeof REVIEW_PHASES)[number])) {
    throw AppError.badRequest(
      `Invalid review phase: ${requestedPhase}. Must be one of: ${REVIEW_PHASES.join(", ")}`
    );
  }

  const updated = await prisma.performanceReviewCycle.update({
    where: { id: cycle.id },
    data: { phase: requestedPhase },
  });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "PerformanceReviewCycle",
    entityId: cycle.id,
    oldValue: { phase: cycle.phase },
    newValue: { phase: updated.phase },
  });

  return { data: serializeReviewCycle(updated) };
}

export async function getManagerReview(
  employeeCode: string,
  cycleCode?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const cycle = cycleCode
    ? await prisma.performanceReviewCycle.findUnique({
        where: {
          cycleCode,
        },
      })
    : await prisma.performanceReviewCycle.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

  if (!cycle) {
    return {
      data: serializeReview(null),
    };
  }

  const review =
    await prisma.performanceReview.findFirst({
      where: {
        employeeId: emp.id,
        reviewCycleId: cycle.id,
        reviewType: "Manager",
      },
      include: REVIEW_INCLUDE,
    });

  return {
    data: serializeReview(review),
  };
}

export async function submitManagerReview(
  employeeCode: string,
  reviewerEmployeeCode: string,
  responses: SelfAssessmentResponseItem[],
  actorUserId?: string
) {
  const emp = await resolveEmployee(employeeCode);

  const reviewer = await resolveEmployee(
    reviewerEmployeeCode
  );

  /*
   * SECURITY:
   * The reviewer must actually be the reporting manager
   * of this employee.
   */
  if (emp.reportingManagerId !== reviewer.id) {
    throw AppError.forbidden(
      "You can only submit manager reviews for your direct reports"
    );
  }

  const cycle =
    await prisma.performanceReviewCycle.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!cycle) {
    throw AppError.badRequest(
      "No active review cycle found"
    );
  }

  if (cycle.phase !== "Manager Review") {
    throw AppError.badRequest(
      `Manager reviews can only be submitted during the Manager Review phase (current phase: ${cycle.phase})`
    );
  }

  /*
   * Manager Review cannot happen before
   * the employee submits the self-assessment.
   */
  const selfRev =
    await prisma.performanceReview.findUnique({
      where: {
        employeeId_reviewerId_reviewCycleId_reviewType: {
          employeeId: emp.id,
          reviewerId: emp.id,
          reviewCycleId: cycle.id,
          reviewType: "Self",
        },
      },
    });

  if (!selfRev || selfRev.status !== "Submitted") {
    throw AppError.badRequest(
      "Manager review cannot be submitted before self-assessment is submitted"
    );
  }

  if (!responses || responses.length === 0) {
    throw AppError.badRequest(
      "Manager review responses cannot be empty"
    );
  }

  const goalIds = [...new Set(responses.map((response) => response.goalId))];
  const validGoalCount = await prisma.performanceGoal.count({
    where: {
      id: { in: goalIds },
      employeeId: emp.id,
      reviewCycleId: cycle.id,
      status: "Locked",
    },
  });

  if (validGoalCount !== goalIds.length) {
    throw AppError.badRequest(
      "Manager review contains a goal that is not a locked goal for this employee and cycle"
    );
  }

  const review = await prisma.$transaction(
    async (tx: any) => {
      const rev =
        await tx.performanceReview.upsert({
          where: {
            employeeId_reviewerId_reviewCycleId_reviewType:
              {
                employeeId: emp.id,
                reviewerId: reviewer.id,
                reviewCycleId: cycle.id,
                reviewType: "Manager",
              },
          },
          create: {
            employeeId: emp.id,
            reviewerId: reviewer.id,
            reviewCycleId: cycle.id,
            reviewType: "Manager",
            status: "Submitted",
            submittedAt: new Date(),
          },
          update: {
            status: "Submitted",
            submittedAt: new Date(),
          },
        });

      for (const r of responses) {
        await tx.performanceReviewItem.upsert({
          where: {
            reviewId_goalId: {
              reviewId: rev.id,
              goalId: r.goalId,
            },
          },
          create: {
            reviewId: rev.id,
            goalId: r.goalId,
            rating: Math.min(
              5,
              Math.max(1, r.rating || 3)
            ),
            comments: r.comments || "",
          },
          update: {
            rating: Math.min(
              5,
              Math.max(1, r.rating || 3)
            ),
            comments: r.comments || "",
          },
        });
      }

      return tx.performanceReview.findUniqueOrThrow({
        where: {
          id: rev.id,
        },
        include: REVIEW_INCLUDE,
      });
    }
  );

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceReview",
    entityId: review.id,
    newValue: {
      type: "Manager",
      employeeCode: emp.employeeCode,
      reviewerCode: reviewer.employeeCode,
    },
  });

  return {
    data: serializeReview(review),
  };
}

/* -------------------------------------------------------------------------- */
/*                         Continuous Feedback                                */
/* -------------------------------------------------------------------------- */

export async function getFeedback(
  employeeCode: string,
  filter = "all"
) {
  const emp = await resolveEmployee(employeeCode);

  let where: Prisma.PerformanceFeedbackWhereInput =
    {};

  if (filter === "received") {
    where = {
      toEmployeeId: emp.id,
    };
  } else if (filter === "given") {
    where = {
      fromEmployeeId: emp.id,
    };
  } else {
    where = {
      OR: [
        {
          toEmployeeId: emp.id,
        },
        {
          fromEmployeeId: emp.id,
        },
      ],
    };
  }

  const list =
    await prisma.performanceFeedback.findMany({
      where,
      include: FEEDBACK_INCLUDE,
      orderBy: {
        createdAt: "desc",
      },
    });

  return {
    data: serializeFeedbackList(list),
  };
}

export interface CreateFeedbackInput {
  toEmployeeCode: string;
  type: string;
  goalTag?: string | null;
  message: string;
  private?: boolean;
}

export async function createFeedback(
  fromEmployeeCode: string,
  input: CreateFeedbackInput,
  actorUserId?: string
) {
  const fromEmp = await resolveEmployee(
    fromEmployeeCode
  );

  const toEmp = await resolveEmployee(
    input.toEmployeeCode
  );

  if (fromEmp.id === toEmp.id) {
    throw AppError.badRequest(
      "Cannot give feedback to yourself"
    );
  }

  const fb =
    await prisma.performanceFeedback.create({
      data: {
        fromEmployeeId: fromEmp.id,
        toEmployeeId: toEmp.id,
        type: input.type || "General",
        goalTag: input.goalTag || null,
        message: input.message.trim(),
        isPrivate: Boolean(input.private),
      },
      include: FEEDBACK_INCLUDE,
    });

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceFeedback",
    entityId: fb.id,
    newValue: {
      from: fromEmp.employeeCode,
      to: toEmp.employeeCode,
      type: fb.type,
    },
  });

  return {
    data: serializeFeedback(fb),
  };
}

/* -------------------------------------------------------------------------- */
/*                                 1-on-1s                                    */
/* -------------------------------------------------------------------------- */

export async function getOneOnOnes(
  employeeCode: string
) {
  const emp = await resolveEmployee(employeeCode);

  const list =
    await prisma.performanceOneOnOne.findMany({
      where: {
        OR: [
          {
            employeeId: emp.id,
          },
          {
            managerId: emp.id,
          },
        ],
      },
      include: ONE_ON_ONE_INCLUDE,
      orderBy: {
        date: "desc",
      },
    });

  return {
    data: serializeOneOnOneList(
      list,
      emp.employeeCode
    ),
  };
}

export interface CreateOneOnOneInput {
  withEmployeeCode: string;
  date: string;
  agenda: string[];

  actionItems?: Array<{
    text: string;
    done?: boolean;
  }>;

  notes?: string;
}

export async function createOneOnOne(
  currentEmployeeCode: string,
  input: CreateOneOnOneInput,
  actorUserId?: string
) {
  const current = await resolveEmployee(
    currentEmployeeCode
  );

  const partner = await resolveEmployee(
    input.withEmployeeCode
  );

  if (current.id === partner.id) {
    throw AppError.badRequest(
      "Cannot schedule a 1:1 with yourself"
    );
  }

  const isPartnerManager =
    current.reportingManagerId === partner.id;

  const isPartnerDirectReport =
    partner.reportingManagerId === current.id;

  if (!isPartnerManager && !isPartnerDirectReport) {
    throw AppError.forbidden(
      "1:1 notes can only be created between an employee and their direct manager"
    );
  }

  const employeeId = isPartnerManager
    ? current.id
    : partner.id;

  const managerId = isPartnerManager
    ? partner.id
    : current.id;

  const validAgenda = (input.agenda || []).filter(
    (a) => a && a.trim()
  );

  const validActions = (
    input.actionItems || []
  ).filter((a) => a.text && a.text.trim());

  const item = await prisma.$transaction(
    async (tx: any) => {
      return tx.performanceOneOnOne.create({
        data: {
          employeeId,
          managerId,
          date: new Date(
            `${input.date}T00:00:00Z`
          ),
          notes: input.notes || "",

          agendas: {
            create: validAgenda.map(
              (itemText, i) => ({
                itemText: itemText.trim(),
                orderIndex: i,
              })
            ),
          },

          actionItems: {
            create: validActions.map((a) => ({
              text: a.text.trim(),
              done: Boolean(a.done),
            })),
          },
        },
        include: ONE_ON_ONE_INCLUDE,
      });
    }
  );

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceOneOnOne",
    entityId: item.id,
    newValue: {
      employeeId: item.employeeId,
      managerId: item.managerId,
      date: input.date,
    },
  });

  return {
    data: serializeOneOnOne(
      item,
      current.employeeCode
    ),
  };
}

export async function toggleOneOnOneAction(
  oneOnOneId: string,
  actionId: string,
  currentEmployeeCode: string,
  actorUserId?: string
) {
  const current = await resolveEmployee(
    currentEmployeeCode
  );

  const oneOnOne =
    await prisma.performanceOneOnOne.findUnique({
      where: { id: oneOnOneId },
      select: { employeeId: true, managerId: true },
    });

  if (!oneOnOne) {
    throw AppError.notFound("1:1 note not found");
  }

  if (
    oneOnOne.employeeId !== current.id &&
    oneOnOne.managerId !== current.id
  ) {
    throw AppError.forbidden(
      "Only 1:1 participants can update action items"
    );
  }

  const action =
    await prisma.performanceOneOnOneAction.findFirst({
      where: {
        id: actionId,
        oneOnOneId,
      },
    });

  if (!action) {
    throw AppError.notFound(
      "Action item not found"
    );
  }

  const updated =
    await prisma.performanceOneOnOneAction.update({
      where: {
        id: actionId,
      },
      data: {
        done: !action.done,
      },
    });

  await writeAuditLog({
    actorUserId,
    action: "UPDATE",
    entityType: "PerformanceOneOnOneAction",
    entityId: actionId,
    newValue: {
      done: updated.done,
    },
  });

  return {
    data: {
      id: updated.id,
      text: updated.text,
      done: updated.done,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                            Ratings History                                 */
/* -------------------------------------------------------------------------- */

export async function getRatingsHistory(
  employeeCode: string
) {
  const emp = await resolveEmployee(employeeCode);

  const list =
    await prisma.performanceRatingHistory.findMany({
      where: {
        employeeId: emp.id,
      },
      orderBy: {
        releasedOn: "desc",
      },
    });

  return {
    data: serializeRatingHistoryList(list),
  };
}

export async function getManagerRatingsHistory(
  managerEmployeeCode: string
) {
  const manager = await resolveEmployee(managerEmployeeCode);

  const directReports = await prisma.employee.findMany({
    where: { reportingManagerId: manager.id },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
      ratingsHistory: {
        orderBy: { releasedOn: "desc" },
      },
    },
    orderBy: { employeeCode: "asc" },
  });

  return {
    data: {
      employees: directReports.map((employee) => ({
        employeeId: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        status: employee.status,
        ratings: serializeRatingHistoryList(employee.ratingsHistory),
      })),
    },
  };
}

export async function getAdminRatingsHistory() {
  const employees = await prisma.employee.findMany({
    select: {
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
      ratingsHistory: {
        orderBy: { releasedOn: "desc" },
      },
    },
    orderBy: { employeeCode: "asc" },
  });

  const records = employees.flatMap((employee) =>
    employee.ratingsHistory.map((rating) => ({
      employeeId: employee.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeStatus: employee.status,
      ...serializeRatingHistoryList([rating])[0],
    }))
  );

  const averageFinalRating = records.length
    ? Number(
        (
          records.reduce((sum, record) => sum + record.finalRating, 0) /
          records.length
        ).toFixed(2)
      )
    : null;

  return {
    data: {
      summary: {
        employees: employees.length,
        employeesWithRatings: employees.filter(
          (employee) => employee.ratingsHistory.length > 0
        ).length,
        totalRecords: records.length,
        averageFinalRating,
      },
      records,
    },
  };
}

export async function getCalibrationCandidates() {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!cycle) {
    throw AppError.notFound("No active performance review cycle found");
  }

  const managerReviews = await prisma.performanceReview.findMany({
    where: {
      reviewCycleId: cycle.id,
      reviewType: "Manager",
      status: "Submitted",
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
      items: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  const employeeIds = managerReviews.map((review) => review.employeeId);
  const [selfReviews, released] = await Promise.all([
    prisma.performanceReview.findMany({
      where: {
        reviewCycleId: cycle.id,
        reviewType: "Self",
        status: "Submitted",
        employeeId: { in: employeeIds },
      },
      include: { items: true },
    }),
    prisma.performanceRatingHistory.findMany({
      where: {
        reviewCycleId: cycle.id,
        cycleName: cycle.name,
        employeeId: { in: employeeIds },
      },
      select: { employeeId: true },
    }),
  ]);

  const releasedEmployeeIds = new Set(released.map((item) => item.employeeId));
  const average = (items: Array<{ rating: number }>) =>
    items.length
      ? Number((items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(2))
      : null;

  return {
    data: {
      cycle: { id: cycle.id, name: cycle.name, phase: cycle.phase },
      candidates: managerReviews
        .filter((review) => !releasedEmployeeIds.has(review.employeeId))
        .map((review) => {
          const selfReview = selfReviews.find(
            (item) => item.employeeId === review.employeeId
          );
          return {
            employeeId: review.employee.employeeCode,
            employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
            selfRating: average(selfReview?.items || []),
            managerRating: average(review.items),
            managerReviewSubmittedAt: review.submittedAt,
          };
        }),
    },
  };
}

export interface ReleaseRatingInput {
  employeeId: string;
  finalRating: number;
  increment: string;
  promotion: boolean;
  appraisalLetterUrl?: string | null;
}

export async function releaseCalibratedRating(
  input: ReleaseRatingInput,
  actorUserId?: string
) {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!cycle) throw AppError.notFound("No active performance review cycle found");
  if (cycle.phase !== "Calibration") {
    throw AppError.conflict("Ratings can only be released during the Calibration phase");
  }

  const employee = await resolveEmployee(input.employeeId);
  const [managerReview, selfReview, existing] = await Promise.all([
    prisma.performanceReview.findFirst({
      where: {
        employeeId: employee.id,
        reviewCycleId: cycle.id,
        reviewType: "Manager",
        status: "Submitted",
      },
      include: { items: true },
    }),
    prisma.performanceReview.findFirst({
      where: {
        employeeId: employee.id,
        reviewCycleId: cycle.id,
        reviewType: "Self",
        status: "Submitted",
      },
      include: { items: true },
    }),
    prisma.performanceRatingHistory.findFirst({
      where: {
        employeeId: employee.id,
        reviewCycleId: cycle.id,
        cycleName: cycle.name,
      },
    }),
  ]);

  if (!managerReview) {
    throw AppError.badRequest("A submitted manager review is required before release");
  }
  if (managerReview.items.length === 0) {
    throw AppError.badRequest("Manager review does not contain any rated goals");
  }
  if (existing) throw AppError.conflict("This employee's rating has already been released");

  const roundedAverage = (items: Array<{ rating: number }>) =>
    Math.max(1, Math.min(5, Math.round(items.reduce((sum, item) => sum + item.rating, 0) / items.length)));
  const managerRating = roundedAverage(managerReview.items);
  const selfRating = selfReview?.items.length
    ? roundedAverage(selfReview.items)
    : managerRating;

  const rating = await prisma.performanceRatingHistory.create({
    data: {
      employeeId: employee.id,
      reviewCycleId: cycle.id,
      cycleName: cycle.name,
      selfRating,
      originalManagerRating: managerRating,
      finalRating: input.finalRating,
      calibrationAdjusted: input.finalRating !== managerRating,
      increment: input.increment.trim(),
      promotion: input.promotion,
      appraisalLetterUrl: input.appraisalLetterUrl?.trim() || null,
      releasedOn: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId,
    action: "CREATE",
    entityType: "PerformanceRatingHistory",
    entityId: rating.id,
    newValue: {
      employeeCode: employee.employeeCode,
      cycle: cycle.name,
      originalManagerRating: managerRating,
      finalRating: input.finalRating,
      increment: input.increment,
      promotion: input.promotion,
    },
  });

  return { data: serializeRatingHistoryList([rating])[0] };
}

/* -------------------------------------------------------------------------- */
/*                              Admin Performance                             */
/* -------------------------------------------------------------------------- */

export async function getAdminOverview() {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!cycle) {
    throw AppError.notFound("No active performance review cycle found");
  }

  const [
    totalEmployees,
    totalGoals,
    pendingGoals,
    lockedGoals,
    revisionRequestedGoals,
    draftGoals,
    selfAssessmentsSubmitted,
    managerReviewsSubmitted,
  ] = await Promise.all([
    prisma.employee.count(),

    prisma.performanceGoal.count({
      where: {
        reviewCycleId: cycle.id,
      },
    }),

    prisma.performanceGoal.count({
      where: {
        reviewCycleId: cycle.id,
        status: "Pending Approval",
      },
    }),

    prisma.performanceGoal.count({
      where: {
        reviewCycleId: cycle.id,
        status: "Locked",
      },
    }),

    prisma.performanceGoal.count({
      where: {
        reviewCycleId: cycle.id,
        status: "Revision Requested",
      },
    }),

    prisma.performanceGoal.count({
      where: {
        reviewCycleId: cycle.id,
        status: "Draft",
      },
    }),

    prisma.performanceReview.count({
      where: {
        reviewCycleId: cycle.id,
        reviewType: "Self",
        status: "Submitted",
      },
    }),

    prisma.performanceReview.count({
      where: {
        reviewCycleId: cycle.id,
        reviewType: "Manager",
        status: "Submitted",
      },
    }),
  ]);

  const selfAssessmentCompletion =
    totalEmployees > 0
      ? Math.round(
          (selfAssessmentsSubmitted / totalEmployees) * 100
        )
      : 0;

  const managerReviewCompletion =
    totalEmployees > 0
      ? Math.round(
          (managerReviewsSubmitted / totalEmployees) * 100
        )
      : 0;

  return {
    data: {
      cycle: {
        id: cycle.id,
        name: cycle.name,
        cycleCode: cycle.cycleCode,
        phase: cycle.phase,
        isActive: cycle.isActive,
        goalSettingStart: cycle.goalSettingStart,
        goalSettingEnd: cycle.goalSettingEnd,
        selfAssessmentStart: cycle.selfAssessmentStart,
        selfAssessmentEnd: cycle.selfAssessmentEnd,
        managerReviewStart: cycle.managerReviewStart,
        managerReviewEnd: cycle.managerReviewEnd,
      },

      employees: {
        total: totalEmployees,
      },

      goals: {
        total: totalGoals,
        pendingApproval: pendingGoals,
        locked: lockedGoals,
        revisionRequested: revisionRequestedGoals,
        draft: draftGoals,
      },

      reviews: {
        selfAssessment: {
          submitted: selfAssessmentsSubmitted,
          pending: Math.max(
            totalEmployees - selfAssessmentsSubmitted,
            0
          ),
          completionPercentage: selfAssessmentCompletion,
        },

        managerReview: {
          submitted: managerReviewsSubmitted,
          pending: Math.max(
            totalEmployees - managerReviewsSubmitted,
            0
          ),
          completionPercentage: managerReviewCompletion,
        },
      },
    },
  };
}

export async function getAdminEmployeesPerformance() {
  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!cycle) {
    throw AppError.notFound(
      "No active performance review cycle found"
    );
  }

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: {
      employeeCode: "asc",
    },
  });

  const [goals, reviews] = await Promise.all([
    prisma.performanceGoal.findMany({
      where: {
        reviewCycleId: cycle.id,
      },
      select: {
        employeeId: true,
        status: true,
      },
    }),

    prisma.performanceReview.findMany({
      where: {
        reviewCycleId: cycle.id,
      },
      select: {
        employeeId: true,
        reviewType: true,
        status: true,
        submittedAt: true,
      },
    }),
  ]);

  const data = employees.map((employee) => {
    const employeeGoals = goals.filter(
      (goal) => goal.employeeId === employee.id
    );

    const selfAssessment = reviews.find(
      (review) =>
        review.employeeId === employee.id &&
        review.reviewType === "Self"
    );

    const managerReview = reviews.find(
      (review) =>
        review.employeeId === employee.id &&
        review.reviewType === "Manager"
    );

    return {
      employeeId: employee.employeeCode,

      name: `${employee.firstName} ${employee.lastName}`,

      employeeStatus: employee.status,

      goals: {
        total: employeeGoals.length,

        pendingApproval: employeeGoals.filter(
          (goal) => goal.status === "Pending Approval"
        ).length,

        locked: employeeGoals.filter(
          (goal) => goal.status === "Locked"
        ).length,

        revisionRequested: employeeGoals.filter(
          (goal) => goal.status === "Revision Requested"
        ).length,
      },

      selfAssessment: {
        submitted:
          selfAssessment?.status === "Submitted",

        submittedAt:
          selfAssessment?.submittedAt || null,
      },

      managerReview: {
        submitted:
          managerReview?.status === "Submitted",

        submittedAt:
          managerReview?.submittedAt || null,
      },
    };
  });

  return {
    data: {
      cycle: {
        name: cycle.name,
        cycleCode: cycle.cycleCode,
        phase: cycle.phase,
      },

      employees: data,
    },
  };
}

export async function getAdminEmployeePerformanceDetail(
  employeeCode: string
) {
  const employee = await resolveEmployee(employeeCode);

  const cycle = await prisma.performanceReviewCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!cycle) {
    throw AppError.notFound("No active performance review cycle found");
  }

  const [goals, selfAssessment, managerReview, ratingsHistory] =
    await Promise.all([
      prisma.performanceGoal.findMany({
        where: {
          employeeId: employee.id,
          reviewCycleId: cycle.id,
        },
        include: GOAL_INCLUDE,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.performanceReview.findFirst({
        where: {
          employeeId: employee.id,
          reviewCycleId: cycle.id,
          reviewType: "Self",
        },
        include: REVIEW_INCLUDE,
      }),

      prisma.performanceReview.findFirst({
        where: {
          employeeId: employee.id,
          reviewCycleId: cycle.id,
          reviewType: "Manager",
        },
        include: REVIEW_INCLUDE,
      }),

      prisma.performanceRatingHistory.findMany({
        where: {
          employeeId: employee.id,
        },
        orderBy: {
          releasedOn: "desc",
        },
      }),
    ]);

  return {
    data: {
      employee: {
        employeeId: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
      },

      cycle: {
        name: cycle.name,
        cycleCode: cycle.cycleCode,
        phase: cycle.phase,
      },

      goals: serializeGoalList(goals),

      selfAssessment: serializeReview(selfAssessment),

      managerReview: serializeReview(managerReview),

      ratingsHistory:
        serializeRatingHistoryList(ratingsHistory),
    },
  };
}

export async function getAdminFeedback() {
  const feedback = await prisma.performanceFeedback.findMany({
    include: FEEDBACK_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return { data: serializeFeedbackList(feedback) };
}
