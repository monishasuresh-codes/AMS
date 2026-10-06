const db = require("../config/database");

async function getAnnouncementReports(req, res) {
  try {
    const { period = "30d" } = req.query;

    let periodCondition = "";
    if (period === "7d") {
      periodCondition = "AND created_at >= NOW() - INTERVAL 7 DAY";
    } else if (period === "30d") {
      periodCondition = "AND created_at >= NOW() - INTERVAL 30 DAY";
    } else if (period === "90d") {
      periodCondition = "AND created_at >= NOW() - INTERVAL 90 DAY";
    }

    // 1. Overview counts
    const [[counts]] = await db.query(`
      SELECT
        COUNT(*) as total_announcements,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_count,
        SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled_count,
        SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published_count,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END) as archived_count,
        SUM(CASE WHEN priority = 'URGENT' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN priority = 'IMPORTANT' THEN 1 ELSE 0 END) as important_count,
        SUM(CASE WHEN priority = 'NORMAL' THEN 1 ELSE 0 END) as normal_count
      FROM announcements
      WHERE 1=1 ${periodCondition}
    `);

    // 2. Total employees count
    const [[{ total_employees }]] = await db.query(
      "SELECT COUNT(*) as total_employees FROM users WHERE role = 'EMPLOYEE' AND is_active = 1"
    );

    // 3. Recipient read vs unread counts
    const [[readStats]] = await db.query(`
      SELECT
        COUNT(*) as total_recipients,
        SUM(CASE WHEN ar.read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
      FROM announcement_recipients ar
      JOIN announcements a ON ar.announcement_id = a.id
      WHERE 1=1 ${periodCondition.replace(/created_at/g, "a.created_at")}
    `);

    // 4. Category breakdown
    const [categoryBreakdown] = await db.query(`
      SELECT category, COUNT(*) as count
      FROM announcements
      WHERE 1=1 ${periodCondition}
      GROUP BY category
      ORDER BY count DESC
    `);

    // 5. Priority breakdown
    const [priorityBreakdown] = await db.query(`
      SELECT priority, COUNT(*) as count
      FROM announcements
      WHERE 1=1 ${periodCondition}
      GROUP BY priority
      ORDER BY count DESC
    `);

    // 6. Status breakdown
    const [statusBreakdown] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM announcements
      WHERE 1=1 ${periodCondition}
      GROUP BY status
      ORDER BY count DESC
    `);

    // 7. Upcoming scheduled announcements
    const [upcomingScheduled] = await db.query(`
      SELECT id, title, category, priority, scheduled_at, expires_at
      FROM announcements
      WHERE status = 'SCHEDULED'
      ORDER BY scheduled_at ASC
      LIMIT 5
    `);

    // 8. Recent activity
    const [recentActivity] = await db.query(`
      SELECT h.*, a.title, u.first_name, u.last_name
      FROM announcement_history h
      JOIN announcements a ON h.announcement_id = a.id
      LEFT JOIN users u ON h.performed_by = u.id
      ORDER BY h.created_at DESC
      LIMIT 8
    `);

    const totalRecipients = readStats.total_recipients || 0;
    const readCount = readStats.read_count || 0;
    const unreadCount = readStats.unread_count || 0;
    const overallReadRate = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    res.json({
      cards: {
        total_announcements: counts.total_announcements || 0,
        draft: counts.draft_count || 0,
        scheduled: counts.scheduled_count || 0,
        published: counts.published_count || 0,
        expired: counts.expired_count || 0,
        cancelled: counts.cancelled_count || 0,
        archived: counts.archived_count || 0,
        urgent: counts.urgent_count || 0,
        important: counts.important_count || 0,
        normal: counts.normal_count || 0,
        total_employees: total_employees || 0,
        read_users: readCount,
        unread_users: unreadCount,
        overall_read_rate: overallReadRate,
      },
      categoryBreakdown,
      priorityBreakdown,
      statusBreakdown,
      upcomingScheduled,
      recentActivity,
    });
  } catch (error) {
    console.error("getAnnouncementReports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
}

async function getReadRateReports(req, res) {
  try {
    // 1. Department-wise read-rate comparison
    const [deptStats] = await db.query(`
      SELECT
        d.id as department_id,
        d.name as department_name,
        COUNT(ar.id) as total_targeted,
        SUM(CASE WHEN ar.read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
      FROM departments d
      JOIN users u ON d.id = u.department_id
      JOIN announcement_recipients ar ON u.id = ar.user_id
      GROUP BY d.id, d.name
      ORDER BY total_targeted DESC
    `);

    const enrichedDeptStats = deptStats.map((d) => ({
      ...d,
      read_rate: d.total_targeted > 0 ? Math.round((d.read_count / d.total_targeted) * 100) : 0,
    }));

    // 2. Announcement performance leaderboard
    const [announcementLeaderboard] = await db.query(`
      SELECT
        a.id,
        a.title,
        a.category,
        a.priority,
        a.status,
        a.published_at,
        COUNT(ar.id) as total_recipients,
        SUM(CASE WHEN ar.read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
      FROM announcements a
      JOIN announcement_recipients ar ON a.id = ar.announcement_id
      WHERE a.status IN ('PUBLISHED', 'EXPIRED')
      GROUP BY a.id
      ORDER BY read_count DESC
      LIMIT 10
    `);

    const enrichedLeaderboard = announcementLeaderboard.map((a) => ({
      ...a,
      read_rate: a.total_recipients > 0 ? Math.round((a.read_count / a.total_recipients) * 100) : 0,
    }));

    res.json({
      departments: enrichedDeptStats,
      announcements: enrichedLeaderboard,
    });
  } catch (error) {
    console.error("getReadRateReports error:", error);
    res.status(500).json({ message: "Failed to fetch read-rate analytics" });
  }
}

module.exports = {
  getAnnouncementReports,
  getReadRateReports,
};
