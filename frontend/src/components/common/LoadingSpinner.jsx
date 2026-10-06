import React from "react";

export function LoadingSpinner({ text = "Loading data..." }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3.5rem 1rem",
        gap: "1rem",
        color: "var(--color-text-secondary)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: "0.9rem" }}>{text}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3.5rem 1.5rem",
        textAlign: "center",
        background: "var(--color-primary-surface)",
        border: "1px dashed var(--color-border)",
        borderRadius: 12,
        margin: "1rem 0",
      }}
    >
      {Icon && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: "var(--color-secondary-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent)",
            marginBottom: "1rem",
          }}
        >
          <Icon size={26} />
        </div>
      )}
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "0.35rem",
        }}
      >
        {title || "No data available"}
      </h3>
      {description && (
        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            maxWidth: 420,
            marginBottom: action ? "1.25rem" : 0,
          }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
