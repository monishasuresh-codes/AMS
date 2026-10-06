const cron = require("node-cron");
const db = require("../config/database");
const { generateRecipientsAndNotifications } = require("./recipientService");
const { logAnnouncementHistory, logAudit } = require("./auditService");

let isRunning = false;

async function checkAndProcessLifecycle() {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Process SCHEDULED announcements that reached or passed scheduled_at
    const [scheduledList] = await db.query(
      `SELECT id, title, scheduled_at, created_by
       FROM announcements
       WHERE status = 'SCHEDULED' AND scheduled_at <= NOW()`
    );

    for (const ann of scheduledList) {
      console.log(`[Scheduler] Publishing scheduled announcement ID ${ann.id} ("${ann.title}")...`);

      // Update announcement status
      await db.query(
        `UPDATE announcements
         SET status = 'PUBLISHED', published_at = NOW()
         WHERE id = ? AND status = 'SCHEDULED'`,
        [ann.id]
      );

      // Generate recipients and notifications
      const { totalTargeted } = await generateRecipientsAndNotifications(ann.id, ann.title);

      // Log announcement history
      await logAnnouncementHistory({
        announcementId: ann.id,
        action: "AUTO_PUBLISHED",
        performedBy: ann.created_by || 1,
        previousStatus: "SCHEDULED",
        newStatus: "PUBLISHED",
        remarks: `Automatically published by server scheduler at scheduled time. Targeted ${totalTargeted} recipients.`,
      });

      // Log audit
      await logAudit({
        userId: ann.created_by || 1,
        action: "ANNOUNCEMENT_AUTO_PUBLISHED",
        entityType: "announcements",
        entityId: ann.id,
        oldValues: { status: "SCHEDULED" },
        newValues: { status: "PUBLISHED", published_at: new Date() },
        remarks: `Scheduler auto-publish executed. Recipients generated: ${totalTargeted}.`,
      });
    }

    // 2. Process PUBLISHED announcements that reached or passed expires_at
    const [expiredList] = await db.query(
      `SELECT id, title, expires_at, created_by
       FROM announcements
       WHERE status = 'PUBLISHED' AND expires_at IS NOT NULL AND expires_at <= NOW()`
    );

    for (const ann of expiredList) {
      console.log(`[Scheduler] Expiring announcement ID ${ann.id} ("${ann.title}")...`);

      await db.query(
        `UPDATE announcements
         SET status = 'EXPIRED'
         WHERE id = ? AND status = 'PUBLISHED'`,
        [ann.id]
      );

      // Log history
      await logAnnouncementHistory({
        announcementId: ann.id,
        action: "AUTO_EXPIRED",
        performedBy: ann.created_by || 1,
        previousStatus: "PUBLISHED",
        newStatus: "EXPIRED",
        remarks: "Automatically expired by server scheduler at expiration time.",
      });

      // Log audit
      await logAudit({
        userId: ann.created_by || 1,
        action: "ANNOUNCEMENT_AUTO_EXPIRED",
        entityType: "announcements",
        entityId: ann.id,
        oldValues: { status: "PUBLISHED" },
        newValues: { status: "EXPIRED" },
        remarks: "Scheduler auto-expire executed.",
      });
    }
  } catch (error) {
    console.error("[Scheduler] Error running lifecycle check:", error);
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  console.log("[Scheduler] Background scheduler initialized (runs every 30 seconds).");
  // Run once immediately on start
  checkAndProcessLifecycle();

  // Run every 30 seconds
  const task = cron.schedule("*/30 * * * * *", () => {
    checkAndProcessLifecycle();
  });

  return task;
}

module.exports = {
  startScheduler,
  checkAndProcessLifecycle,
};
