import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";
import { api } from "../../services/api";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import SummaryCard from "../../components/common/SummaryCard";

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");
  const [reportData, setReportData] = useState(null);
  const [readRateData, setReadRateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [rep, readRates] = await Promise.all([
          api.getAnnouncementReports(period),
          api.getReadRateReports(),
        ]);
        setReportData(rep);
        setReadRateData(readRates);
      } catch (err) {
        console.error("Reports loading failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [period]);

  const exportCSV = () => {
    if (!readRateData?.departments) return;
    const headers = "Department,Targeted Users,Read Count,Unread Count,Read Rate %\n";
    const rows = readRateData.departments
      .map(
        (d) =>
          `"${d.department_name}",${d.total_targeted},${d.read_count},${d.unread_count},${d.read_rate}%`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ams-read-rate-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingSpinner text="Generating analytical intelligence report..." />;
  }

  const cards = reportData?.cards || {};
  const departments = readRateData?.departments || [];
  const announcements = readRateData?.announcements || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
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
          <h1 style={{ fontSize: "1.65rem", fontWeight: 700 }}>
            Organizational Reports & Read Analytics
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Period-based delivery intelligence, department engagement comparisons, and read benchmarks
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field"
            style={{ width: "auto" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="kpi-grid">
        <SummaryCard
          title="Overall Read Rate"
          value={`${cards.overall_read_rate || 0}%`}
          subtitle={`${cards.read_users || 0} read out of ${cards.read_users + cards.unread_users} delivered`}
          icon={TrendingUp}
          accent={true}
        />
        <SummaryCard
          title="Total Deliveries"
          value={cards.read_users + cards.unread_users}
          subtitle="Recipients targeted in period"
          icon={Users}
        />
        <SummaryCard
          title="Published Notices"
          value={cards.published || 0}
          subtitle="Live notices"
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Urgent Notices"
          value={cards.urgent || 0}
          subtitle="Critical priority broadcast"
          icon={Flame}
        />
      </div>

      {/* Breakdown Grids */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Department-wise Comparison Table */}
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
            Department Read Benchmark
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Targeted</th>
                  <th>Read</th>
                  <th>Read Rate</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.department_id}>
                    <td style={{ fontWeight: 600 }}>{d.department_name}</td>
                    <td>{d.total_targeted}</td>
                    <td>{d.read_count}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            height: 6,
                            width: 70,
                            backgroundColor: "var(--color-secondary-surface)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${d.read_rate}%`,
                              backgroundColor: "var(--color-accent)",
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: "var(--color-accent)", fontSize: "0.82rem" }}>
                          {d.read_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Announcement Performance Leaderboard */}
        <div className="card">
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
            Top Read Announcements
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Category</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {new Date(a.published_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "var(--color-secondary-surface)" }}>
                        {a.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                        {a.read_rate}%
                      </span>{" "}
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        ({a.read_count}/{a.total_recipients})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
