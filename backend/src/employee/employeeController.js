const db = require("../config/database");

async function getMyAnnouncements(req, res) {
  try {
    const userId = req.user.id;
    const {
      filter = "ALL", // ALL, UNREAD, READ, URGENT
      category,
      priority,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let query = `
      SELECT a.id, a.title, a.category, a.priority, a.status,
             a.published_at, a.expires_at, a.created_at,
             ar.read_status, ar.read_at,
             u.first_name as author_first_name, u.last_name as author_last_name,
             (SELECT COUNT(*) FROM announcement_attachments att WHERE att.announcement_id = a.id) as attachment_count
      FROM announcement_recipients ar
      JOIN announcements a ON ar.announcement_id = a.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE ar.user_id = ? AND a.status = 'PUBLISHED'
    `;
    const params = [userId];

    if (filter === "UNREAD") {
      query += ` AND ar.read_status = 'UNREAD'`;
    } else if (filter === "READ") {
      query += ` AND ar.read_status = 'READ'`;
    } else if (filter === "URGENT") {
      query += ` AND a.priority = 'URGENT'`;
    }

    if (category && category !== "ALL") {
      query += ` AND a.category = ?`;
      params.push(category);
    }

    if (priority && priority !== "ALL") {
      query += ` AND a.priority = ?`;
      params.push(priority);
    }

    if (search) {
      query += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await db.query(countQuery, params);

    // Order by unread first, then by published_at DESC
    query += ` ORDER BY (CASE WHEN ar.read_status = 'UNREAD' THEN 0 ELSE 1 END), a.published_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);

    // Get count summaries
    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) as total_received,
         SUM(CASE WHEN ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count,
         SUM(CASE WHEN a.priority = 'URGENT' AND ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as urgent_unread_count
       FROM announcement_recipients ar
       JOIN announcements a ON ar.announcement_id = a.id
       WHERE ar.user_id = ? AND a.status = 'PUBLISHED'`,
      [userId]
    );

    res.json({
      data: rows,
      stats: {
        total_received: stats.total_received || 0,
        unread_count: stats.unread_count || 0,
        urgent_unread_count: stats.urgent_unread_count || 0,
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getMyAnnouncements error:", error);
    res.status(500).json({ message: "Failed to fetch your announcements" });
  }
}

async function getMyAnnouncementById(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify recipient record exists for this employee
    const [recipients] = await db.query(
      `SELECT ar.*, a.title, a.category, a.description, a.priority, a.status,
              a.published_at, a.expires_at, a.created_at,
              u.first_name as author_first_name, u.last_name as author_last_name, u.email as author_email
       FROM announcement_recipients ar
       JOIN announcements a ON ar.announcement_id = a.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE ar.announcement_id = ? AND ar.user_id = ?`,
      [id, userId]
    );

    if (recipients.length === 0) {
      return res.status(403).json({
        message: "You are not authorized to view this announcement or it was not targeted to you",
      });
    }

    const item = recipients[0];

    // AUTOMATIC READ STATE RECORDING
    if (item.read_status === "UNREAD") {
      const serverReadTime = new Date();
      await db.query(
        `UPDATE announcement_recipients
         SET read_status = 'READ', read_at = ?
         WHERE announcement_id = ? AND user_id = ?`,
        [serverReadTime, id, userId]
      );

      // Also mark associated notification as read
      await db.query(
        `UPDATE notifications
         SET is_read = 1, read_at = ?
         WHERE user_id = ? AND announcement_id = ?`,
        [serverReadTime, userId, id]
      );

      item.read_status = "READ";
      item.read_at = serverReadTime;
    }

    // Fetch attachments
    const [attachments] = await db.query(
      `SELECT id, file_name, file_path, file_type, file_size, created_at
       FROM announcement_attachments
       WHERE announcement_id = ?`,
      [id]
    );

    res.json({
      announcement: item,
      attachments,
    });
  } catch (error) {
    console.error("getMyAnnouncementById error:", error);
    res.status(500).json({ message: "Failed to fetch announcement details" });
  }
}

async function markAnnouncementRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [recipient] = await db.query(
      `SELECT * FROM announcement_recipients WHERE announcement_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (recipient.length === 0) {
      return res.status(404).json({ message: "Announcement recipient record not found" });
    }

    const serverTime = new Date();
    await db.query(
      `UPDATE announcement_recipients
       SET read_status = 'READ', read_at = ?
       WHERE announcement_id = ? AND user_id = ?`,
      [serverTime, id, userId]
    );

    await db.query(
      `UPDATE notifications
       SET is_read = 1, read_at = ?
       WHERE user_id = ? AND announcement_id = ?`,
      [serverTime, userId, id]
    );

    res.json({
      message: "Announcement marked as read",
      read_at: serverTime,
    });
  } catch (error) {
    console.error("markAnnouncementRead error:", error);
    res.status(500).json({ message: "Failed to mark announcement as read" });
  }
}

module.exports = {
  getMyAnnouncements,
  getMyAnnouncementById,
  markAnnouncementRead,
};
