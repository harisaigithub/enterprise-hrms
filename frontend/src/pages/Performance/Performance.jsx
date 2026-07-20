import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Performance() {
  return (
    <MainLayout>
      <ModuleStub
        title="Performance Management"
        description="Goals, continuous feedback, mid-year and annual reviews, ratings and appraisal letters."
        features={[
  "OKR and KPI goal setting",
  "360-degree feedback",
  "Performance review cycles",
  "Rating calibration",
  "Appraisal letter generation",
        ]}
      />
    </MainLayout>
  );
}
