const db = require("../config/database");
const { hashPassword } = require("../auth/authService");
const { logAudit } = require("../services/auditService");

async function getUsers(req, res) {
  try {
    const { search, department_id, role, is_active, page = 1, limit = 20 } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    let query = `
      SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email,
             u.role, u.role_id, u.department_id, u.is_active, u.created_at,
             d.name as department_name,
             (SELECT COUNT(*) FROM announcement_recipients ar WHERE ar.user_id = u.id) as total_announcements_received,
             (SELECT COUNT(*) FROM announcement_recipients ar WHERE ar.user_id = u.id AND ar.read_status = 'READ') as total_announcements_read
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (department_id) {
      query += ` AND u.department_id = ?`;
      params.push(department_id);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (is_active !== undefined && is_active !== "") {
      query += ` AND u.is_active = ?`;
      params.push(is_active === "true" || is_active === "1" ? 1 : 0);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await db.query(countQuery, params);

    query += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
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
    console.error("getUsers error:", error);
    res.status(500).json({ message: "Failed to retrieve users" });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const [users] = await db.execute(
      `SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email,
              u.role, u.role_id, u.department_id, u.is_active, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Fetch announcements received by this user
    const [announcements] = await db.query(
      `SELECT a.id, a.title, a.category, a.priority, a.status, a.published_at,
              ar.read_status, ar.read_at
       FROM announcement_recipients ar
       JOIN announcements a ON ar.announcement_id = a.id
       WHERE ar.user_id = ?
       ORDER BY a.published_at DESC LIMIT 20`,
      [id]
    );

    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) as total_received,
         SUM(CASE WHEN read_status = 'READ' THEN 1 ELSE 0 END) as total_read,
         SUM(CASE WHEN read_status = 'UNREAD' THEN 1 ELSE 0 END) as total_unread
       FROM announcement_recipients
       WHERE user_id = ?`,
      [id]
    );

    res.json({
      user,
      stats: {
        total_received: stats.total_received || 0,
        total_read: stats.total_read || 0,
        total_unread: stats.total_unread || 0,
        read_percentage: stats.total_received > 0 ? Math.round((stats.total_read / stats.total_received) * 100) : 0,
      },
      recentAnnouncements: announcements,
    });
  } catch (error) {
    console.error("getUserById error:", error);
    res.status(500).json({ message: "Failed to retrieve user details" });
  }
}

async function createUser(req, res) {
  try {
    const {
      employee_code,
      first_name,
      last_name,
      email,
      password,
      department_id,
      role = "EMPLOYEE",
    } = req.body;

    if (!employee_code || !first_name || !email || !password || !department_id) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check duplicate email or employee_code
    const [existing] = await db.query(
      `SELECT id, email, employee_code FROM users WHERE email = ? OR employee_code = ?`,
      [email.trim().toLowerCase(), employee_code.trim()]
    );

    if (existing.length > 0) {
      if (existing[0].email === email.trim().toLowerCase()) {
        return res.status(400).json({ message: "An employee with this email already exists" });
      }
      return res.status(400).json({ message: "An employee with this code already exists" });
    }

    const role_id = role === "ADMIN" ? 1 : 2;
    const password_hash = await hashPassword(password);

    const [result] = await db.query(
      `INSERT INTO users (employee_code, first_name, last_name, email, password_hash, department_id, role, role_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        employee_code.trim().toUpperCase(),
        first_name.trim(),
        last_name ? last_name.trim() : "",
        email.trim().toLowerCase(),
        password_hash,
        department_id,
        role,
        role_id,
      ]
    );

    const newUserId = result.insertId;

    await logAudit({
      userId: req.user.id,
      action: "USER_CREATED",
      entityType: "users",
      entityId: newUserId,
      newValues: { employee_code, email, first_name, last_name, department_id, role },
      remarks: `Admin provisioned new employee ${employee_code} (${email})`,
    });

    res.status(201).json({
      message: "Employee provisioned successfully",
      user: {
        id: newUserId,
        employee_code,
        first_name,
        last_name,
        email,
        department_id,
        role,
      },
    });
  } catch (error) {
    console.error("createUser error:", error);
    res.status(500).json({ message: "Failed to create employee" });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, department_id, role, password } = req.body;

    const [existing] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldUser = existing[0];
    const role_id = role ? (role === "ADMIN" ? 1 : 2) : oldUser.role_id;

    let passwordHash = oldUser.password_hash;
    if (password && password.trim()) {
      passwordHash = await hashPassword(password.trim());
    }

    await db.query(
      `UPDATE users
       SET first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           email = COALESCE(?, email),
           department_id = COALESCE(?, department_id),
           role = COALESCE(?, role),
           role_id = COALESCE(?, role_id),
           password_hash = ?
       WHERE id = ?`,
      [
        first_name || null,
        last_name !== undefined ? last_name : null,
        email || null,
        department_id || null,
        role || null,
        role_id,
        passwordHash,
        id,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: "USER_UPDATED",
      entityType: "users",
      entityId: id,
      oldValues: { first_name: oldUser.first_name, email: oldUser.email, role: oldUser.role },
      newValues: { first_name, email, role },
      remarks: `Admin updated employee profile ID ${id}`,
    });

    res.json({ message: "Employee updated successfully" });
  } catch (error) {
    console.error("updateUser error:", error);
    res.status(500).json({ message: "Failed to update employee" });
  }
}

