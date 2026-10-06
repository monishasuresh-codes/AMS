const db = require("../config/database");

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 20, unread_only = "1" } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    // Filter by user role:
    // - Employee: announcements only (ANNOUNCEMENT_PUBLISHED)
    // - Admin: announcements & queries from employees (ANNOUNCEMENT_PUBLISHED, QUERY_MESSAGE, QUERY_REPLY)
    let typeClause = "";
    if (userRole === "EMPLOYEE") {
      typeClause = " AND n.type = 'ANNOUNCEMENT_PUBLISHED' ";
    } else {
      typeClause = " AND n.type IN ('ANNOUNCEMENT_PUBLISHED', 'QUERY_MESSAGE', 'QUERY_REPLY') ";
    }

    // By default discard read notifications from the view
    let readClause = "";
    if (unread_only === "1" || unread_only === "true") {
      readClause = " AND n.is_read = 0 ";
    }

    const [rows] = await db.query(
      `SELECT n.*, a.priority, a.category, a.title as announcement_title
       FROM notifications n
       LEFT JOIN announcements a ON n.announcement_id = a.id
       WHERE n.user_id = ? ${typeClause} ${readClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const [[{ unread_count }]] = await db.query(
      `SELECT COUNT(*) as unread_count
       FROM notifications n
       WHERE n.user_id = ? AND n.is_read = 0 ${typeClause}`,
      [userId]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM notifications n
       WHERE n.user_id = ? ${typeClause} ${readClause}`,
      [userId]
    );

    res.json({
      notifications: rows,
      unread_count,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [notif] = await db.query(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (notif.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await db.query(
      "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    res.status(500).json({ message: "Failed to update notification" });
  }
}

async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;

    await db.query(
      "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    res.status(500).json({ message: "Failed to update notifications" });
  }
}

async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [id, userId]);
    res.json({ message: "Notification discarded successfully" });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({ message: "Failed to discard notification" });
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
