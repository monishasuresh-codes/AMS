const express = require("express");
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("./notificationController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
