import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PlusCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Send,
  Ban,
  Archive,
  Paperclip,
  CheckCircle,
} from "lucide-react";
import { api } from "../../services/api";
import StatusBadge from "../../components/common/StatusBadge";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const navigate = useNavigate();

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.getAnnouncements(params);
      setAnnouncements(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [statusFilter, categoryFilter, priorityFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAnnouncements();
  };

  const handlePublishNow = async (id) => {
    if (!window.confirm("Are you sure you want to immediately publish this announcement to targeted employees?")) return;
    try {
      setActionLoading(id);
      await api.publishAnnouncement(id);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to publish announcement");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt("Enter cancellation reason (optional):");
    if (reason === null) return;
    try {
      setActionLoading(id);
      await api.cancelAnnouncement(id, reason);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to cancel announcement");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Archive this announcement to historical records?")) return;
    try {
      setActionLoading(id);
      await api.archiveAnnouncement(id);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to archive");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this draft announcement?")) return;
    try {
      setActionLoading(id);
      await api.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const statusTabs = ["ALL", "PUBLISHED", "SCHEDULED", "DRAFT", "EXPIRED", "CANCELLED", "ARCHIVED"];

  const categories = [
    "ALL",
    "Holiday",
    "Meeting",
    "Training",
    "Policy",
    "Emergency",
    "Maintenance",
    "Celebration",
    "Department Update",
    "General",
    "Instructions",
  ];

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
            Announcements Directory
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
            Create, target, schedule, publish, track, and manage all organization notices
          </p>
        </div>

        <Link to="/admin/announcements/create" className="btn btn-primary">
          <PlusCircle size={16} />
          <span>New Announcement</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.35rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className="btn"
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.82rem",
              borderRadius: "6px 6px 0 0",
              backgroundColor: statusFilter === tab ? "var(--color-primary-surface)" : "transparent",
              color: statusFilter === tab ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottom: statusFilter === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
              fontWeight: statusFilter === tab ? 700 : 500,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", flex: "1 1 280px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Search announcements by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.3rem" }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="input-field"
            style={{ width: "auto" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="input-field"
            style={{ width: "auto" }}
          >
            <option value="ALL">All Priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Fetching announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No announcements found"
          description="Try clearing your filters or create a new announcement."
          action={
            <Link to="/admin/announcements/create" className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Create Announcement</span>
            </Link>
          }
        />
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title & Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Targeting & Read Rate</th>
                <th>Schedule / Published</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((ann) => (
                <tr key={ann.id}>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Link
                        to={`/admin/announcements/${ann.id}`}
                        style={{
                          fontWeight: 600,
                          fontSize: "0.92rem",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {ann.title}
                      </Link>
                      {ann.attachment_count > 0 && (
                        <span title={`${ann.attachment_count} attachment(s)`} style={{ color: "var(--color-accent)" }}>
                          <Paperclip size={14} />
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {ann.category} • by {ann.author_first_name} {ann.author_last_name}
                    </div>
                  </td>
                  <td>
                    <PriorityBadge priority={ann.priority} />
                  </td>
                  <td>
                    <StatusBadge status={ann.status} />
                  </td>
                  <td>
                    {ann.total_recipients > 0 ? (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {ann.read_count} / {ann.total_recipients} read
                          </span>
                          <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>
                            {ann.read_rate_percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            width: 120,
                            backgroundColor: "var(--color-secondary-surface)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${ann.read_rate_percentage}%`,
                              backgroundColor: "var(--color-accent)",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                        {ann.status === "DRAFT" ? "Not yet published" : "No recipients"}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    {ann.published_at ? (
                      <div>
                        Pub: {new Date(ann.published_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    ) : ann.scheduled_at ? (
                      <div>
                        Sched: {new Date(ann.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>None</span>
                    )}
                    {ann.expires_at && (
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        Exp: {new Date(ann.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
                      <Link
                        to={`/admin/announcements/${ann.id}`}
                        className="btn-icon"
                        title="View Details & Read Tracking"
                      >
                        <Eye size={15} />
                      </Link>

                      {["DRAFT", "SCHEDULED"].includes(ann.status) && (
                        <button
                          onClick={() => handlePublishNow(ann.id)}
                          className="btn-icon"
                          title="Publish Now"
                          style={{ color: "var(--color-status-published)" }}
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {["PUBLISHED", "SCHEDULED"].includes(ann.status) && (
                        <button
                          onClick={() => handleCancel(ann.id)}
                          className="btn-icon"
                          title="Cancel Announcement"
                          style={{ color: "var(--color-status-cancelled)" }}
                        >
                          <Ban size={15} />
                        </button>
                      )}

                      {["PUBLISHED", "EXPIRED"].includes(ann.status) && (
                        <button
                          onClick={() => handleArchive(ann.id)}
                          className="btn-icon"
                          title="Archive Announcement"
                        >
                          <Archive size={15} />
                        </button>
                      )}

                      {["DRAFT", "CANCELLED", "ARCHIVED"].includes(ann.status) && (
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="btn-icon"
                          title="Delete"
                          style={{ color: "var(--color-priority-urgent)" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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
          <span
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
            }}
          >
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
