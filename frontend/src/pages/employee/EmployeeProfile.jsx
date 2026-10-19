import React, { useState } from "react";
import {
  User,
  Lock,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building,
  Key,
  Check,
  Bell,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../services/api";

export default function EmployeeProfile() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    if (newPassword && !currentPassword) {
      setError("Please enter your current password to authorize setting a new password");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await api.updateProfile(payload);
      setMsg("Profile preferences saved successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.3px" }}>
            Employee Profile & Settings
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Personal account information, password credentials, and display theme
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            borderRadius: 8,
            backgroundColor: "var(--color-secondary-surface)",
            border: "1px solid var(--color-border)",
            fontSize: "0.82rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <Building size={15} color="var(--color-accent)" />
          <span>
            Department: <strong style={{ color: "var(--color-text-primary)" }}>{user?.department_name || "Assigned"}</strong>
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {msg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.85rem 1rem",
            borderRadius: 8,
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "var(--color-status-published)",
            fontSize: "0.88rem",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.85rem 1rem",
            borderRadius: 8,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#EF4444",
            fontSize: "0.88rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Full-Width Responsive 2-Column Grid */}
      <div className="settings-layout-grid">
        {/* Left Column: Quick Profile & Theme Switcher */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Identity Snapshot Card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--color-accent), #452A1D)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  boxShadow: "var(--shadow-sm)",
                  border: "2px solid var(--color-accent-border)",
                }}
              >
                {firstName ? firstName[0].toUpperCase() : "E"}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {firstName} {lastName}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                  {user?.email}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    marginTop: "0.35rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--color-status-published)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-status-published)",
                      display: "inline-block",
                    }}
                  />
                  Active Employee
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                padding: "0.85rem",
                borderRadius: 8,
                backgroundColor: "var(--color-secondary-surface)",
                fontSize: "0.82rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Employee Code:</span>
                <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--color-accent)" }}>
                  {user?.employee_code || "N/A"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Department:</span>
                <span style={{ fontWeight: 600 }}>{user?.department_name || "Unassigned"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Role:</span>
                <span style={{ fontWeight: 600 }}>{user?.role || "EMPLOYEE"}</span>
              </div>
            </div>
          </div>

          {/* Theme Switcher Card */}
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Visual Display Theme
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              Select your appearance preference. Stored securely on your device.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Coffee Brown Light Option */}
              <button
                type="button"
                onClick={() => theme === "dark" && toggleTheme()}
                className={`theme-preview-card ${theme === "light" ? "active" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: "#F5EFEB",
                      border: "2px solid #5C3D2E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sun size={14} color="#5C3D2E" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Coffee Brown Theme</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                      Warm latte background & espresso accents
                    </div>
                  </div>
                </div>
                {theme === "light" && <Check size={18} color="var(--color-accent)" />}
              </button>

              {/* Dark Theme Option */}
              <button
                type="button"
                onClick={() => theme === "light" && toggleTheme()}
                className={`theme-preview-card ${theme === "dark" ? "active" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: "#0D1016",
                      border: "2px solid #9B8959",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Moon size={14} color="#9B8959" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Dark Theme</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                      Deep charcoal surface & muted gold accents
                    </div>
                  </div>
                </div>
                {theme === "dark" && <Check size={18} color="var(--color-accent)" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile & Security Forms */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Personal Details Card */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Personal Information</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  Your basic contact and profile details
                </p>
              </div>
              <User size={18} color="var(--color-accent)" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Email Address (Fixed)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="input-field"
                  style={{ opacity: 0.75, cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Assigned Department
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.department_name || "Unassigned"}
                  className="input-field"
                  style={{ opacity: 0.75, cursor: "not-allowed" }}
                />
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Security & Credentials</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  Update your employee password. Leave blank if you only wish to save profile name changes.
                </p>
              </div>
              <Key size={18} color="var(--color-accent)" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-secondary)",
                      marginBottom: 6,
                    }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "1rem",
              padding: "0.5rem 0",
            }}
          >
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: "0.65rem 1.75rem", fontSize: "0.9rem" }}
            >
              {loading ? "Saving Changes..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
