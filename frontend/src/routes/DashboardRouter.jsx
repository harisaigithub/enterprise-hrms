import { useAuth } from "../context/AuthContext";
import EmployeeDashboard from "../pages/Dashboard/EmployeeDashboard";
import HRDashboard from "../pages/Dashboard/HRDashboard";
import ManagerDashboard from "../pages/Dashboard/ManagerDashboard";
import AdminDashboard from "../pages/Dashboard/Admindashboard";

/**
 * Picks which dashboard to render based on the logged-in user's real role
 * (from AuthContext, set at /auth/login). Each role has its own dedicated
 * dashboard component — Manager and Admin are NOT variants of
 * EmployeeDashboard, they're separate files (ManagerDashboard.jsx,
 * Admindashboard.jsx).
 */
export default function DashboardRouter() {
  const { user, role } = useAuth();

  switch (role?.toUpperCase()) {
    case "MANAGER":
      return <ManagerDashboard user={user} />;
    case "HR":
      return <HRDashboard user={user} />;
    case "ADMIN":
      return <AdminDashboard user={user} />;
    case "EMPLOYEE":
    default:
      return <EmployeeDashboard user={user} />;
  }
}