// Resolve Backend API and Uploads Base URLs:
// 1. Reads VITE_API_BASE_URL / VITE_UPLOADS_BASE_URL from frontend/.env
// 2. Automatically falls back to the current browser window hostname (e.g. 192.168.x.x or localhost)
const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  return `http://${host}:5000/api`;
};

const getUploadsBase = () => {
  if (import.meta.env.VITE_UPLOADS_BASE_URL) {
    return import.meta.env.VITE_UPLOADS_BASE_URL;
  }
  const host = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
  return `http://${host}:5000/uploads`;
};

export const API_BASE = getApiBase();
export const UPLOADS_BASE = getUploadsBase();

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("ams_token");

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If body is FormData, do not set Content-Type header (browser sets boundary)
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token if expired
    if (!endpoint.includes("/auth/login")) {
      localStorage.removeItem("ams_token");
      localStorage.removeItem("ams_user");
      window.dispatchEvent(new Event("ams-auth-change"));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  getMe: () => apiRequest("/auth/me"),
  updateProfile: (profileData) =>
    apiRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),

  // Users / Employees
  getUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/users${q ? `?${q}` : ""}`);
  },
  getUserById: (id) => apiRequest(`/users/${id}`),
  createUser: (userData) =>
    apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),
  updateUser: (id, userData) =>
    apiRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    }),
  toggleUserStatus: (id, is_active) =>
    apiRequest(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
  deleteUser: (id) =>
    apiRequest(`/users/${id}`, {
      method: "DELETE",
    }),

  // Departments
  getDepartments: () => apiRequest("/departments"),
  createDepartment: (data) =>
    apiRequest("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Announcements
  getAnnouncements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/announcements${q ? `?${q}` : ""}`);
  },
  getAnnouncementById: (id) => apiRequest(`/announcements/${id}`),
  createAnnouncement: (formData) =>
    apiRequest("/announcements", {
      method: "POST",
      body: formData,
    }),
  updateAnnouncement: (id, formData) =>
    apiRequest(`/announcements/${id}`, {
      method: "PUT",
      body: formData,
    }),
  deleteAnnouncement: (id) =>
    apiRequest(`/announcements/${id}`, { method: "DELETE" }),

  // Lifecycle
  publishAnnouncement: (id) =>
    apiRequest(`/announcements/${id}/publish`, { method: "POST" }),
  scheduleAnnouncement: (id, scheduled_at, expires_at) =>
    apiRequest(`/announcements/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduled_at, expires_at }),
    }),
  cancelAnnouncement: (id, reason) =>
    apiRequest(`/announcements/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  archiveAnnouncement: (id) =>
    apiRequest(`/announcements/${id}/archive`, { method: "POST" }),

  // Recipients
  getAnnouncementRecipients: (id, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/announcements/${id}/recipients${q ? `?${q}` : ""}`);
  },
  getAnnouncementReadStatus: (id) =>
    apiRequest(`/announcements/${id}/read-status`),

  // Employee View
  getMyAnnouncements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/my/announcements${q ? `?${q}` : ""}`);
  },
  getMyAnnouncementById: (id) => apiRequest(`/my/announcements/${id}`),
  markAnnouncementRead: (id) =>
    apiRequest(`/my/announcements/${id}/read`, { method: "POST" }),

  // Notifications
  getNotifications: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/notifications${q ? `?${q}` : ""}`);
  },
  markNotificationRead: (id) =>
    apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    apiRequest("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id) =>
    apiRequest(`/notifications/${id}`, { method: "DELETE" }),

  // Reports
  getAnnouncementReports: (period = "30d") =>
    apiRequest(`/reports/announcements?period=${period}`),
  getReadRateReports: () => apiRequest("/reports/read-rate"),

  // Audit
  getAuditLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/audit-logs${q ? `?${q}` : ""}`);
  },

  // Announcement Queries & 1-on-1 Messaging
  getMyAnnouncementQuery: (announcementId) =>
    apiRequest(`/queries/announcement/${announcementId}/my`),
  sendEmployeeQuery: (announcementId, data) =>
    apiRequest(`/queries/announcement/${announcementId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAnnouncementQueries: (announcementId) =>
    apiRequest(`/queries/announcement/${announcementId}`),
  getQueryMessages: (queryId) =>
    apiRequest(`/queries/${queryId}/messages`),
  replyQuery: (queryId, data) =>
    apiRequest(`/queries/${queryId}/reply`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateQueryStatus: (queryId, status) =>
    apiRequest(`/queries/${queryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
