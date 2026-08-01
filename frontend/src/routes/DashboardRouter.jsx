import { useState } from "react";
import RoleSwitcher from "../components/dashboard/shared/RoleSwitcher";
import EmployeeDashboard from "./dashboard/EmployeeDashboard";
import HRDashboard from "./dashboard/HRDashboard";
import ManagementDashboard from "./dashboard/ManagementDashboard";
import { ROLES, MOCK_USERS } from "../mock/dashboard";
 
export default function Dashboard() {
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  const user = MOCK_USERS[role];
  const topSlot = <RoleSwitcher role={role} onChange={setRole} />;
 
  switch (role) {
    case ROLES.MANAGER:
      return <EmployeeDashboard user={user} isManager topSlot={topSlot} />;
    case ROLES.HR:
      return <HRDashboard topSlot={topSlot} />;
    case ROLES.MANAGEMENT:
      return <ManagementDashboard user={user} topSlot={topSlot} />;
    case ROLES.EMPLOYEE:
    default:
      return <EmployeeDashboard user={user} isManager={false} topSlot={topSlot} />;
  }
}
 