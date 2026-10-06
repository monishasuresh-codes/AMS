import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";

export default function ProtectedRoute({ children, adminOnly = false, employeeOnly = false }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner text="Checking authentication status..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (employeeOnly && user.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
