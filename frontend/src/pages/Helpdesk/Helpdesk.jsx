import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Helpdesk() {
  return (
    <MainLayout>
      <ModuleStub
        title="Helpdesk"
        description="IT, HR, and Finance ticketing system with SLA tracking and escalation management."
        features={[
  "Ticket creation by category",
  "SLA monitoring and alerts",
  "Agent assignment and routing",
  "Escalation workflows",
  "Knowledge base integration",
        ]}
      />
    </MainLayout>
  );
}
