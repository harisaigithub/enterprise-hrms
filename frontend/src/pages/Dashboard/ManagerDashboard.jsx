/**
 * Manager Dashboard —
 * Executive workspace for People Managers.
 * Displays team oversight (live direct report presence, pending team approvals, team attendance),
 * manager-specific operational shortcuts, and personal self-service metrics.
 */
import MainLayout from "../../components/layout/MainLayout";
import TeamApprovalsWidget from "../../components/dashboard/TeamApprovalsWidget";
import TeamAttendanceWidget from "../../components/dashboard/TeamAttendanceWidget";
import TeamRosterWidget from "../../components/dashboard/TeamRosterWidget";
import ManagerQuickActions from "../../components/dashboard/ManagerQuickActions";
import AttendanceWidget from "../../components/dashboard/AttendanceWidget";
import LeaveBalanceWidget from "../../components/dashboard/LeaveBalanceWidget";
import PayslipWidget from "../../components/dashboard/PayslipWidget";
import SelfAssessmentWidget from "../../components/dashboard/SelfAssessmentWidget";
import HolidaysWidget from "../../components/dashboard/HolidaysWidget";
import AnnouncementsWidget from "../../components/dashboard/AnnouncementsWidget";
import BirthdaysWidget from "../../components/dashboard/BirthdaysWidget";
import ComplianceCoursesWidget from "../../components/dashboard/ComplianceCoursesWidget";
import CollapsibleDashboardSection from "../../components/dashboard/CollapsibleDashboardSection";
import { ShieldCheck, Briefcase } from "lucide-react";
import "./ManagerDashboard.css";

export default function ManagerDashboard({ user }) {
  const todayFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <MainLayout>
      <div className="manager-dashboard">
        {/* Executive Hero Banner */}
        <div className="manager-hero">
          <div>
            <div className="manager-hero-badges">
              <span className="manager-eyebrow">
                <Briefcase size={12} /> Management Workspace
              </span>
              <span className="manager-role-tag">
                <ShieldCheck size={12} /> {user?.designation || "Engineering Manager"}
              </span>
            </div>
            <h1>
              {user?.greeting || "Good day"}, {user?.firstName || user?.name || "Manager"} 👋
            </h1>
            <p>
              Here's your direct reports' daily status, pending approvals, and your personal workspace.
            </p>
          </div>

          <div className="manager-hero-orb" aria-hidden="true">
            <span>Today</span>
            <strong>{todayFormatted}</strong>
          </div>
        </div>

        {/* Manager Operational Quick Actions */}
        <ManagerQuickActions />

        {/* Section 1: Team Operations & Approvals */}
        <section style={{ marginBottom: "26px" }}>
          <div className="manager-section-header">
            <h2>Team Operations & Approvals</h2>
            <span>Direct reporting hierarchy metrics</span>
          </div>

          <div className="manager-grid-team">
            <TeamApprovalsWidget />
            <TeamAttendanceWidget />
          </div>

          <TeamRosterWidget />
        </section>

        {/* Section 2: Personal Self-Service Workspace */}
        <section style={{ marginBottom: "26px" }}>
          <div className="manager-section-header">
            <h2>Your Personal Workspace</h2>
            <span>Attendance punches, leave balances, salary and performance</span>
          </div>

          <div className="manager-grid-personal">
            <AttendanceWidget />
            <LeaveBalanceWidget />
            <PayslipWidget />
            <SelfAssessmentWidget />
          </div>
        </section>

        {/* Section 3: Updates, Compliance & Announcements */}
        <CollapsibleDashboardSection
          title="Updates & Organization Reminders"
          subtitle="Holidays, company announcements, team birthdays and compliance training"
          defaultOpen
        >
          <div className="manager-grid-updates">
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

