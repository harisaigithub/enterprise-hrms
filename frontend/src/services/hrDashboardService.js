import api from "./api";

/** HR dashboard — one shared in-flight request for all HR widgets. */
let request = null;

export function clearHRDashboardCache() {
  request = null;
}

export const getHRDashboardSnapshot = () => {
  if (!request) {
    request = api
      .get("/dashboard/hr")
      .then((response) => response.data)
      .catch((error) => {
        request = null;
        throw error;
      });
  }
  return request;
};
