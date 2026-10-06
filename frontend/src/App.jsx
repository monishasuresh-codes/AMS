import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/routing/ProtectedRoute";
import AppShell from "./components/common/AppShell";

// Auth
import LoginPage from "./pages/auth/LoginPage";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AnnouncementsList from "./pages/admin/AnnouncementsList";
import CreateAnnouncement from "./pages/admin/CreateAnnouncement";
import AnnouncementDetail from "./pages/admin/AnnouncementDetail";
import EmployeesList from "./pages/admin/EmployeesList";
import ReportsPage from "./pages/admin/ReportsPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import SettingsPage from "./pages/admin/SettingsPage";

// Employee
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyAnnouncementsList from "./pages/employee/MyAnnouncementsList";
import EmployeeAnnouncementDetail from "./pages/employee/EmployeeAnnouncementDetail";
import EmployeeNotifications from "./pages/employee/EmployeeNotifications";
import EmployeeProfile from "./pages/employee/EmployeeProfile";

function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user.role === "ADMIN" ? (
    <Navigate to="/admin/dashboard" replace />
  ) : (
    <Navigate to="/employee/dashboard" replace />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth */}
            <Route path="/login" element={<LoginPage />} />

            {/* Root index redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="announcements" element={<AnnouncementsList />} />
              <Route path="announcements/create" element={<CreateAnnouncement />} />
              <Route path="announcements/:id" element={<AnnouncementDetail />} />
              <Route path="employees" element={<EmployeesList />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Employee Routes */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute employeeOnly={true}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="announcements" element={<MyAnnouncementsList />} />
              <Route path="announcements/:id" element={<EmployeeAnnouncementDetail />} />
              <Route path="notifications" element={<EmployeeNotifications />} />
              <Route path="profile" element={<EmployeeProfile />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
