const db = require("../config/database");

async function getAuditLogs(req, res) {
  try {
    const { action, entity_type, user_id, page = 1, limit = 25 } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let query = `
      SELECT al.*,
             u.employee_code, u.first_name, u.last_name, u.email, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action && action !== "ALL") {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (entity_type && entity_type !== "ALL") {
      query += ` AND al.entity_type = ?`;
      params.push(entity_type);
    }

    if (user_id) {
      query += ` AND al.user_id = ?`;
      params.push(user_id);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
    const [[{ total }]] = await db.query(countQuery, params);

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
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
    console.error("getAuditLogs error:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
}

module.exports = {
  getAuditLogs,
};
