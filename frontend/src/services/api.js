/**
 * API base instance
 * Talks to the real backend (see .env → VITE_API_URL).
 *
 * Auth flow:
 *   - Request interceptor attaches the JWT access token (hrms_token).
 *   - Response interceptor rotates the access token via the refresh token
 *     (hrms_refresh) when a 401 is returned, then retries the original request.
 *   - If rotation fails, the session is cleared and the user is sent to /login.
 *
 * AuthContext calls this for login/logout; every module service calls it too.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor (silent token refresh on 401) ─────────────────────
let refreshing = null;

async function tryRefresh() {
  const refreshToken = localStorage.getItem("hrms_refresh");
  if (!refreshToken) throw new Error("No refresh token");
  const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
  const { token, refreshToken: newRefresh, permissions } = res.data?.data ?? {};
  if (!token) throw new Error("Refresh failed");
  localStorage.setItem("hrms_token", token);
  if (newRefresh) localStorage.setItem("hrms_refresh", newRefresh);
  if (permissions) localStorage.setItem("hrms_permissions", JSON.stringify(permissions));
  return token;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt rotation for real auth failures, once per request.
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        // Single-flight: concurrent 401s share one refresh call.
        refreshing = refreshing || tryRefresh().finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem("hrms_token");
        localStorage.removeItem("hrms_refresh");
        localStorage.removeItem("hrms_role");
        localStorage.removeItem("hrms_permissions");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    // Do NOT expose raw stack traces — re-throw a clean object
    return Promise.reject({
      status: error.response?.status || 0,
      message:
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred. Please try again.",
    });
  }
);

export default api;
