/**
 * Admin dashboard service.
 *
 * Uses only the live, ADMIN-protected backend endpoint. API failures are
 * intentionally propagated so dashboard widgets display their error state rather than
 * displaying stale demo metrics as if they were current organization data.
 */
import api from "./api";

export const getAnalyticsSnapshot = async () => {
  const response = await api.get("/dashboard/admin");
  return response.data;
};
