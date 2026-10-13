/**
 * Employee Dashboard — role-aware surface driven by the shared widget registry
 * and the user's saved layout (see DashboardSurface). Hero branding retained.
 */
import MainLayout from "../../components/layout/MainLayout";
import DashboardSurface from "../../components/dashboard/DashboardSurface";
import "./EmployeeDashboard.css";

export default function EmployeeDashboard({ user }) {
  return (
    <MainLayout>
      <div className="employee-dashboard">
        <div className="employee-dashboard-hero">
          <div>
            <span className="employee-dashboard-eyebrow">Employee workspace</span>
            <h1>
              {user?.greeting || "Good day"}, {user?.firstName || user?.name || ""} 👋
            </h1>
            <p>Here’s your workday, progress and pending actions in one place.</p>
          </div>
          <div className="employee-dashboard-hero-orb" aria-hidden="true"><span>Today</span><strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong></div>
        </div>

        <DashboardSurface />
      </div>
    </MainLayout>
  );
}
