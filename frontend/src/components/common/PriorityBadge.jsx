import React from "react";

const PRIORITY_CONFIG = {
  NORMAL: {
    label: "Normal",
    bg: "rgba(107, 114, 128, 0.12)",
    color: "var(--color-priority-normal)",
    border: "rgba(107, 114, 128, 0.3)",
  },
  IMPORTANT: {
    label: "Important",
    bg: "rgba(234, 179, 8, 0.15)",
    color: "var(--color-priority-important)",
    border: "rgba(234, 179, 8, 0.4)",
  },
  URGENT: {
    label: "Urgent",
    bg: "rgba(239, 68, 68, 0.18)",
    color: "var(--color-priority-urgent)",
    border: "rgba(239, 68, 68, 0.4)",
  },
};

export default function PriorityBadge({ priority }) {
  const normalized = (priority || "NORMAL").toUpperCase();
  const config = PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.NORMAL;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
}
