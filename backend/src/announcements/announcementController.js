const db = require("../config/database");
const { generateRecipientsAndNotifications } = require("../services/recipientService");
const { logAudit, logAnnouncementHistory } = require("../services/auditService");

async function getAnnouncements(req, res) {
  try {
    const {
      status,
      category,
      priority,
      search,
      start_date,
      end_date,
      page = 1,
      limit = 15,
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    let query = `
      SELECT a.id, a.title, a.category, a.priority, a.status,
             a.created_by, a.scheduled_at, a.published_at, a.expires_at,
             a.created_at, a.updated_at,
             u.first_name as author_first_name, u.last_name as author_last_name,
             (SELECT COUNT(*) FROM announcement_recipients ar WHERE ar.announcement_id = a.id) as total_recipients,
             (SELECT COUNT(*) FROM announcement_recipients ar WHERE ar.announcement_id = a.id AND ar.read_status = 'READ') as read_count,
             (SELECT COUNT(*) FROM announcement_attachments att WHERE att.announcement_id = a.id) as attachment_count
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "ALL") {
      query += ` AND a.status = ?`;
      params.push(status);
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

    if (start_date) {
      query += ` AND a.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.created_at <= ?`;
      params.push(end_date + " 23:59:59");
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await db.query(countQuery, params);

    query += ` ORDER BY a.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);

    const enrichedRows = rows.map((r) => {
      const readRate = r.total_recipients > 0 ? Math.round((r.read_count / r.total_recipients) * 100) : 0;
      return {
        ...r,
        unread_count: Math.max(0, r.total_recipients - r.read_count),
        read_rate_percentage: readRate,
      };
    });

    res.json({
      data: enrichedRows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getAnnouncements error:", error);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
}

async function getAnnouncementById(req, res) {
  try {
    const { id } = req.params;

    const [announcements] = await db.query(
      `SELECT a.*,
              u.first_name as author_first_name, u.last_name as author_last_name, u.email as author_email
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (announcements.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const announcement = announcements[0];

    // Fetch targets
    const [targets] = await db.query(
      `SELECT t.*, d.name as department_name, u.first_name, u.last_name, u.employee_code
       FROM announcement_targets t
       LEFT JOIN departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.announcement_id = ?`,
      [id]
    );

    // Fetch attachments
    const [attachments] = await db.query(
      `SELECT * FROM announcement_attachments WHERE announcement_id = ?`,
      [id]
    );

    // Fetch stats
    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) as total_recipients,
         SUM(CASE WHEN read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
         SUM(CASE WHEN read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
       FROM announcement_recipients
       WHERE announcement_id = ?`,
      [id]
    );

    const totalRecipients = stats.total_recipients || 0;
    const readCount = stats.read_count || 0;
    const unreadCount = stats.unread_count || 0;
    const readRate = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    // Fetch history
    const [history] = await db.query(
      `SELECT h.*, u.first_name, u.last_name
       FROM announcement_history h
       LEFT JOIN users u ON h.performed_by = u.id
       WHERE h.announcement_id = ?
       ORDER BY h.created_at ASC`,
      [id]
    );

    res.json({
      announcement,
      targets,
      attachments,
      stats: {
        total_recipients: totalRecipients,
        read_count: readCount,
        unread_count: unreadCount,
        read_rate_percentage: readRate,
      },
      history,
    });
  } catch (error) {
    console.error("getAnnouncementById error:", error);
    res.status(500).json({ message: "Failed to fetch announcement details" });
  }
}

async function createAnnouncement(req, res) {
  try {
    const {
      title,
      category,
      description,
      priority = "NORMAL",
      action = "DRAFT", // DRAFT, SCHEDULE, PUBLISH
      scheduled_at,
      expires_at,
      target_type = "ALL", // ALL, DEPARTMENT, USER
      department_ids, // array or comma-separated
      user_ids, // array or comma-separated
    } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: "Title, category, and description are required" });
    }

    // Date validations
    let scheduledDate = scheduled_at ? new Date(scheduled_at) : null;
    let expiresDate = expires_at ? new Date(expires_at) : null;

    if (scheduledDate && isNaN(scheduledDate.getTime())) scheduledDate = null;
    if (expiresDate && isNaN(expiresDate.getTime())) expiresDate = null;

    if (scheduledDate && expiresDate && expiresDate <= scheduledDate) {
      return res.status(400).json({ message: "Expiry date must be after scheduled publish date" });
    }

    let initialStatus = "DRAFT";
    let publishedDate = null;

    if (action.toUpperCase() === "PUBLISH") {
      initialStatus = "PUBLISHED";
      publishedDate = new Date();
    } else if (action.toUpperCase() === "SCHEDULE") {
      if (!scheduledDate) {
        return res.status(400).json({ message: "Scheduled publish date/time is required to schedule" });
      }
      initialStatus = "SCHEDULED";
    }

    // Insert announcement
    const [result] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by, scheduled_at, published_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        category.trim(),
        description.trim(),
        priority.toUpperCase(),
        initialStatus,
        req.user.id,
        scheduledDate,
        publishedDate,
        expiresDate,
      ]
    );

    const announcementId = result.insertId;

    // Handle Targets
    if (target_type === "ALL") {
      await db.query(
        "INSERT INTO announcement_targets (announcement_id, target_type) VALUES (?, 'ALL')",
        [announcementId]
      );
    } else if (target_type === "DEPARTMENT") {
      const deptList = Array.isArray(department_ids)
        ? department_ids
        : typeof department_ids === "string"
        ? department_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      for (const dId of deptList) {
        await db.query(
          "INSERT INTO announcement_targets (announcement_id, target_type, department_id) VALUES (?, 'DEPARTMENT', ?)",
          [announcementId, parseInt(dId)]
        );
      }
    } else if (target_type === "USER") {
      const userList = Array.isArray(user_ids)
        ? user_ids
        : typeof user_ids === "string"
        ? user_ids.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      for (const uId of userList) {
        await db.query(
          "INSERT INTO announcement_targets (announcement_id, target_type, user_id) VALUES (?, 'USER', ?)",
          [announcementId, parseInt(uId)]
        );
      }
    }

    // Handle uploaded attachments if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await db.query(
          `INSERT INTO announcement_attachments (announcement_id, file_name, file_path, file_type, file_size, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            announcementId,
            file.originalname,
            file.filename,
            file.mimetype,
            file.size,
            req.user.id,
          ]
        );
      }
    }

    // Log history
    await logAnnouncementHistory({
      announcementId,
      action: initialStatus === "PUBLISHED" ? "PUBLISHED" : initialStatus === "SCHEDULED" ? "SCHEDULED" : "CREATED",
      performedBy: req.user.id,
      previousStatus: null,
      newStatus: initialStatus,
      remarks: `Announcement created as ${initialStatus} by ${req.user.first_name} ${req.user.last_name}`,
    });

    // If published immediately, generate recipients & notifications!
    let totalTargeted = 0;
    if (initialStatus === "PUBLISHED") {
      const genResult = await generateRecipientsAndNotifications(announcementId, title);
      totalTargeted = genResult.totalTargeted;
    }

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: `ANNOUNCEMENT_${initialStatus}`,
      entityType: "announcements",
      entityId: announcementId,
      newValues: { title, category, priority, status: initialStatus, target_type, totalTargeted },
      remarks: `Created announcement ID ${announcementId} with status ${initialStatus}`,
    });

    res.status(201).json({
      message: `Announcement created successfully (${initialStatus})`,
      announcementId,
      status: initialStatus,
      totalTargeted,
    });
  } catch (error) {
    console.error("createAnnouncement error:", error);
    res.status(500).json({ message: "Failed to create announcement" });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      description,
      priority,
      scheduled_at,
      expires_at,
      target_type,
      department_ids,
      user_ids,
    } = req.body;

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];

    // Cannot edit expired or cancelled announcement
    if (["CANCELLED", "ARCHIVED"].includes(current.status)) {
      return res.status(400).json({
        message: `Cannot edit an announcement with status ${current.status}`,
      });
    }

    let scheduledDate = scheduled_at !== undefined ? (scheduled_at ? new Date(scheduled_at) : null) : current.scheduled_at;
    let expiresDate = expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : current.expires_at;

    await db.query(
      `UPDATE announcements
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           description = COALESCE(?, description),
           priority = COALESCE(?, priority),
           scheduled_at = ?,
           expires_at = ?
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        category ? category.trim() : null,
        description ? description.trim() : null,
        priority ? priority.toUpperCase() : null,
        scheduledDate,
        expiresDate,
        id,
      ]
    );

    // Update targets if draft/scheduled and provided
    if (["DRAFT", "SCHEDULED"].includes(current.status) && target_type) {
      await db.query("DELETE FROM announcement_targets WHERE announcement_id = ?", [id]);

      if (target_type === "ALL") {
        await db.query(
          "INSERT INTO announcement_targets (announcement_id, target_type) VALUES (?, 'ALL')",
          [id]
        );
      } else if (target_type === "DEPARTMENT") {
        const deptList = Array.isArray(department_ids)
          ? department_ids
          : typeof department_ids === "string"
          ? department_ids.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        for (const dId of deptList) {
          await db.query(
            "INSERT INTO announcement_targets (announcement_id, target_type, department_id) VALUES (?, 'DEPARTMENT', ?)",
            [id, parseInt(dId)]
          );
        }
      } else if (target_type === "USER") {
        const userList = Array.isArray(user_ids)
          ? user_ids
          : typeof user_ids === "string"
          ? user_ids.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        for (const uId of userList) {
          await db.query(
            "INSERT INTO announcement_targets (announcement_id, target_type, user_id) VALUES (?, 'USER', ?)",
            [id, parseInt(uId)]
          );
        }
      }
    }

    // Upload any new attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await db.query(
          `INSERT INTO announcement_attachments (announcement_id, file_name, file_path, file_type, file_size, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, file.originalname, file.filename, file.mimetype, file.size, req.user.id]
        );
      }
    }

    await logAnnouncementHistory({
      announcementId: id,
      action: "UPDATED",
      performedBy: req.user.id,
      previousStatus: current.status,
      newStatus: current.status,
      remarks: "Announcement details edited by Admin",
    });

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_UPDATED",
      entityType: "announcements",
      entityId: id,
      oldValues: { title: current.title, status: current.status },
      newValues: { title, priority, scheduled_at, expires_at },
      remarks: `Admin updated announcement ID ${id}`,
    });

    res.json({ message: "Announcement updated successfully" });
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    res.status(500).json({ message: "Failed to update announcement" });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];
    if (!["DRAFT", "CANCELLED", "ARCHIVED"].includes(current.status)) {
      return res.status(400).json({
        message: "Only DRAFT, CANCELLED, or ARCHIVED announcements can be deleted",
      });
    }

    await db.query("DELETE FROM announcements WHERE id = ?", [id]);

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_DELETED",
      entityType: "announcements",
      entityId: id,
      oldValues: { title: current.title, status: current.status },
      remarks: `Deleted announcement ID ${id} ("${current.title}")`,
    });

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("deleteAnnouncement error:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
}

// Lifecycle: Publish
async function publishAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];
    if (current.status === "PUBLISHED") {
      return res.status(400).json({ message: "Announcement is already published" });
    }

    await db.query(
      `UPDATE announcements
       SET status = 'PUBLISHED', published_at = NOW()
       WHERE id = ?`,
      [id]
    );

    const { totalTargeted } = await generateRecipientsAndNotifications(id, current.title);

    await logAnnouncementHistory({
      announcementId: id,
      action: "PUBLISHED",
      performedBy: req.user.id,
      previousStatus: current.status,
      newStatus: "PUBLISHED",
      remarks: `Manually published by Admin. Targeted ${totalTargeted} recipients.`,
    });

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_PUBLISHED",
      entityType: "announcements",
      entityId: id,
      oldValues: { status: current.status },
      newValues: { status: "PUBLISHED", totalTargeted },
      remarks: `Admin published announcement ID ${id}`,
    });

    res.json({
      message: "Announcement published successfully",
      totalTargeted,
    });
  } catch (error) {
    console.error("publishAnnouncement error:", error);
    res.status(500).json({ message: "Failed to publish announcement" });
  }
}

// Lifecycle: Schedule
async function scheduleAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { scheduled_at, expires_at } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ message: "Scheduled publish date/time is required" });
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: "Invalid scheduled date/time format" });
    }

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];

    let expiresDate = expires_at ? new Date(expires_at) : current.expires_at;
    if (expiresDate && expiresDate <= scheduledDate) {
      return res.status(400).json({ message: "Expiry date must be after scheduled date" });
    }

    await db.query(
      `UPDATE announcements
       SET status = 'SCHEDULED', scheduled_at = ?, expires_at = ?
       WHERE id = ?`,
      [scheduledDate, expiresDate, id]
    );

    await logAnnouncementHistory({
      announcementId: id,
      action: "SCHEDULED",
      performedBy: req.user.id,
      previousStatus: current.status,
      newStatus: "SCHEDULED",
      remarks: `Scheduled for ${scheduledDate.toISOString()} by Admin`,
    });

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_SCHEDULED",
      entityType: "announcements",
      entityId: id,
      oldValues: { status: current.status },
      newValues: { status: "SCHEDULED", scheduled_at: scheduledDate },
      remarks: `Admin scheduled announcement ID ${id}`,
    });

    res.json({ message: "Announcement scheduled successfully" });
  } catch (error) {
    console.error("scheduleAnnouncement error:", error);
    res.status(500).json({ message: "Failed to schedule announcement" });
  }
}

// Lifecycle: Cancel
async function cancelAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];
    if (["CANCELLED", "ARCHIVED"].includes(current.status)) {
      return res.status(400).json({ message: `Announcement is already ${current.status}` });
    }

    await db.query("UPDATE announcements SET status = 'CANCELLED' WHERE id = ?", [id]);

    await logAnnouncementHistory({
      announcementId: id,
      action: "CANCELLED",
      performedBy: req.user.id,
      previousStatus: current.status,
      newStatus: "CANCELLED",
      remarks: reason || "Cancelled by Admin",
    });

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_CANCELLED",
      entityType: "announcements",
      entityId: id,
      oldValues: { status: current.status },
      newValues: { status: "CANCELLED", reason },
      remarks: `Admin cancelled announcement ID ${id}`,
    });

    res.json({ message: "Announcement cancelled successfully" });
  } catch (error) {
    console.error("cancelAnnouncement error:", error);
    res.status(500).json({ message: "Failed to cancel announcement" });
  }
}

// Lifecycle: Archive
async function archiveAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await db.query("SELECT * FROM announcements WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const current = existing[0];
    await db.query("UPDATE announcements SET status = 'ARCHIVED' WHERE id = ?", [id]);

    await logAnnouncementHistory({
      announcementId: id,
      action: "ARCHIVED",
      performedBy: req.user.id,
      previousStatus: current.status,
      newStatus: "ARCHIVED",
      remarks: "Archived to historical records by Admin",
    });

    await logAudit({
      userId: req.user.id,
      action: "ANNOUNCEMENT_ARCHIVED",
      entityType: "announcements",
      entityId: id,
      oldValues: { status: current.status },
      newValues: { status: "ARCHIVED" },
      remarks: `Admin archived announcement ID ${id}`,
    });

    res.json({ message: "Announcement archived successfully" });
  } catch (error) {
    console.error("archiveAnnouncement error:", error);
    res.status(500).json({ message: "Failed to archive announcement" });
  }
}

// Recipients tracking
async function getAnnouncementRecipients(req, res) {
  try {
    const { id } = req.params;
    const { read_status, search, page = 1, limit = 25 } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let query = `
      SELECT ar.id, ar.announcement_id, ar.user_id, ar.read_status, ar.read_at, ar.created_at,
             u.employee_code, u.first_name, u.last_name, u.email,
             d.name as department_name
      FROM announcement_recipients ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ar.announcement_id = ?
    `;
    const params = [id];

    if (read_status && read_status !== "ALL") {
      query += ` AND ar.read_status = ?`;
      params.push(read_status);
    }

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await db.query(countQuery, params);

    query += ` ORDER BY ar.read_status DESC, ar.read_at DESC, u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);

    res.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getAnnouncementRecipients error:", error);
    res.status(500).json({ message: "Failed to fetch announcement recipients" });
  }
}

