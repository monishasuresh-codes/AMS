import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, AlertCircle, Sun, Moon, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-deep-bg)",
        padding: "1.5rem",
        position: "relative",
      }}
    >
      {/* Top right theme toggle */}
      <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}>
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div
        className="fade-in"
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "var(--color-primary-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header / Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--color-accent), #685b3b)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.5rem",
              margin: "0 auto 1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            A
          </div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: "0.4rem",
              letterSpacing: "0.2px",
            }}
          >
            Announcement Management
          </h1>
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--color-text-secondary)",
            }}
          >
            Sign in to access your organization portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
              borderRadius: 8,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#EF4444",
              fontSize: "0.88rem",
              marginBottom: "1.5rem",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "0.45rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                required
                className="input-field"
                placeholder="name@ams.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-muted)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "0.45rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-muted)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem" }}
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--color-text-muted)",
              marginBottom: "0.75rem",
              textAlign: "center",
            }}
          >
            Quick Admin Access
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@gmail.com", "123456")}
              className="btn btn-secondary"
              style={{
                justifyContent: "space-between",
                padding: "0.65rem 0.95rem",
                fontSize: "0.85rem",
                backgroundColor: "var(--color-secondary-surface)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600 }}>System Admin</span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>admin@gmail.com</span>
              </div>
              <span style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: "0.8rem" }}>1-Click Fill</span>
            </button>
          </div>
          <p
            style={{
              fontSize: "0.74rem",
              color: "var(--color-text-muted)",
              textAlign: "center",
              marginTop: "0.85rem",
              lineHeight: 1.4,
            }}
          >
            Password: <code style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>123456</code>. You can provision custom employees after logging in.
          </p>
        </div>
      </div>
    </div>
  );
}
