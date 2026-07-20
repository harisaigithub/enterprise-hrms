import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function LMS() {
  return (
    <MainLayout>
      <ModuleStub
        title="Learning Management (LMS)"
        description="Courses, assessments, certifications, and mandatory compliance training tracking."
        features={[
  "Course library with categories",
  "Assessment and quizzes",
  "Certification with expiry tracking",
  "Mandatory compliance training",
  "Learning path assignment",
        ]}
      />
    </MainLayout>
  );
}
