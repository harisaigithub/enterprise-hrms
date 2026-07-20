import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function OrgManagement() {
  return (
    <MainLayout>
      <ModuleStub
        title="Organization Management"
        description="Foundational reference data — company structure, business units, departments, locations and designations."
        features={[
  "Company and business unit hierarchy",
  "Department management",
  "Location and office configuration",
  "Designation grade structure",
  "Reporting relationships",
        ]}
      />
    </MainLayout>
  );
}
