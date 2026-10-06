import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  CheckCheck,
  Bell,
  ChevronRight,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function NotificationDrawer({ isOpen, onClose, onCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Fetch unread notifications only; once read they are discarded
      const res = await api.getNotifications({ limit: 30, unread_only: "1" });
      setNotifications(res.notifications || []);
      if (onCountChange) {
        onCountChange(res.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      // Discard all read notifications from view
      setNotifications([]);
      if (onCountChange) onCountChange(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // 1. Immediately discard from the list so user doesn't see it again once read
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    if (onCountChange) {
      onCountChange((prev) => Math.max(0, prev - 1));
    }

    // 2. Call backend to mark read
    try {
      await api.markNotificationRead(notif.id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }

    // 3. Close the notification popover
    onClose();

    // 4. Open the announcement
    if (notif.announcement_id) {
      if (user?.role === "ADMIN") {
        navigate(`/admin/announcements/${notif.announcement_id}`);
      } else {
        navigate(`/employee/announcements/${notif.announcement_id}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Click-outside dismiss backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(1px)",
          zIndex: 90,
        }}
      />

      {/* Floating Notification Panel: Occupies half of screen length (50vh) with inline scroll */}
      <div
        className="fade-in"
        style={{
          position: "fixed",
          top: 68,
          right: 20,
          width: 420,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "50vh",
          height: "auto",
          backgroundColor: "var(--color-primary-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: "0.85rem 1.15rem",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-secondary-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Bell size={17} color="var(--color-accent)" />
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: 12,
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                }}
              >
                {notifications.length}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Discard all read notifications"
                className="btn btn-secondary"
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <CheckCheck size={14} />
                <span>Discard all</span>
              </button>
            )}
            <button onClick={onClose} className="btn-icon" style={{ padding: "0.3rem" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Notification List: Half screen length with inline scroll */}
        <div
          style={{
            flex: 1,
            maxHeight: "calc(50vh - 58px)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "0.65rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {loading ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              Fetching latest notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <Bell size={28} style={{ margin: "0 auto 0.6rem", opacity: 0.35 }} />
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)" }}>All caught up!</p>
              <p style={{ fontSize: "0.78rem", marginTop: 4 }}>
                {user?.role === "ADMIN"
                  ? "No new announcement broadcasts or employee inquiries."
                  : "No new announcement notifications."}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isQuery = notif.type === "QUERY_MESSAGE" || notif.type === "QUERY_REPLY";
              const Icon = isQuery ? MessageSquare : Megaphone;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  title="Click to open announcement"
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: 10,
                    backgroundColor: "var(--color-secondary-surface)",
                    border: "1px solid var(--color-border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: isQuery ? "rgba(59, 130, 246, 0.15)" : "var(--color-accent-subtle)",
                      color: isQuery ? "#3B82F6" : "var(--color-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.2rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "var(--color-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          paddingRight: "0.5rem",
                        }}
                      >
                        {notif.title}
                      </div>

                      {notif.priority && notif.priority !== "NORMAL" && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "0.1rem 0.4rem",
                            borderRadius: 4,
                            backgroundColor:
                              notif.priority === "URGENT"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(234, 179, 8, 0.15)",
                            color:
                              notif.priority === "URGENT"
                                ? "var(--color-priority-urgent)"
                                : "var(--color-priority-important)",
                          }}
                        >
                          {notif.priority}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.35,
                        marginBottom: "0.35rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {notif.message}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span>
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "var(--color-accent)",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                        }}
                      >
                        <span>Open Notice</span>
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
