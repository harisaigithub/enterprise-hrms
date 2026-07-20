import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function WorkflowEngine() {
  return (
    <MainLayout>
      <ModuleStub
        title="Workflow Engine"
        description="Shared configurable approval-chain engine used by all HRMS modules — no hardcoded flows."
        features={[
  "Multi-step approval chain builder",
  "Condition-based routing",
  "Delegation and escalation rules",
  "Approval history and audit trail",
  "Template library for common workflows",
        ]}
      />
    </MainLayout>
  );
}
