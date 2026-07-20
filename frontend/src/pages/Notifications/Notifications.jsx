import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Notifications() {
  return (
    <MainLayout>
      <ModuleStub
        title="Notifications"
        description="Shared email, SMS, push and in-app notification delivery service used by all modules."
        features={[
  "Multi-channel delivery (Email, SMS, Push, In-App)",
  "Template management",
  "Notification preferences per user",
  "Delivery status and retry logic",
  "Digest and bulk notification support",
        ]}
      />
    </MainLayout>
  );
}
