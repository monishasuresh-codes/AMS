import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Ban,
  Archive,
  Trash2,
  Calendar,
  Users,
  Paperclip,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Search,
  Download,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { api, UPLOADS_BASE } from "../../services/api";
import StatusBadge from "../../components/common/StatusBadge";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export default function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [announcement, setAnnouncement] = useState(null);
  const [targets, setTargets] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [stats, setStats] = useState({});
  const [history, setHistory] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Recipient filtering
  const [recipientFilter, setRecipientFilter] = useState("ALL");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  // Employee Queries State
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryMessages, setQueryMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getAnnouncementById(id);
      setAnnouncement(res.announcement);
      setTargets(res.targets || []);
      setAttachments(res.attachments || []);
      setStats(res.stats || {});
      setHistory(res.history || []);
    } catch (err) {
      console.error("Failed to load announcement details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      setRecipientsLoading(true);
      const res = await api.getAnnouncementRecipients(id, {
        read_status: recipientFilter,
        search: recipientSearch,
        limit: 100,
      });
      setRecipients(res.data || []);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const fetchQueries = async () => {
    try {
      const res = await api.getAnnouncementQueries(id);
      const qList = res.queries || [];
      setQueries(qList);
      if (qList.length > 0 && !selectedQuery) {
        setSelectedQuery(qList[0]);
      }
    } catch (err) {
      console.error("Failed to fetch queries:", err);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchQueries();
  }, [id]);

  useEffect(() => {
    if (announcement) {
      fetchRecipients();
    }
  }, [id, recipientFilter, recipientSearch, announcement?.status]);

  useEffect(() => {
    if (selectedQuery) {
      async function loadThread() {
        try {
          setLoadingMessages(true);
          const res = await api.getQueryMessages(selectedQuery.id);
          setQueryMessages(res.messages || []);
        } catch (err) {
          console.error("Failed to load query messages:", err);
        } finally {
          setLoadingMessages(false);
        }
      }
      loadThread();
    }
  }, [selectedQuery?.id]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedQuery) return;
    try {
      setSendingReply(true);
      const res = await api.replyQuery(selectedQuery.id, {
        message: replyText.trim(),
      });
      setQueryMessages((prev) => [...prev, res.newMessage]);
      setReplyText("");
      fetchQueries();
    } catch (err) {
      alert(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleQueryStatus = async () => {
    if (!selectedQuery) return;
    const newStatus = selectedQuery.status === "RESOLVED" ? "OPEN" : "RESOLVED";
    try {
      await api.updateQueryStatus(selectedQuery.id, newStatus);
      setSelectedQuery((prev) => ({ ...prev, status: newStatus }));
      setQueries((prev) =>
        prev.map((q) => (q.id === selectedQuery.id ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      alert(err.message || "Failed to update query status");
    }
  };

  const handlePublishNow = async () => {
    if (!window.confirm("Publish this announcement now to all targeted recipients?")) return;
    try {
      setActionLoading(true);
      await api.publishAnnouncement(id);
      fetchDetails();
    } catch (err) {
      alert(err.message || "Publish failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return;
    try {
      setActionLoading(true);
      await api.cancelAnnouncement(id, reason);
      fetchDetails();
    } catch (err) {
      alert(err.message || "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this announcement?")) return;
    try {
      setActionLoading(true);
      await api.archiveAnnouncement(id);
      fetchDetails();
    } catch (err) {
      alert(err.message || "Archive failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this announcement record?")) return;
    try {
      setActionLoading(true);
      await api.deleteAnnouncement(id);
      navigate("/admin/announcements");
    } catch (err) {
      alert(err.message || "Deletion failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading announcement intelligence..." />;
  }

  if (!announcement) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Announcement not found</h3>
        <Link to="/admin/announcements" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Bar Navigation & Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link to="/admin/announcements" className="btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: 4 }}>
              <StatusBadge status={announcement.status} />
              <PriorityBadge priority={announcement.priority} />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                {announcement.category}
              </span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {announcement.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {["DRAFT", "SCHEDULED"].includes(announcement.status) && (
            <button
              onClick={handlePublishNow}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              <Send size={15} />
              <span>Publish Now</span>
            </button>
          )}

          {["PUBLISHED", "SCHEDULED"].includes(announcement.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="btn btn-danger"
            >
              <Ban size={15} />
              <span>Cancel</span>
            </button>
          )}

          {["PUBLISHED", "EXPIRED"].includes(announcement.status) && (
            <button
              onClick={handleArchive}
              disabled={actionLoading}
              className="btn btn-secondary"
            >
              <Archive size={15} />
              <span>Archive</span>
            </button>
          )}

          {["DRAFT", "CANCELLED", "ARCHIVED"].includes(announcement.status) && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="btn btn-secondary"
              style={{ color: "var(--color-priority-urgent)" }}
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Content (Left) & Metadata / Metrics (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: "1.5rem",
        }}
      >
        {/* Left Column: Announcement Details & Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h3
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "1rem",
              }}
            >
              Announcement Content
            </h3>
            <div
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.7,
                color: "var(--color-text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {announcement.description}
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div
                style={{
                  marginTop: "2rem",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--color-text-secondary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Attachments ({attachments.length})
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  {attachments.map((file) => (
                    <a
                      key={file.id}
                      href={`${UPLOADS_BASE}/${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.55rem 0.85rem",
                        borderRadius: 8,
                        backgroundColor: "var(--color-secondary-surface)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.82rem",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <Paperclip size={15} color="var(--color-accent)" />
                      <span>{file.file_name}</span>
                      <Download size={14} color="var(--color-text-muted)" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recipient Read Tracking Table */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                  Recipient Delivery & Read Tracking
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  Per-employee receipt and timestamp verification
                </p>
              </div>

              {/* Filter controls */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  className="input-field"
                  style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                >
                  <option value="ALL">All Recipients</option>
                  <option value="READ">Read Only</option>
                  <option value="UNREAD">Unread Only</option>
                </select>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search recipient..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="input-field"
                    style={{ width: 180, padding: "0.4rem 0.75rem 0.4rem 2rem", fontSize: "0.82rem" }}
                  />
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: "0.6rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                </div>
              </div>
            </div>

            {recipientsLoading ? (
              <LoadingSpinner text="Loading recipients..." />
            ) : recipients.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: "0.88rem",
                }}
              >
                No recipient records matching criteria.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Read Status</th>
                      <th>Read Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {r.first_name} {r.last_name}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                            {r.employee_code} • {r.email}
                          </div>
                        </td>
                        <td>{r.department_name || "N/A"}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                r.read_status === "READ"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "rgba(234, 179, 8, 0.15)",
                              color:
                                r.read_status === "READ"
                                  ? "var(--color-status-published)"
                                  : "var(--color-priority-important)",
                              border:
                                r.read_status === "READ"
                                  ? "1px solid rgba(16, 185, 129, 0.3)"
                                  : "1px solid rgba(234, 179, 8, 0.3)",
                            }}
                          >
                            {r.read_status === "READ" ? "READ" : "UNREAD"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                          {r.read_at
                            ? new Date(r.read_at).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Employee Inquiries & 1-on-1 Messaging Section */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: "var(--color-accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                  }}
                >
                  <MessageSquare size={17} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    Employee Inquiries & Direct Messaging
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    1-on-1 question threads and communication with targeted employees
                  </p>
                </div>
              </div>

              <span
                className="badge"
                style={{
                  backgroundColor: "var(--color-secondary-surface)",
                  color: "var(--color-text-primary)",
                }}
              >
                {queries.length} Inquir{queries.length === 1 ? "y" : "ies"}
              </span>
            </div>

            {queries.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "var(--color-text-muted)",
                  backgroundColor: "var(--color-secondary-surface)",
                  borderRadius: 10,
                }}
              >
                <MessageSquare size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--color-text-primary)" }}>
                  No Employee Inquiries Yet
                </p>
                <p style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  When targeted employees ask questions regarding this announcement, their direct 1-on-1 message threads will appear here for you to respond.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1fr) minmax(320px, 2fr)",
                  gap: "1rem",
                  backgroundColor: "var(--color-secondary-surface)",
                  borderRadius: 10,
                  padding: "0.75rem",
                  minHeight: 380,
                }}
              >
                {/* Left: Employee Query Threads List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    borderRight: "1px solid var(--color-border)",
                    paddingRight: "0.75rem",
                    overflowY: "auto",
                    maxHeight: 460,
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", paddingBottom: 4 }}>
                    Employee Threads
                  </div>
                  {queries.map((q) => {
                    const isSelected = selectedQuery?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuery(q)}
                        style={{
                          padding: "0.75rem",
                          borderRadius: 8,
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "var(--color-primary-surface)"
                            : "transparent",
                          border: isSelected
                            ? "1px solid var(--color-accent)"
                            : "1px solid transparent",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
                            {q.first_name} {q.last_name}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: "0.68rem",
                              padding: "0.15rem 0.45rem",
                              backgroundColor:
                                q.status === "RESOLVED"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "rgba(234, 179, 8, 0.15)",
                              color:
                                q.status === "RESOLVED"
                                  ? "var(--color-status-published)"
                                  : "var(--color-priority-important)",
                            }}
                          >
                            {q.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
                          {q.employee_code} • {q.department_name || "General"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--color-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {q.last_message || "New query thread"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Active 1-on-1 Conversation Thread */}
                {selectedQuery ? (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                    {/* Thread Top Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: "0.6rem",
                        marginBottom: "0.6rem",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
                          {selectedQuery.first_name} {selectedQuery.last_name} ({selectedQuery.employee_code})
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                          {selectedQuery.department_name} • {selectedQuery.email}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleQueryStatus}
                        className="btn btn-secondary"
                        style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                      >
                        {selectedQuery.status === "RESOLVED" ? "Re-open Thread" : "Mark Resolved"}
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        maxHeight: 280,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        paddingRight: "0.4rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {loadingMessages ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                          Loading thread...
                        </div>
                      ) : queryMessages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                          No messages in this thread yet.
                        </div>
                      ) : (
                        queryMessages.map((m) => {
                          const isAdmin = m.role === "ADMIN";
                          return (
                            <div
                              key={m.id}
                              style={{
                                alignSelf: isAdmin ? "flex-end" : "flex-start",
                                maxWidth: "80%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: isAdmin ? "flex-end" : "flex-start",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  color: "var(--color-text-muted)",
                                  marginBottom: 2,
                                }}
                              >
                                {isAdmin ? "You (Admin)" : `${m.first_name} ${m.last_name}`} •{" "}
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div
                                style={{
                                  padding: "0.6rem 0.85rem",
                                  borderRadius: 10,
                                  borderBottomRightRadius: isAdmin ? 2 : 10,
                                  borderBottomLeftRadius: !isAdmin ? 2 : 10,
                                  backgroundColor: isAdmin
                                    ? "var(--color-accent-subtle)"
                                    : "var(--color-primary-surface)",
                                  border: isAdmin
                                    ? "1px solid var(--color-accent-border)"
                                    : "1px solid var(--color-border)",
                                  fontSize: "0.85rem",
                                  lineHeight: 1.5,
                                  color: "var(--color-text-primary)",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {m.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Admin Reply Form */}
                    <form onSubmit={handleSendReply} style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        required
                        placeholder={`Reply directly to ${selectedQuery.first_name}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="input-field"
                        style={{ fontSize: "0.85rem", padding: "0.55rem 0.75rem" }}
                      />
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="btn btn-primary"
                        style={{ padding: "0.55rem 1rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                      >
                        <Send size={14} />
                        <span>{sendingReply ? "Sending..." : "Reply"}</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", margin: "auto", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    Select an employee thread on the left to view the messages.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key Stats, Targeting, Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Read Rate Metric Card */}
          <div className="card">
            <h4
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.85rem",
              }}
            >
              Audience Engagement
            </h4>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 800,
                  color: "var(--color-accent)",
                  lineHeight: 1,
                }}
              >
                {stats.read_rate_percentage || 0}%
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                Readership rate
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 8,
                backgroundColor: "var(--color-secondary-surface)",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${stats.read_rate_percentage || 0}%`,
                  backgroundColor: "var(--color-accent)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                fontSize: "0.82rem",
              }}
            >
              <div
                style={{
                  padding: "0.6rem",
                  borderRadius: 6,
                  backgroundColor: "var(--color-secondary-surface)",
                }}
              >
                <div style={{ color: "var(--color-text-muted)" }}>Total Targeted</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  {stats.total_recipients || 0}
                </div>
              </div>
              <div
                style={{
                  padding: "0.6rem",
                  borderRadius: 6,
                  backgroundColor: "var(--color-secondary-surface)",
                }}
              >
                <div style={{ color: "var(--color-text-muted)" }}>Read Count</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-status-published)" }}>
                  {stats.read_count || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Targeting & Timestamps */}
          <div className="card">
            <h4
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "1rem",
              }}
            >
              Targeting & Timestamps
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
              <div>
                <span style={{ color: "var(--color-text-muted)", display: "block" }}>
                  Target Audience
                </span>
                <span style={{ fontWeight: 600 }}>
                  {targets.length === 0
                    ? "All Employees"
                    : targets.map((t) => t.department_name || t.first_name || t.target_type).join(", ")}
                </span>
              </div>

              <div>
                <span style={{ color: "var(--color-text-muted)", display: "block" }}>
                  Published Date
                </span>
                <span style={{ fontWeight: 600 }}>
                  {announcement.published_at
                    ? new Date(announcement.published_at).toLocaleString()
                    : "Not published yet"}
                </span>
              </div>

              {announcement.scheduled_at && (
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>
                    Scheduled Release
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--color-status-scheduled)" }}>
                    {new Date(announcement.scheduled_at).toLocaleString()}
                  </span>
                </div>
              )}

              {announcement.expires_at && (
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>
                    Expiration Date
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--color-priority-urgent)" }}>
                    {new Date(announcement.expires_at).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <span style={{ color: "var(--color-text-muted)", display: "block" }}>
                  Created By
                </span>
                <span style={{ fontWeight: 600 }}>
                  {announcement.author_first_name} {announcement.author_last_name} ({announcement.author_email})
                </span>
              </div>
            </div>
          </div>

          {/* Lifecycle Audit Timeline */}
          <div className="card">
            <h4
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "1rem",
              }}
            >
              Lifecycle Timeline
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    paddingLeft: "0.75rem",
                    borderLeft: "2px solid var(--color-accent)",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {h.action}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {h.remarks || `By ${h.first_name || "System"}`}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.72rem", marginTop: 2 }}>
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
