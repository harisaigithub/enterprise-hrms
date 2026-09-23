import api from "./api";

export const getHRDashboardSnapshot = async () => {
  const response = await api.get("/dashboard/hr");
  return response.data;
};
