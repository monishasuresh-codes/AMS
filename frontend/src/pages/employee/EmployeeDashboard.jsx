import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  BookOpen,
  Paperclip,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import SummaryCard from "../../components/common/SummaryCard";
import StatusBadge from "../../components/common/StatusBadge";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        const res = await api.getMyAnnouncements({ limit: 10 });
        setData(res.data || []);
        setStats(res.stats || {});
      } catch (err) {
        console.error("Failed to load employee announcements:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Retrieving targeted organizational announcements..." />;
  }

  const urgentUnread = data.filter(
    (a) => a.priority === "URGENT" && a.read_status === "UNREAD"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary-surface), var(--color-secondary-surface))",
          border: "1px solid var(--color-accent-border)",
          padding: "1.75rem 2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.82rem", color: "var(--color-accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Employee Portal • {user?.department_name || "Staff"}
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>
              Welcome back, {user?.first_name}!
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
              Employee Code: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-text-primary)" }}>{user?.employee_code}</span>
            </p>
          </div>

          <Link to="/employee/announcements" className="btn btn-primary">
            <span>View All Notices</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="kpi-grid kpi-grid-3">
        <SummaryCard
          title="Unread Notices"
          value={stats.unread_count || 0}
          subtitle="Awaiting your review"
          icon={Bell}
          accent={stats.unread_count > 0}
        />
        <SummaryCard
          title="Total Received"
          value={stats.total_received || 0}
          subtitle="Targeted to your profile"
          icon={BookOpen}
        />
        <SummaryCard
          title="Urgent Notices"
          value={stats.urgent_unread_count || 0}
          subtitle="Immediate action required"
          icon={Flame}
        />
      </div>

      {/* Urgent Alert Banner if any */}
      {urgentUnread.length > 0 && (
        <div
          style={{
            padding: "1.25rem",
            borderRadius: 12,
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#EF4444", fontWeight: 700 }}>
            <Flame size={20} />
            <span>Urgent Attention Required</span>
          </div>

          {urgentUnread.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                backgroundColor: "var(--color-primary-surface)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                  {u.title}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Published: {new Date(u.published_at).toLocaleString()}
                </div>
              </div>
              <Link
                to={`/employee/announcements/${u.id}`}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.8rem",
                  padding: "0.4rem 0.8rem",
                  color: "#EF4444",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                Read Now →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Recent Targeted Notices Feed */}
      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Recent Notices
          </h3>
          <Link
            to="/employee/announcements"
            style={{ fontSize: "0.82rem", color: "var(--color-accent)", fontWeight: 600 }}
          >
            See Full History →
          </Link>
        </div>

        {data.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="You're all caught up!"
            description="No announcements currently targeted to you."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {data.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "1.15rem",
                  borderRadius: 10,
                  backgroundColor: "var(--color-secondary-surface)",
                  border: `1px solid ${
                    item.read_status === "UNREAD"
                      ? "var(--color-accent-border)"
                      : "transparent"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  {item.read_status === "UNREAD" ? (
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-accent)",
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                      title="Unread"
                    />
                  ) : (
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: "transparent",
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "var(--color-primary-surface)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {item.category}
                      </span>
                      <PriorityBadge priority={item.priority} />
                      {item.attachment_count > 0 && (
                        <span title="Contains attachments" style={{ color: "var(--color-accent)" }}>
                          <Paperclip size={13} />
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/employee/announcements/${item.id}`}
                      style={{
                        fontWeight: item.read_status === "UNREAD" ? 700 : 600,
                        fontSize: "0.95rem",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {item.title}
                    </Link>

                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      Published {new Date(item.published_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      • by {item.author_first_name} {item.author_last_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor:
                        item.read_status === "READ"
                          ? "rgba(16, 185, 129, 0.12)"
                          : "rgba(234, 179, 8, 0.12)",
                      color:
                        item.read_status === "READ"
                          ? "var(--color-status-published)"
                          : "var(--color-priority-important)",
                    }}
                  >
                    {item.read_status === "READ" ? "READ" : "UNREAD"}
                  </span>

                  <Link
                    to={`/employee/announcements/${item.id}`}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    Read
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
