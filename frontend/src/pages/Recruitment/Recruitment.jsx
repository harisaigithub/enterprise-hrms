import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Recruitment() {
  return (
    <MainLayout>
      <ModuleStub
        title="Recruitment (ATS)"
        description="Manage job requisitions, candidate pipeline, interviews, and offers. From job posting to offer letter in one place."
        features={[
  "Job Requisition with approvals",
  "Candidate pipeline (Applied → Screening → Interview → Offer → Hired)",
  "Interview scheduling and feedback",
  "Offer letter generation",
  "Integration with onboarding",
        ]}
      />
    </MainLayout>
  );
}
