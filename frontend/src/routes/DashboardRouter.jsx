import HRDashboard from "../pages/Dashboard/HRDashboard";
import EmployeeDashboard from "../pages/Dashboard/EmployeeDashboard";
import AdminDashboard from "../pages/Dashboard/AdminDashboard";
import ManagerDashboard from "../pages/Dashboard/ManagerDashboard";

export default function DashboardRouter({ role }) {
  switch (role) {
    case "ADMIN":
      return <AdminDashboard />;

    case "HR":
      return <HRDashboard />;

    case "MANAGER":
      return <ManagerDashboard />;

    case "EMPLOYEE":
      return <EmployeeDashboard />;

    default:
      return <HRDashboard />;
  }
}