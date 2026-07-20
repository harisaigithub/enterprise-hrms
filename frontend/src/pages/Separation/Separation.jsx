import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Separation() {
  return (
    <MainLayout>
      <ModuleStub
        title="Separation Management"
        description="Resignation, termination, clearance checklists, and Full & Final settlement processing."
        features={[
  "Resignation / termination initiation",
  "Exit interview scheduling",
  "Clearance checklist per department",
  "Full and Final settlement calculation",
  "Experience letter and relieving letter generation",
        ]}
      />
    </MainLayout>
  );
}
