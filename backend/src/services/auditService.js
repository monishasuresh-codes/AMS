const db = require("../config/database");

async function logAudit({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  remarks = null,
}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        remarks,
      ]
    );
  } catch (err) {
    console.error("Failed to log audit event:", err.message);
  }
}

async function logAnnouncementHistory({
  announcementId,
  action,
  performedBy,
  previousStatus = null,
  newStatus = null,
  remarks = null,
}) {
  try {
    await db.query(
      `INSERT INTO announcement_history (announcement_id, action, performed_by, previous_status, new_status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [announcementId, action, performedBy, previousStatus, newStatus, remarks]
    );
  } catch (err) {
    console.error("Failed to log announcement history:", err.message);
  }
}

module.exports = {
  logAudit,
  logAnnouncementHistory,
};
