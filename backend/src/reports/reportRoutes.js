const express = require("express");
const {
  getAnnouncementReports,
  getReadRateReports,
} = require("./reportController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/announcements", getAnnouncementReports);
router.get("/read-rate", getReadRateReports);

module.exports = router;
