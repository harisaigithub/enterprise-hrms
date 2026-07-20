import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Expenses() {
  return (
    <MainLayout>
      <ModuleStub
        title="Expense Management"
        description="Employee expense claims, receipt upload, approval workflow, and reimbursement tracking."
        features={[
  "Expense claim submission",
  "Receipt OCR and upload",
  "Multi-level approval",
  "Reimbursement to salary",
  "Monthly expense analytics",
        ]}
      />
    </MainLayout>
  );
}