// Read status breakdown
async function getAnnouncementReadStatus(req, res) {
  try {
    const { id } = req.params;

    const [[overall]] = await db.query(
      `SELECT
         COUNT(*) as total_recipients,
         SUM(CASE WHEN read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
         SUM(CASE WHEN read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
       FROM announcement_recipients
       WHERE announcement_id = ?`,
      [id]
    );

    const [deptBreakdown] = await db.query(
      `SELECT
         d.name as department_name,
         COUNT(ar.id) as total,
         SUM(CASE WHEN ar.read_status = 'READ' THEN 1 ELSE 0 END) as read_count,
         SUM(CASE WHEN ar.read_status = 'UNREAD' THEN 1 ELSE 0 END) as unread_count
       FROM announcement_recipients ar
       JOIN users u ON ar.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ar.announcement_id = ?
       GROUP BY d.id, d.name`,
      [id]
    );

    const total = overall.total_recipients || 0;
    const read = overall.read_count || 0;
    const unread = overall.unread_count || 0;
    const rate = total > 0 ? Math.round((read / total) * 100) : 0;

    res.json({
      summary: {
        total_recipients: total,
        read_count: read,
        unread_count: unread,
        read_rate_percentage: rate,
      },
      departments: deptBreakdown.map((d) => ({
        ...d,
        read_rate: d.total > 0 ? Math.round((d.read_count / d.total) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error("getAnnouncementReadStatus error:", error);
    res.status(500).json({ message: "Failed to fetch read status" });
  }
}

module.exports = {
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
};
