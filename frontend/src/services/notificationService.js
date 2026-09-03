import api from "./api";

const unwrap = (response) => ({ data: response.data.data, total: response.data.total });

export const getInboxNotifications = () => api.get("/notifications").then(unwrap);
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`).then(unwrap);
export const markAllRead = () => api.patch("/notifications/read-all").then(unwrap);
export const getNotificationHistory = () => api.get("/notifications/delivery-history/me").then(unwrap);
export const getUserPreferences = () => api.get("/notifications/preferences/me").then(unwrap);
export const updateUserPreference = (preference) => api.put("/notifications/preferences/me", preference).then(unwrap);
export const getTemplates = () => api.get("/notifications/templates").then(unwrap);
export const getMergeFieldCatalog = () => api.get("/notifications/templates/catalog").then(unwrap);
export const lintTemplateBody = (body) => api.post("/notifications/templates/lint", { body }).then(unwrap);
export const saveTemplate = (template) => api.post("/notifications/templates", template).then(unwrap);
export const dispatchTestNotification = (id, values = {}) => api.post(`/notifications/templates/${id}/send-test`, { values }).then(unwrap);
