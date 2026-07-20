import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Policies() {
  return (
    <MainLayout>
      <ModuleStub
        title="Policy Management"
        description="Company policies with versioning, employee acknowledgement tracking and compliance monitoring."
        features={[
  "Policy library with versions",
  "Employee acknowledgement tracking",
  "Policy expiry alerts",
  "Department-specific policies",
  "Audit trail of acceptances",
        ]}
      />
    </MainLayout>
  );
}
