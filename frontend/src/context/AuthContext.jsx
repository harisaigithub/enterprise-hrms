/**
 * AuthContext
 * Provides: user, role, permissions, login(), logout()
 *
 * TODAY: Mock auth — role is set from localStorage with a fallback to "HR".
 * FUTURE: Replace mockLogin with a real JWT POST /api/auth/login call.
 *         The shape of `user` and `permissions` must NOT change.
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
  ],
  EMPLOYEE: [
    "dashboard:read",
    "attendance:read",
    "leave:read", "leave:write",
    "payroll:read",
    "ess:read", "ess:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
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
