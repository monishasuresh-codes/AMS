const express = require("express");
const {
  getMyAnnouncementQuery,
  sendEmployeeQuery,
  getAnnouncementQueries,
  getQueryMessages,
  replyQuery,
  updateQueryStatus,
} = require("./queryController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// All query routes require authentication
router.use(authenticate);

// Employee: get their own query for an announcement or post a new message
router.get("/announcement/:announcementId/my", getMyAnnouncementQuery);
router.post("/announcement/:announcementId", sendEmployeeQuery);

// Admin: view all employee queries on an announcement
router.get("/announcement/:announcementId", requireRole("ADMIN"), getAnnouncementQueries);

// Shared: message thread & replies
router.get("/:queryId/messages", getQueryMessages);
router.post("/:queryId/reply", replyQuery);

// Admin: update query status (OPEN / RESOLVED / CLOSED)
router.patch("/:queryId/status", requireRole("ADMIN"), updateQueryStatus);

module.exports = router;
