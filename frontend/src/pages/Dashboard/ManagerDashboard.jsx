/**
 * Manager Dashboard — role-aware surface driven by the shared widget registry
 * and the user's saved layout (see DashboardSurface). Team-scoped widgets are
 * restricted server-side to the manager's direct reports.
 */
import MainLayout from "../../components/layout/MainLayout";
import DashboardSurface from "../../components/dashboard/DashboardSurface";
import { ShieldCheck, Briefcase } from "lucide-react";
import "./ManagerDashboard.css";

export default function ManagerDashboard({ user }) {
  const todayFormatted = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <MainLayout>
      <div className="manager-dashboard">
        <div className="manager-hero">
          <div>
            <div className="manager-hero-badges">
              <span className="manager-eyebrow">
                <Briefcase size={12} /> Management Workspace
              </span>
              <span className="manager-role-tag">
                <ShieldCheck size={12} /> {user?.designation || "Manager"}
              </span>
            </div>
            <h1>
              {user?.greeting || "Good day"}, {user?.firstName || user?.name || "Manager"} 👋
            </h1>
            <p>
              Your direct reports' daily status, pending approvals, and personal workspace.
            </p>
          </div>

          <div className="manager-hero-orb" aria-hidden="true">
            <span>Today</span>
            <strong>{todayFormatted}</strong>
          </div>
        </div>

        <DashboardSurface />
      </div>
    </MainLayout>
  );
}
