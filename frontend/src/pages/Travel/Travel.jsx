import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Travel() {
  return (
    <MainLayout>
      <ModuleStub
        title="Travel Management"
        description="Business travel requests, booking, advance disbursement and settlement."
        features={[
  "Travel request and approval",
  "Flight and hotel booking integration",
  "Travel advance disbursement",
  "Expense settlement on return",
  "Travel policy compliance check",
        ]}
      />
    </MainLayout>
  );
}
