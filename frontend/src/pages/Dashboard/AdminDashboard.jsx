/**
 * Admin Dashboard — mapped to spec 3.5.3 "Management Dashboard"
 * (Org KPIs, department-wise performance, hiring funnel, payroll cost trend,
 * satisfaction score, productivity — pre-aggregated nightly).
 *
 * Note: spec 3.2 separately describes an Admin/Auditor "System Health
 * Dashboard" covered in Module 23, not detailed in Module 3. This file is
 * built against the Management Dashboard spec since that's what's fully
 * specified here — flag if you actually want the System Health variant instead.
 */
import MainLayout from "../../components/layout/MainLayout";
import OrgKpisWidget from "../../components/dashboard/OrgKpisWidget";
import DepartmentPerformanceWidget from "../../components/dashboard/DepartmentPerformanceWidget";
import HiringFunnelWidget from "../../components/dashboard/HiringFunnelWidget";
import PayrollCostTrendWidget from "../../components/dashboard/PayrollCostTrendWidget";
import SatisfactionWidget from "../../components/dashboard/SatisfactionWidget";
import ProductivityWidget from "../../components/dashboard/ProductivityWidget";
import { user } from "../../data/user";

export default function AdminDashboard() {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)" }}>{user.greeting}, {user.firstName} 👋</h1>
          <p style={{ fontSize: "14px", color: "var(--subtext)", marginTop: "4px" }}>Here's your org-wide overview</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
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