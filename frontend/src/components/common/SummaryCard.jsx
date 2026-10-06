import React from "react";

export default function SummaryCard({ title, value, subtitle, icon: Icon, accent = false }) {
  return (
    <div
      className="kpi-card"
      style={
        accent
          ? {
              borderColor: "var(--color-accent)",
              background:
                "linear-gradient(145deg, var(--color-primary-surface), var(--color-accent-subtle))",
            }
          : {}
      }
    >
      <div className="kpi-header">
        <span>{title}</span>
        {Icon && (
          <span
            style={{
              color: accent ? "var(--color-accent)" : "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
}
