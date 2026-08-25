/**
 * Employee Dashboard — 
 */
import MainLayout from "../../components/layout/MainLayout";
import AttendanceWidget from "../../components/dashboard/AttendanceWidget";
import LeaveBalanceWidget from "../../components/dashboard/LeaveBalanceWidget";
import PayslipWidget from "../../components/dashboard/PayslipWidget";
import HolidaysWidget from "../../components/dashboard/HolidaysWidget";
import AnnouncementsWidget from "../../components/dashboard/AnnouncementsWidget";
import BirthdaysWidget from "../../components/dashboard/BirthdaysWidget";
import SelfAssessmentWidget from "../../components/dashboard/SelfAssessmentWidget";
import ComplianceCoursesWidget from "../../components/dashboard/ComplianceCoursesWidget";
import DashboardQuickActions from "../../components/dashboard/DashboardQuickActions";
import CollapsibleDashboardSection from "../../components/dashboard/CollapsibleDashboardSection";


export default function EmployeeDashboard({ user }) {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)" }}>
            {user?.greeting || "Good day"}, {user?.firstName || user?.name || ""} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "var(--subtext)", marginTop: "4px" }}>Here's what's on your plate today</p>
        </div>

        <DashboardQuickActions />

        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "12px", fontWeight: 800, color: "var(--text)" }}>Today at a glance</p>
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--subtext)" }}>Your most important work information</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <AttendanceWidget />
          <LeaveBalanceWidget />
          <PayslipWidget />
          <SelfAssessmentWidget />
        </div>

        <CollapsibleDashboardSection title="Updates & reminders" subtitle="Holidays, announcements, birthdays and training">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <HolidaysWidget />
            <AnnouncementsWidget />
            <BirthdaysWidget />
            <ComplianceCoursesWidget />
          </div>
        </CollapsibleDashboardSection>
      </div>
    </MainLayout>
  );
}
