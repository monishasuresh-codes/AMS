const db = require("../config/database");
const { logAudit } = require("../services/auditService");

async function getDepartments(req, res) {
  try {
    const [departments] = await db.query(`
      SELECT d.id, d.name, d.description, d.is_active, d.created_at,
             COUNT(u.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id AND u.is_active = 1
      GROUP BY d.id
      ORDER BY d.name ASC
    `);

    res.json({ data: departments });
  } catch (error) {
    console.error("getDepartments error:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
}

async function getDepartmentById(req, res) {
  try {
    const { id } = req.params;
    const [departments] = await db.query(
      `SELECT d.id, d.name, d.description, d.is_active, d.created_at,
              COUNT(u.id) as employee_count
       FROM departments d
       LEFT JOIN users u ON d.id = u.department_id AND u.is_active = 1
       WHERE d.id = ?
       GROUP BY d.id`,
      [id]
    );

    if (departments.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ department: departments[0] });
  } catch (error) {
    console.error("getDepartmentById error:", error);
    res.status(500).json({ message: "Failed to fetch department" });
  }
}

async function createDepartment(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const [existing] = await db.query("SELECT id FROM departments WHERE name = ?", [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "A department with this name already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO departments (name, description, is_active) VALUES (?, ?, 1)",
      [name.trim(), description ? description.trim() : null]
    );

    await logAudit({
      userId: req.user.id,
      action: "DEPARTMENT_CREATED",
      entityType: "departments",
      entityId: result.insertId,
      newValues: { name: name.trim(), description },
      remarks: `Created department ${name.trim()}`,
    });

    res.status(201).json({
      message: "Department created successfully",
      department: { id: result.insertId, name: name.trim(), description, is_active: 1 },
    });
  } catch (error) {
    console.error("createDepartment error:", error);
    res.status(500).json({ message: "Failed to create department" });
  }
}

async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const [existing] = await db.query("SELECT * FROM departments WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    await db.query(
      `UPDATE departments
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: "DEPARTMENT_UPDATED",
      entityType: "departments",
      entityId: id,
      oldValues: existing[0],
      newValues: { name, description, is_active },
      remarks: `Updated department ID ${id}`,
    });

    res.json({ message: "Department updated successfully" });
  } catch (error) {
    console.error("updateDepartment error:", error);
    res.status(500).json({ message: "Failed to update department" });
  }
}

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
};
