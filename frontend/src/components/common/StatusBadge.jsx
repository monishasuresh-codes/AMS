import React from "react";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    bg: "rgba(156, 163, 175, 0.15)",
    color: "var(--color-status-draft)",
    dot: "#9CA3AF",
  },
  SCHEDULED: {
    label: "Scheduled",
    bg: "rgba(59, 130, 246, 0.15)",
    color: "var(--color-status-scheduled)",
    dot: "#3B82F6",
  },
  PUBLISHED: {
    label: "Published",
    bg: "rgba(16, 185, 129, 0.15)",
    color: "var(--color-status-published)",
    dot: "#10B981",
  },
  EXPIRED: {
    label: "Expired",
    bg: "rgba(107, 114, 128, 0.15)",
    color: "var(--color-status-expired)",
    dot: "#6B7280",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "rgba(239, 68, 68, 0.15)",
    color: "var(--color-status-cancelled)",
    dot: "#EF4444",
  },
  ARCHIVED: {
    label: "Archived",
    bg: "rgba(139, 92, 246, 0.15)",
    color: "var(--color-status-archived)",
    dot: "#8B5CF6",
  },
};

export default function StatusBadge({ status }) {
  const normalized = (status || "DRAFT").toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.DRAFT;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.dot}40`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: config.dot,
        }}
      />
      {config.label}
    </span>
  );
}
