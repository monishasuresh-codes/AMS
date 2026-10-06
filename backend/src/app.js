const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./auth/authRoutes");
const userRoutes = require("./users/userRoutes");
const departmentRoutes = require("./departments/departmentRoutes");
const announcementRoutes = require("./announcements/announcementRoutes");
const employeeRoutes = require("./employee/employeeRoutes");
const notificationRoutes = require("./notifications/notificationRoutes");
const reportRoutes = require("./reports/reportRoutes");
const auditRoutes = require("./audit/auditRoutes");
const queryRoutes = require("./queries/queryRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads serving
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health / Status endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Announcement Management System API",
    server_time: new Date().toISOString(),
    timezone: "Asia/Kolkata",
  });
});

// Root API test
app.get("/", (req, res) => {
  res.json({
    message: "Announcement Management System API is running",
    documentation: "/api/health",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/my", employeeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/queries", queryRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error("Express uncaught error:", err);
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  res.status(500).json({
    message: err.message || "Internal server error occurred",
  });
});

module.exports = app;