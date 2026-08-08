/**
 * Manager Dashboard — spec 3.2
 * "Manager sees Employee Dashboard (for themselves) + Manager-specific widgets"
 * — so this renders the same personal widgets as EmployeeDashboard.jsx, plus
 * a Team section on top.
 */
import MainLayout from "../../components/layout/MainLayout";
import TeamApprovalsWidget from "../../components/dashboard/TeamApprovalsWidget";
import TeamAttendanceWidget from "../../components/dashboard/TeamAttendanceWidget";
import AttendanceWidget from "../../components/dashboard/AttendanceWidget";
import LeaveBalanceWidget from "../../components/dashboard/LeaveBalanceWidget";
import PayslipWidget from "../../components/dashboard/PayslipWidget";
import HolidaysWidget from "../../components/dashboard/HolidaysWidget";
import AnnouncementsWidget from "../../components/dashboard/AnnouncementsWidget";
import BirthdaysWidget from "../../components/dashboard/BirthdaysWidget";
import SelfAssessmentWidget from "../../components/dashboard/SelfAssessmentWidget";
import ComplianceCoursesWidget from "../../components/dashboard/ComplianceCoursesWidget";


export default function ManagerDashboard({ user }) {
  return (
    <MainLayout>
      <div style={{ maxWidth: "1480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)" }}>
            {user?.greeting || "Good day"}, {user?.firstName || user?.name || ""} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "var(--subtext)", marginTop: "4px" }}>Here's your team and your day at a glance</p>
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Your Team</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          <TeamApprovalsWidget />
          <TeamAttendanceWidget />
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>You</p>
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