import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  User,
  Paperclip,
  CheckCircle,
  Download,
  AlertCircle,
  Clock,
  MessageSquare,
  Send,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { api, UPLOADS_BASE } from "../../services/api";
import PriorityBadge from "../../components/common/PriorityBadge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export default function EmployeeAnnouncementDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query & Messaging State
  const [query, setQuery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        setLoading(true);
        // Backend automatically updates read_status to 'READ' and timestamps server-side
        const [res, qRes] = await Promise.all([
          api.getMyAnnouncementById(id),
          api.getMyAnnouncementQuery(id).catch(() => ({ query: null, messages: [] })),
        ]);
        setData(res.announcement);
        setAttachments(res.attachments || []);
        setQuery(qRes.query);
        setMessages(qRes.messages || []);
      } catch (err) {
        setError(err.message || "Failed to load announcement");
      } finally {
        setLoading(false);
      }
    }
    loadAnnouncement();
  }, [id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      if (!query) {
        const res = await api.sendEmployeeQuery(id, {
          message: newMessage.trim(),
          subject: `Inquiry on: ${data.title}`,
        });
        setQuery({ id: res.queryId, status: "OPEN" });
        setMessages([res.newMessage]);
      } else {
        const res = await api.replyQuery(query.id, {
          message: newMessage.trim(),
        });
        setMessages((prev) => [...prev, res.newMessage]);
      }
      setNewMessage("");
    } catch (err) {
      alert(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Opening announcement & registering read status..." />;
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 600, margin: "2rem auto", textAlign: "center" }}>
        <AlertCircle size={32} color="#EF4444" style={{ margin: "0 auto 1rem" }} />
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Announcement Unavailable
        </h3>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
          {error || "This announcement is either not targeted to your account or has expired."}
        </p>
        <Link to="/employee/announcements" className="btn btn-primary">
          Back to My Announcements
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Back button & Read State confirmation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <Link to="/employee/announcements" className="btn btn-secondary" style={{ display: "inline-flex", gap: "0.5rem" }}>
          <ArrowLeft size={16} />
          <span>Back to Feed</span>
        </Link>

        {/* Server read confirmation pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            borderRadius: 9999,
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "var(--color-status-published)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle size={15} />
          <span>
            Read Confirmed • {data.read_at ? new Date(data.read_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Just now"}
          </span>
        </div>
      </div>

      {/* Main Announcement Card */}
      <div className="card" style={{ padding: "2rem" }}>
        {/* Header Tags */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span
            className="badge"
            style={{
              backgroundColor: "var(--color-secondary-surface)",
              color: "var(--color-text-primary)",
            }}
          >
            {data.category}
          </span>
          <PriorityBadge priority={data.priority} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "1.85rem",
            fontWeight: 800,
            color: "var(--color-text-primary)",
            lineHeight: 1.3,
            marginBottom: "1rem",
          }}
        >
          {data.title}
        </h1>

        {/* Meta Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "1.5rem",
            padding: "0.85rem 1rem",
            borderRadius: 8,
            backgroundColor: "var(--color-secondary-surface)",
            fontSize: "0.82rem",
            color: "var(--color-text-secondary)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={15} color="var(--color-accent)" />
            <span>
              Published: {new Date(data.published_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <User size={15} color="var(--color-accent)" />
            <span>
              Author: {data.author_first_name} {data.author_last_name}
            </span>
          </div>

          {data.expires_at && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={15} color="var(--color-text-muted)" />
              <span>
                Expires: {new Date(data.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Content Description */}
        <div
          style={{
            fontSize: "1.02rem",
            lineHeight: 1.8,
            color: "var(--color-text-primary)",
            whiteSpace: "pre-line",
          }}
        >
          {data.description}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-secondary)",
                marginBottom: "0.85rem",
              }}
            >
              Attached Documents ({attachments.length})
            </h3>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {attachments.map((file) => (
                <a
                  key={file.id}
                  href={`${UPLOADS_BASE}/${file.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.6rem 1rem",
                    fontSize: "0.85rem",
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

      {/* 1-on-1 Query & Messaging Section */}
      <div className="card" style={{ padding: "1.75rem 2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.25rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "var(--color-accent-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-accent)",
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                Direct Inquiry & Messaging with Admin
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                Have a question or need clarification about this announcement? Send a direct private message to the administration.
              </p>
            </div>
          </div>

          {query && (
            <span
              className="badge"
              style={{
                backgroundColor:
                  query.status === "RESOLVED"
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(59, 130, 246, 0.15)",
                color:
                  query.status === "RESOLVED"
                    ? "var(--color-status-published)"
                    : "var(--color-status-scheduled)",
                border:
                  query.status === "RESOLVED"
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Thread Status: {query.status}
            </span>
          )}
        </div>

        {/* Message Thread Box */}
        <div
          style={{
            backgroundColor: "var(--color-secondary-surface)",
            borderRadius: 10,
            padding: "1rem",
            minHeight: 140,
            maxHeight: 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "0.85rem",
                padding: "1.5rem 0",
              }}
            >
              <HelpCircle size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
              <p>No questions sent yet.</p>
              <p style={{ fontSize: "0.78rem" }}>Type your query below to start a private conversation with the admin team.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isAdminMsg = m.role === "ADMIN";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isAdminMsg ? "flex-start" : "flex-end",
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isAdminMsg ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      marginBottom: 2,
                    }}
                  >
                    <span>{isAdminMsg ? `Administrator (${m.first_name})` : "You"}</span>
                    <span>•</span>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "0.65rem 0.95rem",
                      borderRadius: 12,
                      borderBottomLeftRadius: isAdminMsg ? 2 : 12,
                      borderBottomRightRadius: !isAdminMsg ? 2 : 12,
                      backgroundColor: isAdminMsg
                        ? "var(--color-primary-surface)"
                        : "var(--color-accent-subtle)",
                      border: isAdminMsg
                        ? "1px solid var(--color-border)"
                        : "1px solid var(--color-accent-border)",
                      color: "var(--color-text-primary)",
                      fontSize: "0.88rem",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.75rem" }}>
          <textarea
            rows={2}
            required
            placeholder="Type your question or clarification request for the admin..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="input-field"
            style={{ resize: "none", fontSize: "0.88rem" }}
          />
          <button
            type="submit"
            disabled={sendingMessage}
            className="btn btn-primary"
            style={{
              alignSelf: "flex-end",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.7rem 1.25rem",
              whiteSpace: "nowrap",
            }}
          >
            <Send size={15} />
            <span>{sendingMessage ? "Sending..." : "Send"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
