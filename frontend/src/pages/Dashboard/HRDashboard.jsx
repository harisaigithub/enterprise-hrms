import MainLayout from "../../components/layout/MainLayout";
import WelcomeCard from "../../components/dashboard/WelcomeCard";
import AlertCard from "../../components/dashboard/AlertCard";
import HiringInsights from "../../components/dashboard/HiringInsights";
import QuickActions from "../../components/dashboard/QuickActions";
import PeopleCard from "../../components/dashboard/PeopleCard";
import PayrollCard from "../../components/dashboard/PayrollCard";
import ResourcesCard from "../../components/dashboard/ResourcesCard";

export default function Dashboard() {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <WelcomeCard />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 280px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
            <AlertCard />
            <HiringInsights />
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <QuickActions />
            <PeopleCard />
            <PayrollCard />
            <ResourcesCard />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}