import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Compliance() {
  return (
    <MainLayout>
      <ModuleStub
        title="Compliance"
        description="Statutory filing tracking, POSH case management, and data retention and purge jobs."
        features={[
  "Statutory filing calendar and reminders",
  "POSH case registration and tracking",
  "Data retention policy configuration",
  "Automated purge jobs with audit log",
  "Compliance dashboard and alerts",
        ]}
      />
    </MainLayout>
  );
}
