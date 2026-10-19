import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  Users,
  BarChart3,
  ScrollText,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../services/api";
import NotificationDrawer from "./NotificationDrawer";

export default function AppShell() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch unread count periodically
  useEffect(() => {
    let isMounted = true;
    async function checkUnread() {
      try {
        const res = await api.getNotifications({ limit: 1 });
        if (isMounted) setUnreadNotifs(res.unread_count || 0);
      } catch (err) {
        // silent fail
      }
    }
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const adminNav = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Announcements", path: "/admin/announcements", icon: Megaphone },
    { label: "Create Announcement", path: "/admin/announcements/create", icon: PlusCircle },
    { label: "Employees", path: "/admin/employees", icon: Users },
    { label: "Analytics & Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: ScrollText },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const employeeNav = [
    { label: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
    { label: "My Announcements", path: "/employee/announcements", icon: Megaphone },
    { label: "Notifications", path: "/employee/notifications", icon: Bell },
    { label: "Profile & Settings", path: "/employee/profile", icon: Settings },
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-badge">
            <div className="brand-logo-icon">DB</div>
            <span>DB PRODUCTIONS</span>
          </div>
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="btn-icon"
              style={{ display: "md-none" }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isAdmin ? "Admin Workspace" : "Employee Portal"}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = (navActive) => {
              if (item.path === "/admin/announcements") {
                return (
                  location.pathname.startsWith("/admin/announcements") &&
                  location.pathname !== "/admin/announcements/create"
                );
              }
              if (item.path === "/admin/announcements/create") {
                return location.pathname === "/admin/announcements/create";
              }
              if (item.path.endsWith("/dashboard")) {
                return location.pathname === item.path;
              }
              return navActive;
            };

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin/announcements/create" || item.path.endsWith("/dashboard")}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-link ${isItemActive(isActive) ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: 8,
              backgroundColor: "var(--color-primary-surface)",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--color-accent-border)",
              }}
            >
              {user?.first_name ? user.first_name[0] : "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.first_name} {user?.last_name}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {user?.role} {user?.department_name ? `• ${user.department_name}` : ""}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-icon"
              style={{ display: "none" }} // Show on mobile via CSS media query
            >
              <Menu size={20} />
            </button>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  letterSpacing: "0.2px",
                }}
              >
                Announcement Management System
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Server Time: Asia/Kolkata (IST)
              </span>
            </div>
          </div>

          <div className="navbar-right">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifDrawerOpen(true)}
              className="btn-icon"
              style={{ position: "relative" }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifs > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-priority-urgent)",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
              title="Sign Out"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="page-container fade-in">
          <Outlet />
        </main>
      </div>

      {/* Slide-out notification drawer */}
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        onCountChange={(count) => setUnreadNotifs(count)}
      />
    </div>
  );
}
