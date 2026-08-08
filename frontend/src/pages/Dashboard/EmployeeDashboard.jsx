/**
 * Employee Dashboard — spec 3.5.1
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


export default function EmployeeDashboard({ user, isManager }) {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)" }}>
            {user?.greeting || "Good day"}, {user?.firstName || user?.name || ""} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "var(--subtext)", marginTop: "4px" }}>Here's what's on your plate today</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <AttendanceWidget />
          <LeaveBalanceWidget />
          <PayslipWidget />
          <HolidaysWidget />
          <AnnouncementsWidget />
          <BirthdaysWidget />
          <SelfAssessmentWidget />
          <ComplianceCoursesWidget />
        </div>
      </div>
    </MainLayout>
  );
}