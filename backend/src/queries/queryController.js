const db = require("../config/database");

/**
 * Get employee's own query and message history for an announcement
 */
async function getMyAnnouncementQuery(req, res) {
  try {
    const userId = req.user.id;
    const { announcementId } = req.params;

    const [queries] = await db.query(
      `SELECT * FROM announcement_queries
       WHERE announcement_id = ? AND employee_id = ?`,
      [announcementId, userId]
    );

    if (queries.length === 0) {
      return res.json({ query: null, messages: [] });
    }

    const query = queries[0];

    const [messages] = await db.query(
      `SELECT m.id, m.query_id, m.sender_id, m.message, m.created_at,
              u.first_name, u.last_name, u.role
       FROM announcement_query_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.query_id = ?
       ORDER BY m.created_at ASC`,
      [query.id]
    );

    res.json({ query, messages });
  } catch (error) {
    console.error("getMyAnnouncementQuery error:", error);
    res.status(500).json({ message: "Failed to fetch query thread" });
  }
}

/**
 * Send an employee message/query on an announcement
 */
async function sendEmployeeQuery(req, res) {
  try {
    const userId = req.user.id;
    const { announcementId } = req.params;
    const { message, subject = "Inquiry regarding announcement" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    // 1. Check if query thread already exists
    const [existingQueries] = await db.query(
      `SELECT * FROM announcement_queries
       WHERE announcement_id = ? AND employee_id = ?`,
      [announcementId, userId]
    );

    let queryId;
    if (existingQueries.length === 0) {
      const [insertResult] = await db.query(
        `INSERT INTO announcement_queries (announcement_id, employee_id, subject, status)
         VALUES (?, ?, ?, 'OPEN')`,
        [announcementId, userId, subject.trim()]
      );
      queryId = insertResult.insertId;
    } else {
      queryId = existingQueries[0].id;
      await db.query(
        `UPDATE announcement_queries
         SET status = 'OPEN', updated_at = NOW()
         WHERE id = ?`,
        [queryId]
      );
    }

    // 2. Insert query message
    const [msgResult] = await db.query(
      `INSERT INTO announcement_query_messages (query_id, sender_id, message)
       VALUES (?, ?, ?)`,
      [queryId, userId, message.trim()]
    );

    // 3. Notify Announcement Creator / Admins
    const [announcementRows] = await db.query(
      `SELECT a.title, a.created_by, u.first_name, u.last_name
       FROM announcements a
       JOIN users u ON u.id = ?
       WHERE a.id = ?`,
      [userId, announcementId]
    );

    if (announcementRows.length > 0) {
      const ann = announcementRows[0];
      const preview = message.length > 80 ? message.substring(0, 80) + "..." : message;
      const [admins] = await db.query("SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1");
      for (const adm of admins) {
        await db.query(
          `INSERT INTO notifications (user_id, announcement_id, type, title, message, is_read)
           VALUES (?, ?, 'QUERY_MESSAGE', ?, ?, 0)`,
          [
            adm.id,
            announcementId,
            `Inquiry: ${ann.title}`,
            `${ann.first_name} ${ann.last_name || ""} sent an inquiry: "${preview}"`,
          ]
        );
      }
    }

    // Fetch inserted message with user info
    const [insertedMsg] = await db.query(
      `SELECT m.id, m.query_id, m.sender_id, m.message, m.created_at,
              u.first_name, u.last_name, u.role
       FROM announcement_query_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [msgResult.insertId]
    );

    res.status(201).json({
      message: "Query sent successfully",
      queryId,
      newMessage: insertedMsg[0],
    });
  } catch (error) {
    console.error("sendEmployeeQuery error:", error);
    res.status(500).json({ message: "Failed to send query" });
  }
}

/**
 * Admin: Get all queries raised on an announcement
 */
async function getAnnouncementQueries(req, res) {
  try {
    const { announcementId } = req.params;

    const [queries] = await db.query(
      `SELECT q.*,
              u.first_name, u.last_name, u.employee_code, u.email,
              d.name as department_name,
              (SELECT COUNT(*) FROM announcement_query_messages m WHERE m.query_id = q.id) as message_count,
              (SELECT m.message FROM announcement_query_messages m WHERE m.query_id = q.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT m.created_at FROM announcement_query_messages m WHERE m.query_id = q.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM announcement_queries q
       JOIN users u ON q.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE q.announcement_id = ?
       ORDER BY q.updated_at DESC`,
      [announcementId]
    );

    res.json({ queries });
  } catch (error) {
    console.error("getAnnouncementQueries error:", error);
    res.status(500).json({ message: "Failed to fetch announcement queries" });
  }
}

/**
 * Get full message thread for a specific query
 */
async function getQueryMessages(req, res) {
  try {
    const { queryId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [queries] = await db.query(
      `SELECT q.*, a.title as announcement_title,
              u.first_name as employee_first_name, u.last_name as employee_last_name, u.employee_code,
              d.name as department_name
       FROM announcement_queries q
       JOIN announcements a ON q.announcement_id = a.id
       JOIN users u ON q.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE q.id = ?`,
      [queryId]
    );

    if (queries.length === 0) {
      return res.status(404).json({ message: "Query thread not found" });
    }

    const query = queries[0];

    // Authorization: only Admin or the employee who owns the query can view
    if (userRole !== "ADMIN" && query.employee_id !== userId) {
      return res.status(403).json({ message: "Unauthorized to view this query thread" });
    }

    const [messages] = await db.query(
      `SELECT m.id, m.query_id, m.sender_id, m.message, m.created_at,
              u.first_name, u.last_name, u.role
       FROM announcement_query_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.query_id = ?
       ORDER BY m.created_at ASC`,
      [queryId]
    );

    res.json({ query, messages });
  } catch (error) {
    console.error("getQueryMessages error:", error);
    res.status(500).json({ message: "Failed to fetch query messages" });
  }
}

/**
 * Reply to a query thread (Admin or Employee)
 */
async function replyQuery(req, res) {
  try {
    const { queryId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty" });
    }

    const [queries] = await db.query(
      `SELECT q.*, a.title as announcement_title, a.created_by
       FROM announcement_queries q
       JOIN announcements a ON q.announcement_id = a.id
       WHERE q.id = ?`,
      [queryId]
    );

    if (queries.length === 0) {
      return res.status(404).json({ message: "Query thread not found" });
    }

    const query = queries[0];

    // Authorization
    if (userRole !== "ADMIN" && query.employee_id !== userId) {
      return res.status(403).json({ message: "Unauthorized to reply to this query" });
    }

    // Insert message
    const [msgResult] = await db.query(
      `INSERT INTO announcement_query_messages (query_id, sender_id, message)
       VALUES (?, ?, ?)`,
      [queryId, userId, message.trim()]
    );

    // Update query timestamp
    await db.query(
      `UPDATE announcement_queries SET updated_at = NOW() WHERE id = ?`,
      [queryId]
    );

    // Send notification to the other party
    const preview = message.length > 80 ? message.substring(0, 80) + "..." : message;
    if (userRole === "ADMIN") {
      // Notify employee
      await db.query(
        `INSERT INTO notifications (user_id, announcement_id, type, title, message, is_read)
         VALUES (?, ?, 'QUERY_REPLY', ?, ?, 0)`,
        [
          query.employee_id,
          query.announcement_id,
          `Admin Reply: ${query.announcement_title}`,
          `Administrator replied to your inquiry: "${preview}"`,
        ]
      );
    } else {
      // Notify all active admins
      const [admins] = await db.query("SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1");
      for (const adm of admins) {
        await db.query(
          `INSERT INTO notifications (user_id, announcement_id, type, title, message, is_read)
           VALUES (?, ?, 'QUERY_MESSAGE', ?, ?, 0)`,
          [
            adm.id,
            query.announcement_id,
            `Inquiry Reply: ${query.announcement_title}`,
            `Employee sent a reply: "${preview}"`,
          ]
        );
      }
    }

    const [insertedMsg] = await db.query(
      `SELECT m.id, m.query_id, m.sender_id, m.message, m.created_at,
              u.first_name, u.last_name, u.role
       FROM announcement_query_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [msgResult.insertId]
    );

    res.status(201).json({
      message: "Reply sent successfully",
      newMessage: insertedMsg[0],
    });
  } catch (error) {
    console.error("replyQuery error:", error);
    res.status(500).json({ message: "Failed to send reply" });
  }
}

/**
 * Admin: Update query status (OPEN, RESOLVED, CLOSED)
 */
async function updateQueryStatus(req, res) {
  try {
    const { queryId } = req.params;
    const { status = "RESOLVED" } = req.body;

    const validStatuses = ["OPEN", "RESOLVED", "CLOSED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ message: "Invalid query status" });
    }

    await db.query(
      `UPDATE announcement_queries SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status.toUpperCase(), queryId]
    );

    res.json({ message: "Query status updated successfully", status: status.toUpperCase() });
  } catch (error) {
    console.error("updateQueryStatus error:", error);
    res.status(500).json({ message: "Failed to update query status" });
  }
}

module.exports = {
  getMyAnnouncementQuery,
  sendEmployeeQuery,
  getAnnouncementQueries,
  getQueryMessages,
  replyQuery,
  updateQueryStatus,
};
