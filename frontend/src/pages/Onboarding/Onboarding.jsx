import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Onboarding() {
  return (
    <MainLayout>
      <ModuleStub
        title="Onboarding"
        description="Convert a hired candidate into a fully set-up employee — IT accounts, assets, documents, and buddy assignment."
        features={[
  "Onboarding checklist per role",
  "Document collection and e-signing",
  "IT and asset provisioning tasks",
  "Buddy / mentor assignment",
  "Day 1 orientation schedule",
        ]}
      />
    </MainLayout>
  );
}
