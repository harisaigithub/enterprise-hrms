import api from "./api";

/** Finance dashboard — one shared in-flight request per render cycle. */
let request = null;

export function clearFinanceDashboardCache() {
  request = null;
}

export const getFinanceDashboardSnapshot = () => {
  if (!request) {
    request = api
      .get("/dashboard/finance")
      .then((response) => response.data)
      .catch((error) => {
        request = null;
        throw error;
      });
  }
  return request;
};
