import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, Megaphone, Check } from "lucide-react";
import { api } from "../../services/api";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function EmployeeNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Fetch unread notifications only; once read they are discarded
      const res = await api.getNotifications({ limit: 50, unread_only: "1" });
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      // Discard all read notifications from view
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // 1. Immediately discard from view
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));

    // 2. Mark read on backend
    try {
      await api.markNotificationRead(notif.id);
    } catch (err) {
      console.error(err);
    }

    // 3. Open the announcement
    if (notif.announcement_id) {
      navigate(`/employee/announcements/${notif.announcement_id}`);
    }
  };

  const handleDiscard = async (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.markNotificationRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
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
            In-App Notifications
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Direct broadcast alerts and announcement delivery notices. Read notices are automatically discarded.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <CheckCheck size={16} />
            <span>Discard All</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching active notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up!"
          description="You have no pending unread notifications. New announcement broadcasts will appear here."
        />
      ) : (
        /* Card Container with inline scroll for large number of notifications */
        <div
          className="card"
          style={{
            padding: "0.75rem",
            maxHeight: "65vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              title="Click to open announcement"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderRadius: 10,
                backgroundColor: "var(--color-secondary-surface)",
                border: "1px solid var(--color-border)",
                cursor: "pointer",
                gap: "1rem",
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
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "var(--color-accent-subtle)",
                    color: "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Megaphone size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                      {notif.title}
                    </span>
                    {notif.priority && notif.priority !== "NORMAL" && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.45rem",
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

                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                    {notif.message}
                  </div>

                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 6 }}>
                    {new Date(notif.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => handleDiscard(e, notif.id)}
                  title="Discard notification"
                  className="btn btn-secondary"
                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                >
                  Discard
                </button>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    color: "var(--color-accent)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                  }}
                >
                  <span>Open</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
