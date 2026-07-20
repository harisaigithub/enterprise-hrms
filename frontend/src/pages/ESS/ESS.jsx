import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function ESS() {
  return (
    <MainLayout>
      <ModuleStub
        title="Employee Self Service (ESS)"
        description="A unified employee-facing hub to manage personal data, payslips, leave, and requests."
        features={[
  "Profile and personal data update",
  "Payslip download",
  "Leave application",
  "IT and HR ticket raising",
  "Company announcements",
        ]}
      />
    </MainLayout>
  );
}
