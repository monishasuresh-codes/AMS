import React, { useEffect, useState } from "react";
import { ScrollText, Filter, Search, User, ShieldAlert } from "lucide-react";
import { api } from "../../services/api";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 25 };
      if (actionFilter !== "ALL") params.action = actionFilter;
      const res = await api.getAuditLogs(params);
      setLogs(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
            Audit Log & System Traceability
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Immutable chronological record of administrator modifications and automated lifecycle transitions
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="input-field"
          style={{ width: "auto" }}
        >
          <option value="ALL">All Actions</option>
          <option value="ANNOUNCEMENT_PUBLISHED">Announcement Published</option>
          <option value="ANNOUNCEMENT_SCHEDULED">Announcement Scheduled</option>
          <option value="ANNOUNCEMENT_AUTO_PUBLISHED">Scheduler Auto-Published</option>
          <option value="ANNOUNCEMENT_AUTO_EXPIRED">Scheduler Auto-Expired</option>
          <option value="ANNOUNCEMENT_CANCELLED">Announcement Cancelled</option>
          <option value="ANNOUNCEMENT_ARCHIVED">Announcement Archived</option>
          <option value="USER_CREATED">User Created</option>
          <option value="USER_DEACTIVATED">User Deactivated</option>
          <option value="USER_ACTIVATED">User Activated</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving immutable audit trail..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries found"
          description="Actions will appear here as administrative events occur."
        />
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp (Server)</th>
                <th>Action</th>
                <th>Actor (User)</th>
                <th>Entity Target</th>
                <th>Remarks / Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                    {new Date(log.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "var(--color-secondary-surface)",
                        color: "var(--color-accent)",
                        border: "1px solid var(--color-accent-border)",
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {log.first_name ? `${log.first_name} ${log.last_name}` : "Server Scheduler"}
                    </div>
                    {log.employee_code && (
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {log.employee_code} ({log.role})
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                      {log.entity_type} #{log.entity_id || "N/A"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", maxWidth: 350 }}>
                    {log.remarks || (log.new_values ? JSON.stringify(log.new_values) : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
          >
            Previous
          </button>
          <span style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