async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [existing] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentActive = existing[0].is_active;
    const newStatus = is_active !== undefined ? (is_active ? 1 : 0) : (currentActive ? 0 : 1);

    await db.query("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, id]);

    await logAudit({
      userId: req.user.id,
      action: newStatus ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entityType: "users",
      entityId: id,
      oldValues: { is_active: currentActive },
      newValues: { is_active: newStatus },
      remarks: `Admin ${newStatus ? "activated" : "deactivated"} employee ID ${id}`,
    });

    res.json({
      message: `Employee successfully ${newStatus ? "activated" : "deactivated"}`,
      is_active: newStatus,
    });
  } catch (error) {
    console.error("toggleUserStatus error:", error);
    res.status(500).json({ message: "Failed to modify employee status" });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    const [existing] = await db.query("SELECT * FROM users WHERE id = ?", [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userToDelete = existing[0];

    // Prevent deleting your own logged-in admin account
    if (req.user.id === targetUserId) {
      return res.status(400).json({ message: "You cannot delete your own logged-in admin account" });
    }

    // Prevent deleting the sole remaining active administrator
    if (userToDelete.role === "ADMIN") {
      const [[{ adminCount }]] = await db.query(
        "SELECT COUNT(*) as adminCount FROM users WHERE role = 'ADMIN' AND is_active = 1"
      );
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the sole active administrator account" });
      }
    }

    // Reassign administrative creations & audit references to the requesting admin
    await db.query("UPDATE announcements SET created_by = ? WHERE created_by = ?", [req.user.id, targetUserId]);
    await db.query("UPDATE announcement_attachments SET uploaded_by = ? WHERE uploaded_by = ?", [req.user.id, targetUserId]);
    await db.query("UPDATE announcement_history SET performed_by = ? WHERE performed_by = ?", [req.user.id, targetUserId]);
    await db.query("UPDATE audit_logs SET user_id = ? WHERE user_id = ?", [req.user.id, targetUserId]);

    // Clean up relational child records
    await db.query("DELETE FROM notifications WHERE user_id = ?", [targetUserId]);
    await db.query("DELETE FROM announcement_recipients WHERE user_id = ?", [targetUserId]);
    await db.query("DELETE FROM announcement_targets WHERE user_id = ?", [targetUserId]);
    await db.query("DELETE FROM announcement_query_messages WHERE sender_id = ?", [targetUserId]);
    await db.query("DELETE FROM announcement_queries WHERE employee_id = ?", [targetUserId]);

    // Permanently remove the user
    await db.query("DELETE FROM users WHERE id = ?", [targetUserId]);

    await logAudit({
      userId: req.user.id,
      action: "USER_DELETED",
      entityType: "users",
      entityId: targetUserId,
      oldValues: { email: userToDelete.email, role: userToDelete.role, code: userToDelete.employee_code },
      remarks: `Admin permanently deleted ${userToDelete.role} account ${userToDelete.employee_code} (${userToDelete.email})`,
    });

    res.json({
      message: `User ${userToDelete.first_name} ${userToDelete.last_name || ""} (${userToDelete.email}) deleted successfully`,
      deleted_user_id: targetUserId,
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    res.status(500).json({ message: "Failed to delete user account" });
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
