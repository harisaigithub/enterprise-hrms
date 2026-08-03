/**
 * AuthContext
 * Provides: user, role, permissions, login(), logout()
 *
 * TODAY: Mock auth — role is set from localStorage with a fallback to "HR".
 * FUTURE: Replace mockLogin with a real JWT POST /api/auth/login call.
 *         The shape of `user` and `permissions` must NOT change.
 *
 * NOTE: every module below now has at least one role with a `:read`
 * permission. Additions beyond the original set are marked inline with
 * which spec section justifies them — nothing that existed before was
 * removed or changed, only gaps filled so Sidebar filtering (see
 * Sidebar.jsx) doesn't make an entire module vanish for every role.
 */

import { createContext, useContext, useState, useCallback } from "react";

// Permission strings follow the pattern: "<module>:<action>"
const ROLE_PERMISSIONS = {
  ADMIN: [
    "dashboard:read",
    "employees:read", "employees:write", "employees:delete",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read", "payroll:write", "payroll:approve",
    "recruitment:read", "recruitment:write",
    "performance:read", "performance:write",
    "reports:read", "reports:export",
    "security:read", "security:write",
    "orgmanagement:read", "orgmanagement:write",
    "compliance:read",
    // Added — Admin has "full technical access" (spec Module 2, 4.2) so it's
    // the natural superset role; these modules previously had no ADMIN entry.
    "onboarding:read",
    "lms:read",
    "assets:read", "assets:write",
    "tasks:read",
    "expenses:read",
    "travel:read",
    "policies:read",
    "helpdesk:read", "helpdesk:write",
    "separation:read",
    "workflows:read", "workflows:write",
    "notifications:read",
  ],
  HR: [
    "dashboard:read",
    "employees:read", "employees:write",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read",
    "recruitment:read", "recruitment:write",
    "onboarding:read", "onboarding:write",
    "performance:read",
    "reports:read",
    "policies:read", "policies:write",
    "helpdesk:read",
    "separation:read", "separation:write",
    // Added — spec 9.2 (HR/L&D Admin owns LMS) and 21.2 (Admin/HR configure
    // the Workflow Engine); notifications per 23.2 ("all roles are recipients").
    "lms:read", "lms:write",
    "workflows:read", "workflows:write",
    "notifications:read",
  ],
  MANAGER: [
    "dashboard:read",
    "employees:read",
    "attendance:read",
    "leave:read", "leave:approve",
    "payroll:read",
    "performance:read", "performance:write",
    "tasks:read", "tasks:write",
    "reports:read",
    // Added — Manager is an approver for these per spec 14.2 (Expense), 15.2
    // (Travel), 11.2/17.2 (team-visibility for LMS/Helpdesk), 18.5 step 4
    // (Policy acknowledgement applies to every employee, managers included),
    // 19.5 (Manager provides separation clearance sign-off), 23.2 (recipient).
    "expenses:read", "expenses:approve",
    "travel:read", "travel:approve",
    "lms:read",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "separation:read",
    "notifications:read",
  ],
  EMPLOYEE: [
    "dashboard:read",
    "attendance:read",
    "leave:read", "leave:write",
    "payroll:read",
    "ess:read", "ess:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    // Added — Employee is an explicit actor for each of these in the spec:
    // performance (10.2 — sets goals, self-assessment), lms (11.2 — takes
    // courses), assets (10.2 — requests assets), tasks (13.2 — works tasks),
    // expenses (14.2 — submits claims), travel (15.2 — raises requests),
    // onboarding (6.2 — "New Employee" completes checklist), separation
    // (19.2 — initiates resignation), notifications (23.2 — recipient).
    "performance:read", "performance:write",
    "lms:read",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write",
    "travel:read", "travel:write",
    "onboarding:read",
    "separation:read",
    "notifications:read",
  ],
};

const MOCK_USERS = {
  HR: {
    id: "EMP011",
    firstName: "lewis",
    lastName: "hamilton",
    email: "lewis.hamilton@company.com",
    avatar: "https://i.pravatar.cc/150?img=11",
    role: "HR",
    designation: "HR Manager",
  },
  ADMIN: {
    id: "EMP010",
    firstName: "Robert",
    lastName: "King",
    email: "robert.king@company.com",
    avatar: "https://i.pravatar.cc/150?img=10",
    role: "ADMIN",
    designation: "CEO",
  },
  MANAGER: {
    id: "EMP005",
    firstName: "Alice",
    lastName: "Quinn",
    email: "alice.quinn@company.com",
    avatar: "https://i.pravatar.cc/150?img=5",
    role: "MANAGER",
    designation: "Engineering Manager",
  },
  EMPLOYEE: {
    id: "EMP001",
    firstName: "Matsya",
    lastName: "Singh",
    email: "Matsya.Singh@company.com",
    avatar: "https://i.pravatar.cc/150?img=1",
    role: "EMPLOYEE",
    designation: "Senior Software Engineer",
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const savedRole = localStorage.getItem("hrms_role") || "HR";
  const [user, setUser] = useState(MOCK_USERS[savedRole] || MOCK_USERS.HR);
  const [permissions, setPermissions] = useState(
    ROLE_PERMISSIONS[savedRole] || ROLE_PERMISSIONS.HR
  );

  /**
   * FUTURE: Replace with POST /api/auth/login
   * const res = await api.post('/auth/login', { email, password });
   * const { user, token } = res.data;
   * localStorage.setItem('hrms_token', token);
   */
  const login = useCallback((role) => {
    const u = MOCK_USERS[role] || MOCK_USERS.HR;
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.HR;
    setUser(u);
    setPermissions(perms);
    localStorage.setItem("hrms_role", role);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("hrms_role");
    localStorage.removeItem("hrms_token");
    setUser(MOCK_USERS.HR);
    setPermissions(ROLE_PERMISSIONS.HR);
    // FUTURE: window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, role: user.role, permissions, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}