import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Reports() {
  return (
    <MainLayout>
      <ModuleStub
        title="Reports & Analytics"
        description="Standard and custom reports across all data domains — employees, payroll, attendance, leave, and more."
        features={[
  "Pre-built standard reports",
  "Custom report builder",
  "Scheduled report delivery",
  "Export to CSV and PDF",
  "Cross-module analytics dashboard",
        ]}
      />
    </MainLayout>
  );
}
