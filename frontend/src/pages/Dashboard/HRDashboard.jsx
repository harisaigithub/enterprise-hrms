/**
 * HR dashboard — organization people-ops via the shared role-aware surface.
 */
import MainLayout from "../../components/layout/MainLayout";
import WelcomeCard from "../../components/shared/Dashboardgreeting";
import DashboardSurface from "../../components/dashboard/DashboardSurface";

export default function HRDashboard() {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <WelcomeCard />
        <DashboardSurface />
      </div>
    </MainLayout>
  );
}
