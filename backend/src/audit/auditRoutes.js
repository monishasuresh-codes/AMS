const express = require("express");
const { getAuditLogs } = require("./auditController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", getAuditLogs);

module.exports = router;
