import type {
  PerformanceReviewCycle,
  PerformanceGoal,
  PerformanceKeyResult,
  PerformanceReview,
  PerformanceReviewItem,
  PerformanceFeedback,
  PerformanceOneOnOne,
  PerformanceOneOnOneAgenda,
  PerformanceOneOnOneAction,
  PerformanceRatingHistory,
} from "@prisma/client";
import { formatDate } from "./helpers";

type GoalWithRelations = PerformanceGoal & {
  employee?: { employeeCode: string; firstName: string; lastName: string } | null;
  reviewCycle?: { name: string } | null;
  keyResults: PerformanceKeyResult[];
};

type ReviewWithRelations = PerformanceReview & {
  employee?: { employeeCode: string; firstName: string; lastName: string } | null;
  reviewer?: { employeeCode: string; firstName: string; lastName: string } | null;
  items: PerformanceReviewItem[];
};

type FeedbackWithRelations = PerformanceFeedback & {
  fromEmployee: { employeeCode: string; firstName: string; lastName: string };
  toEmployee: { employeeCode: string; firstName: string; lastName: string };
};

type OneOnOneWithRelations = PerformanceOneOnOne & {
  employee: { employeeCode: string; firstName: string; lastName: string; designation?: { title: string } | null };
  manager: { employeeCode: string; firstName: string; lastName: string; designation?: { title: string } | null };
  agendas: PerformanceOneOnOneAgenda[];
  actionItems: PerformanceOneOnOneAction[];
};

export function serializeReviewCycle(
  cycle: PerformanceReviewCycle,
  peerStats?: { nominated: number; received: number }
) {
  return {
    id: cycle.id,
    name: cycle.name,
    cycleCode: cycle.cycleCode,
    phase: cycle.phase,
    goalSettingWindow: {
      start: formatDate(cycle.goalSettingStart),
      end: formatDate(cycle.goalSettingEnd),
    },
    selfAssessmentWindow: {
      start: formatDate(cycle.selfAssessmentStart),
      end: formatDate(cycle.selfAssessmentEnd),
    },
    managerReviewWindow: {
      start: formatDate(cycle.managerReviewStart),
      end: formatDate(cycle.managerReviewEnd),
    },
    is360Enabled: cycle.is360Enabled,
    peerReviewersNominated: peerStats?.nominated ?? 3,
    peerResponsesReceived: peerStats?.received ?? 2,
    createdAt: formatDate(cycle.createdAt),
  };
}

export function serializeGoal(goal: GoalWithRelations) {
  return {
    id: goal.id,
    employeeId: goal.employee?.employeeCode ?? goal.employeeId,
    cycle: goal.reviewCycle?.name?.replace(" Performance Review", "") ?? "Current Cycle",
    title: goal.title,
    category: goal.category,
    status: goal.status,
    createdAt: formatDate(goal.createdAt),
    keyResults: (goal.keyResults ?? []).map((kr) => ({
      id: kr.id,
      text: kr.text,
      progress: kr.progress,
    })),
  };
}

export function serializeGoalList(goals: GoalWithRelations[]) {
  return goals.map(serializeGoal);
}

export function serializeReview(review: ReviewWithRelations | null) {
  if (!review) {
    return {
      submitted: false,
      submittedAt: null,
      responses: [],
    };
  }
  return {
    id: review.id,
    employeeId: review.employee?.employeeCode ?? review.employeeId,
    reviewerId: review.reviewer?.employeeCode ?? review.reviewerId,
    reviewType: review.reviewType,
    submitted: review.status === "Submitted",
    submittedAt: formatDate(review.submittedAt),
    responses: (review.items ?? []).map((item) => ({
      goalId: item.goalId,
      rating: item.rating,
      comments: item.comments ?? "",
    })),
  };
}

export function serializeFeedback(fb: FeedbackWithRelations) {
  return {
    id: fb.id,
    fromId: fb.fromEmployee.employeeCode,
    fromName: `${fb.fromEmployee.firstName} ${fb.fromEmployee.lastName}`.trim(),
    toId: fb.toEmployee.employeeCode,
    toName: `${fb.toEmployee.firstName} ${fb.toEmployee.lastName}`.trim(),
    type: fb.type,
    goalTag: fb.goalTag ?? null,
    message: fb.message,
    private: fb.isPrivate,
    createdAt: formatDate(fb.createdAt),
  };
}

export function serializeFeedbackList(feedbacks: FeedbackWithRelations[]) {
  return feedbacks.map(serializeFeedback);
}

export function serializeOneOnOne(item: OneOnOneWithRelations, currentEmployeeCode?: string) {
  // If current employee is the subject employee, the "with" partner is the manager, and vice versa
  const isEmployeeSelf = currentEmployeeCode && item.employee.employeeCode === currentEmployeeCode;
  const partner = isEmployeeSelf ? item.manager : item.employee;

  return {
    id: item.id,
    employeeId: item.employee.employeeCode,
    managerId: item.manager.employeeCode,
    withName: `${partner.firstName} ${partner.lastName}`.trim(),
    withRole: partner.designation?.title ?? "Colleague",
    date: formatDate(item.date),
    agenda: (item.agendas ?? []).sort((a, b) => a.orderIndex - b.orderIndex).map((a) => a.itemText),
    actionItems: (item.actionItems ?? []).map((a) => ({
      id: a.id,
      text: a.text,
      done: a.done,
    })),
    notes: item.notes ?? "",
  };
}

export function serializeOneOnOneList(items: OneOnOneWithRelations[], currentEmployeeCode?: string) {
  return items.map((item) => serializeOneOnOne(item, currentEmployeeCode));
}

export function serializeRatingHistory(r: PerformanceRatingHistory) {
  return {
    id: r.id,
    cycle: r.cycleName,
    selfRating: r.selfRating,
    originalManagerRating: r.originalManagerRating,
    finalRating: r.finalRating,
    calibrationAdjusted: r.calibrationAdjusted,
    increment: r.increment,
    promotion: r.promotion,
    appraisalLetterUrl: r.appraisalLetterUrl ?? "#",
    releasedOn: formatDate(r.releasedOn),
  };
}

export function serializeRatingHistoryList(ratings: PerformanceRatingHistory[]) {
  return ratings.map(serializeRatingHistory);
}
