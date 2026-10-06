import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Users,
  Eye,
  PlusCircle,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";
import { api } from "../../services/api";
import SummaryCard from "../../components/common/SummaryCard";
import StatusBadge from "../../components/common/StatusBadge";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [rep, readData] = await Promise.all([
          api.getAnnouncementReports(period),
          api.getReadRateReports(),
        ]);
        setData(rep);
        setDeptStats(readData.departments || []);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [period]);

  if (loading) {
    return <LoadingSpinner text="Compiling organizational analytics..." />;
  }

  const cards = data?.cards || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Header & Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.3px",
            }}
          >
            System Dashboard
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Real-time announcement lifecycle, delivery targeting, and readership metrics
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field"
            style={{ width: "auto", padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <Link to="/admin/announcements/create" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>New Announcement</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - Symmetrical 4x2 responsive layout (8 cards) */}
      <div className="kpi-grid">
        <SummaryCard
          title="Total Announcements"
          value={cards.total_announcements}
          subtitle="System-wide records"
          icon={Megaphone}
          accent={true}
        />
        <SummaryCard
          title="Published (Live)"
          value={cards.published}
          subtitle="Active on employee portals"
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Scheduled"
          value={cards.scheduled}
          subtitle="Awaiting automated release"
          icon={Clock}
        />
        <SummaryCard
          title="Drafts"
          value={cards.draft}
          subtitle="In-progress compositions"
          icon={FileText}
        />
        <SummaryCard
          title="Expired Notices"
          value={cards.expired}
          subtitle="Concluded lifecycles"
          icon={AlertTriangle}
        />
        <SummaryCard
          title="Urgent Alerts"
          value={cards.urgent}
          subtitle="High-priority announcements"
          icon={Flame}
        />
        <SummaryCard
          title="Read Rate"
          value={`${cards.overall_read_rate}%`}
          subtitle={`${cards.read_users} read of ${cards.read_users + cards.unread_users}`}
          icon={TrendingUp}
        />
        <SummaryCard
          title="Active Employees"
          value={cards.total_employees}
          subtitle="Eligible recipient base"
          icon={Users}
        />
      </div>

      {/* Analytics Visualizations: Status & Category breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Department Read Performance */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              Department Read Performance
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              Read vs Targeted
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {deptStats.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                No recipient targeting records found.
              </p>
            ) : (
              deptStats.map((dept) => (
                <div key={dept.department_id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.82rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{dept.department_name}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {dept.read_count} / {dept.total_targeted} ({dept.read_rate}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 7,
                      backgroundColor: "var(--color-secondary-surface)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${dept.read_rate}%`,
                        backgroundColor: "var(--color-accent)",
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              Announcements by Category
            </h3>
            <Layers size={16} color="var(--color-text-muted)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(!data?.categoryBreakdown || data.categoryBreakdown.length === 0) ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                No categories logged yet.
              </p>
            ) : (
              data.categoryBreakdown.map((cat) => {
                const total = cards.total_announcements || 1;
                const pct = Math.round((cat.count / total) * 100);
                return (
                  <div
                    key={cat.category}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.8rem",
                      borderRadius: 8,
                      backgroundColor: "var(--color-secondary-surface)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                        {cat.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--color-accent)",
                        }}
                      >
                        {cat.count}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Two Columns: Upcoming Scheduled & Recent Activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Upcoming Scheduled Announcements */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={18} color="var(--color-accent)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                Scheduled Queue (Automation)
              </h3>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Server Scheduler Active
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(!data?.upcomingScheduled || data.upcomingScheduled.length === 0) ? (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.85rem",
                  padding: "1rem 0",
                  textAlign: "center",
                }}
              >
                No announcements currently waiting in the schedule queue.
              </p>
            ) : (
              data.upcomingScheduled.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "0.85rem",
                    borderRadius: 8,
                    backgroundColor: "var(--color-secondary-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <Link
                      to={`/admin/announcements/${item.id}`}
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {item.title}
                    </Link>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      Releases on: {new Date(item.scheduled_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <PriorityBadge priority={item.priority} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
              Recent Audit & Lifecycle Log
            </h3>
            <Link
              to="/admin/audit-logs"
              style={{ fontSize: "0.78rem", color: "var(--color-accent)" }}
            >
              View Full History →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {(!data?.recentActivity || data.recentActivity.length === 0) ? (
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.85rem",
                  padding: "1rem 0",
                  textAlign: "center",
                }}
              >
                No lifecycle events recorded yet.
              </p>
            ) : (
              data.recentActivity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: "0.65rem 0.8rem",
                    borderRadius: 8,
                    backgroundColor: "var(--color-secondary-surface)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    <span>
                      {act.action} • {act.title}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                      {new Date(act.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                    {act.remarks || `Performed by ${act.first_name || "System"}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
