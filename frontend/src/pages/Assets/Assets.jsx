import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Assets() {
  return (
    <MainLayout>
      <ModuleStub
        title="Asset Management"
        description="Track laptops, phones, access cards and other company assets assigned to employees."
        features={[
  "Asset catalogue and inventory",
  "Assign / return workflows",
  "Asset health and condition tracking",
  "Maintenance scheduling",
  "Decommission with audit trail",
        ]}
      />
    </MainLayout>
  );
}
