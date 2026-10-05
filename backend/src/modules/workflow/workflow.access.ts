export interface WorkflowReadScope {
  employeeCode: string;
  includeAssigned: boolean;
}

export function workflowInstanceReadFilter(scope?: WorkflowReadScope) {
  if (!scope) return undefined;
  return {
    OR: [
      { requester: { is: { employeeCode: scope.employeeCode } } },
      ...(scope.includeAssigned
        ? [{ steps: { some: { OR: [{ approverId: scope.employeeCode }, { escalatedTo: scope.employeeCode }] } } }]
        : []),
    ],
  };
}