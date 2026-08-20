// Auth context — exposes user, role, permissions, login/logout.
// JWT is stored in localStorage; session is restored on page load via GET /auth/me.

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

// Role accounts for quick sign-in (same credentials as the seeded database).
const DEMO_ACCOUNTS = [
  { label: "Admin",    email: "robert.king@company.com",  password: "Password@123" },
  { label: "HR",       email: "sunita.reddy@company.com", password: "Password@123" },
  { label: "Manager",  email: "anjali.desai@company.com",  password: "Password@123" },
  { label: "Employee", email: "matsya.singh@company.com", password: "Password@123" },
];

const TOKEN_KEY = "hrms_token";
const REFRESH_KEY = "hrms_refresh";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const applySession = useCallback((data) => {
    setUser(data.user);
    setPermissions(data.permissions || []);
    localStorage.setItem("hrms_permissions", JSON.stringify(data.permissions || []));
    if (data.role) localStorage.setItem("hrms_role", data.role);
  }, []);

  // Restore session from the access token (if any) on first load.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    api
      .get("/auth/me")
      .then((res) => applySession(res.data.data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  const login = useCallback(
    async (email, password) => {
      const res = await api.post("/auth/login", { email, password });
      const { user: u, token, refreshToken, permissions: perms } = res.data.data;
      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem("hrms_role", u.role);
      applySession({ user: u, permissions: perms, role: u.role });
      return u;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Best-effort: always clear local session even if the server is unreachable.
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("hrms_role");
    localStorage.removeItem("hrms_permissions");
    setUser(null);
    setPermissions([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, permissions, loading, login, logout }}>
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

export { DEMO_ACCOUNTS };
