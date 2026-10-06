import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Paperclip, ChevronRight } from "lucide-react";
import { api } from "../../services/api";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner, EmptyState } from "../../components/common/LoadingSpinner";

export default function MyAnnouncementsList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12, filter };
      if (category !== "ALL") params.category = category;
      if (search.trim()) params.search = search.trim();

      const res = await api.getMyAnnouncements(params);
      setData(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error("Failed to load employee announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [filter, category, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAnnouncements();
  };

  const tabs = [
    { label: "All Targeted", val: "ALL" },
    { label: "Unread", val: "UNREAD" },
    { label: "Read", val: "READ" },
    { label: "Urgent", val: "URGENT" },
  ];

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
      <div>
        <h1 style={{ fontSize: "1.65rem", fontWeight: 700 }}>
          My Announcements
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
          Notices, policy directives, and organizational updates targeted to your profile
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.val}
            onClick={() => {
              setFilter(t.val);
              setPage(1);
            }}
            className="btn"
            style={{
              padding: "0.45rem 1rem",
              fontSize: "0.85rem",
              borderRadius: "6px 6px 0 0",
              backgroundColor: filter === t.val ? "var(--color-primary-surface)" : "transparent",
              color: filter === t.val ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottom: filter === t.val ? "2px solid var(--color-accent)" : "2px solid transparent",
              fontWeight: filter === t.val ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search and Category toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", flex: "1 1 280px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Search announcements..."
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
                transform: "translateY(-50)",
                color: "var(--color-text-muted)",
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
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
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner text="Fetching announcements..." />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No notices found"
          description="You do not have any announcements matching the chosen filter."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {data.map((item) => (
            <Link
              key={item.id}
              to={`/employee/announcements/${item.id}`}
              style={{
                display: "block",
                padding: "1.25rem 1.5rem",
                borderRadius: 12,
                backgroundColor: "var(--color-primary-surface)",
                border: `1px solid ${
                  item.read_status === "UNREAD"
                    ? "var(--color-accent-border)"
                    : "var(--color-border)"
                }`,
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {item.read_status === "UNREAD" && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-accent)",
                      }}
                      title="Unread"
                    />
                  )}
                  <span
                    className="badge"
                    style={{
                      backgroundColor: "var(--color-secondary-surface)",
                      fontSize: "0.72rem",
                    }}
                  >
                    {item.category}
                  </span>
                  <PriorityBadge priority={item.priority} />
                  {item.attachment_count > 0 && (
                    <span title="Contains attachments" style={{ color: "var(--color-accent)" }}>
                      <Paperclip size={14} />
                    </span>
                  )}
                </div>

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
              </div>

              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: item.read_status === "UNREAD" ? 700 : 600,
                  color: "var(--color-text-primary)",
                  marginBottom: "0.4rem",
                }}
              >
                {item.title}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.78rem",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>
                  Published {new Date(item.published_at).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  • by {item.author_first_name} {item.author_last_name}
                </span>

                <span style={{ color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 3 }}>
                  <span>Read Notice</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
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
