/**
 * Admin dashboard service.
 *
 * Single in-flight request shared by every admin widget (org KPIs, charts,
 * insights…) so one dashboard render triggers exactly one API call.
 * Failures are propagated so widgets show their error state — never stale
 * fabricated metrics.
 */
import api from "./api";

let request = null;

export function clearAdminDashboardCache() {
  request = null;
}

export const getAnalyticsSnapshot = () => {
  if (!request) {
    request = api
      .get("/dashboard/admin")
      .then((response) => response.data)
      .catch((error) => {
        request = null;
        throw error;
      });
  }
  return request;
};
