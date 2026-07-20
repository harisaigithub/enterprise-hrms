/**
 * API base instance
 * TODAY: All calls resolve with mock data — no real network request.
 * FUTURE: Set VITE_API_URL in .env and remove the mock imports from each service file.
 *
 * Interceptors are already wired up so when the backend is connected,
 * auth headers, error handling, and loading states work automatically.
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

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("hrms_token");
      localStorage.removeItem("hrms_role");
      // FUTURE: window.location.href = '/login';
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
