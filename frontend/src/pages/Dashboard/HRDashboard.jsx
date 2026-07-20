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
      <div className="max-w-[1600px] mx-auto">

        <WelcomeCard />

        <div className="grid grid-cols-12 gap-8 mt-8">

          {/* Left */}
          <div className="col-span-9 flex flex-col gap-8">
            <AlertCard />
            <HiringInsights />
          </div>

          {/* Right */}
          <div className="col-span-3 flex flex-col gap-8">
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