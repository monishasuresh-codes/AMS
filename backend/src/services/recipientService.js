const db = require("../config/database");

/**
 * Resolves the recipient employee user IDs for an announcement based on its targeting configuration.
 * Only resolves active employees. (Admins are excluded from standard recipient pool unless specifically targeted or part of all).
 */
async function resolveRecipientsForAnnouncement(announcementId) {
  // Fetch targets for this announcement
  const [targets] = await db.query(
    `SELECT target_type, department_id, user_id
     FROM announcement_targets
     WHERE announcement_id = ?`,
    [announcementId]
  );

  if (targets.length === 0) {
    // Default to ALL if no explicit target defined
    const [allUsers] = await db.query(
      `SELECT id FROM users WHERE is_active = 1`
    );
    return allUsers.map((u) => u.id);
  }

  const recipientIdsSet = new Set();

  for (const t of targets) {
    if (t.target_type === "ALL") {
      const [users] = await db.query(
        `SELECT id FROM users WHERE is_active = 1`
      );
      users.forEach((u) => recipientIdsSet.add(u.id));
    } else if (t.target_type === "DEPARTMENT" && t.department_id) {
      const [users] = await db.query(
        `SELECT id FROM users WHERE department_id = ? AND is_active = 1`,
        [t.department_id]
      );
      users.forEach((u) => recipientIdsSet.add(u.id));
    } else if (t.target_type === "USER" && t.user_id) {
      const [users] = await db.query(
        `SELECT id FROM users WHERE id = ? AND is_active = 1`,
        [t.user_id]
      );
      if (users.length > 0) {
        recipientIdsSet.add(users[0].id);
      }
    }
  }

  return Array.from(recipientIdsSet);
}

/**
 * Generates announcement_recipients records and in-app notifications idempotently.
 */
async function generateRecipientsAndNotifications(announcementId, announcementTitle = null) {
  if (!announcementTitle) {
    const [ann] = await db.query(
      `SELECT title, priority, category FROM announcements WHERE id = ?`,
      [announcementId]
    );
    if (ann.length > 0) {
      announcementTitle = ann[0].title;
    }
  }

  const userIds = await resolveRecipientsForAnnouncement(announcementId);

  for (const userId of userIds) {
    // 1. Insert recipient idempotently
    await db.query(
      `INSERT INTO announcement_recipients (announcement_id, user_id, read_status, read_at)
       VALUES (?, ?, 'UNREAD', NULL)
       ON DUPLICATE KEY UPDATE id=id`,
      [announcementId, userId]
    );

    // 2. Insert notification idempotently
    const [existingNotif] = await db.query(
      `SELECT id FROM notifications
       WHERE user_id = ? AND announcement_id = ? AND type = 'ANNOUNCEMENT_PUBLISHED'`,
      [userId, announcementId]
    );

    if (existingNotif.length === 0) {
      await db.query(
        `INSERT INTO notifications (user_id, announcement_id, type, title, message, is_read)
         VALUES (?, ?, 'ANNOUNCEMENT_PUBLISHED', ?, ?, 0)`,
        [
          userId,
          announcementId,
          `Announcement: ${announcementTitle || "New Announcement"}`,
          `A new announcement has been published: "${announcementTitle || ""}". Click to read.`,
        ]
      );
    }
  }

  return { totalTargeted: userIds.length };
}

module.exports = {
  resolveRecipientsForAnnouncement,
  generateRecipientsAndNotifications,
};
