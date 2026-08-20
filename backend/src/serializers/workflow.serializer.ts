import type { WorkflowDefinition, WorkflowDefinitionStep, WorkflowInstance, WorkflowInstanceStep } from "@prisma/client";

type DefinitionWithSteps = WorkflowDefinition & {
  steps: WorkflowDefinitionStep[];
};

type InstanceWithRelations = WorkflowInstance & {
  definition?: { requestType: string } | null;
  requester: { employeeCode: string; firstName: string; lastName: string };
  steps: Array<
    WorkflowInstanceStep & {
      definitionStep?: { orderIndex: number } | null;
    }
  >;
};

function stepOrder(a: { orderIndex: number }, b: { orderIndex: number }): number {
  return a.orderIndex - b.orderIndex;
}

function instanceStepOrder(
  a: { definitionStep?: { orderIndex: number } | null },
  b: { definitionStep?: { orderIndex: number } | null }
): number {
  return (a.definitionStep?.orderIndex ?? 0) - (b.definitionStep?.orderIndex ?? 0);
}

export function serializeDefinition(def: DefinitionWithSteps) {
  return {
    id: def.id,
    requestType: def.requestType,
    status: def.status,
    createdAt: def.createdAt.toISOString().slice(0, 10),
    steps: [...def.steps].sort(stepOrder).map((s) => ({
      id: s.id,
      name: s.name,
      approverRule: s.approverRule,
      slaHours: s.slaHours,
      parallelGroup: s.parallelGroup,
      condition: (s.condition ?? null) as { field: string; operator: string; value: number } | null,
    })),
  };
}

export function serializeInstance(inst: InstanceWithRelations) {
  const orderedSteps = [...inst.steps].sort(instanceStepOrder);
  return {
    id: inst.id,
    definitionId: inst.definitionId,
    requestType: inst.definition?.requestType ?? "Workflow Request",
    requesterId: inst.requester.employeeCode,
    requesterName: `${inst.requester.firstName} ${inst.requester.lastName}`.trim(),
    attributes: inst.attributes,
    steps: orderedSteps.map((s) => ({
      stepId: s.id,
      name: s.name,
      approverRule: s.approverRule,
      parallelGroup: s.parallelGroup,
      slaHours: s.slaHours,
      approverId: s.approverId,
      approverName: s.approverName,
      selfApprovalBlocked: s.selfApprovalBlocked,
      escalatedTo: s.escalatedTo,
      escalatedToName: s.escalatedToName,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      actedBy: s.actedBy,
      actedByName: s.actedByName,
      actedAt: s.actedAt ? s.actedAt.toISOString() : null,
      rejectionReason: s.rejectionReason,
    })),
    currentStepIndex: inst.currentStepIndex,
    status: inst.status,
    resolutionFailure: inst.resolutionFailure,
    createdAt: inst.createdAt.toISOString(),
  };
}
