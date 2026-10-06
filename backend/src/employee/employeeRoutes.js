const express = require("express");
const {
  getMyAnnouncements,
  getMyAnnouncementById,
  markAnnouncementRead,
} = require("./employeeController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/announcements", getMyAnnouncements);
router.get("/announcements/:id", getMyAnnouncementById);
router.post("/announcements/:id/read", markAnnouncementRead);

module.exports = router;
