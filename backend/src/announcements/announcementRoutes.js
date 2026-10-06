const express = require("express");
const {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  scheduleAnnouncement,
  cancelAnnouncement,
  archiveAnnouncement,
  getAnnouncementRecipients,
  getAnnouncementReadStatus,
} = require("./announcementController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// All admin announcement routes require authentication & ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/", getAnnouncements);
router.post("/", upload.array("attachments", 5), createAnnouncement);
router.get("/:id", getAnnouncementById);
router.put("/:id", upload.array("attachments", 5), updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

// Lifecycle endpoints
router.post("/:id/publish", publishAnnouncement);
router.post("/:id/schedule", scheduleAnnouncement);
router.post("/:id/cancel", cancelAnnouncement);
router.post("/:id/archive", archiveAnnouncement);

// Tracking endpoints
router.get("/:id/recipients", getAnnouncementRecipients);
router.get("/:id/read-status", getAnnouncementReadStatus);

module.exports = router;
