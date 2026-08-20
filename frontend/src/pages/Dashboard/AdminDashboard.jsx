/**
 * Admin/Management dashboard — org-wide KPIs, hiring funnel, payroll trends.
 */
import MainLayout from "../../components/layout/MainLayout";
import WelcomeCard from "../../components/shared/Dashboardgreeting";
import OrgKpisWidget from "../../components/dashboard/OrgKpisWidget";
import DepartmentPerformanceWidget from "../../components/dashboard/DepartmentPerformanceWidget";
import HiringFunnelWidget from "../../components/dashboard/HiringFunnelWidget";
import PayrollCostTrendWidget from "../../components/dashboard/PayrollCostTrendWidget";
import SatisfactionWidget from "../../components/dashboard/SatisfactionWidget";
import ProductivityWidget from "../../components/dashboard/ProductivityWidget";

export default function AdminDashboard() {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        {/* Hero greeting banner */}
        <WelcomeCard />

        {/* Widget grid — responsive: 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "18px",
        }}>
          <OrgKpisWidget />
          <DepartmentPerformanceWidget />
          <HiringFunnelWidget />
          <PayrollCostTrendWidget />
          <SatisfactionWidget />
          <ProductivityWidget />
        </div>
      </div>
    </MainLayout>
  );
}