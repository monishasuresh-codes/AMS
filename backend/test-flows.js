const db = require("./src/config/database");
const { hashPassword } = require("./src/auth/authService");
const { checkAndProcessLifecycle } = require("./src/services/schedulerService");

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING ANNOUNCEMENT MANAGEMENT SYSTEM TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Verify Admin account exists
    const [adminUser] = await db.query("SELECT * FROM users WHERE email = 'admin@gmail.com'");
    assert(adminUser.length > 0 && adminUser[0].role === 'ADMIN', "Admin account exists with ADMIN role (admin@gmail.com)");

    // Create temporary test employees for targeting and lifecycle tests
    const dummyHash = await hashPassword("Test@123");
    const [tEmp1] = await db.query(
      `INSERT INTO users (employee_code, first_name, last_name, email, password_hash, role, department_id, is_active)
       VALUES ('TEST001', 'Test', 'User 1', 'test.emp1@ams.com', ?, 'EMPLOYEE', 2, 1)`,
      [dummyHash]
    );
    const [tEmp2] = await db.query(
      `INSERT INTO users (employee_code, first_name, last_name, email, password_hash, role, department_id, is_active)
       VALUES ('TEST002', 'Test', 'User 2', 'test.emp2@ams.com', ?, 'EMPLOYEE', 2, 1)`,
      [dummyHash]
    );
    const [tEmp3] = await db.query(
      `INSERT INTO users (employee_code, first_name, last_name, email, password_hash, role, department_id, is_active)
       VALUES ('TEST003', 'Test', 'User 3', 'test.emp3@ams.com', ?, 'EMPLOYEE', 3, 1)`,
      [dummyHash]
    );

    const emp1Id = tEmp1.insertId;
    const emp2Id = tEmp2.insertId;
    const emp3Id = tEmp3.insertId;

    // 2. Targeting Resolution Tests
    const { resolveRecipientsForAnnouncement, generateRecipientsAndNotifications } = require("./src/services/recipientService");

    // Create a test announcement targeted to department ID: 2
    const [deptAnn] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by)
       VALUES ('Test Dept Targeting', 'General', 'Test description', 'NORMAL', 'DRAFT', 1)`
    );
    const deptAnnId = deptAnn.insertId;

    await db.query(
      "INSERT INTO announcement_targets (announcement_id, target_type, department_id) VALUES (?, 'DEPARTMENT', 2)",
      [deptAnnId]
    );

    const deptRecipients = await resolveRecipientsForAnnouncement(deptAnnId);
    assert(deptRecipients.includes(emp1Id) && deptRecipients.includes(emp2Id), "Department targeting correctly resolves all active members of department");
    assert(!deptRecipients.includes(emp3Id), "Department targeting excludes users from other departments");

    // 3. Specific User Targeting Test
    const [userAnn] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by)
       VALUES ('Test User Targeting', 'General', 'Test description', 'NORMAL', 'DRAFT', 1)`
    );
    const userAnnId = userAnn.insertId;
    await db.query(
      "INSERT INTO announcement_targets (announcement_id, target_type, user_id) VALUES (?, 'USER', ?)",
      [userAnnId, emp3Id]
    );

    const userRecipients = await resolveRecipientsForAnnouncement(userAnnId);
    assert(userRecipients.length === 1 && userRecipients[0] === emp3Id, "User targeting strictly resolves only explicitly selected user ID");

    // 4. Idempotency of recipient and notification generation
    await generateRecipientsAndNotifications(userAnnId, "Test User Targeting");
    const [rCount1] = await db.query("SELECT COUNT(*) as cnt FROM announcement_recipients WHERE announcement_id = ?", [userAnnId]);
    await generateRecipientsAndNotifications(userAnnId, "Test User Targeting"); // Run again
    const [rCount2] = await db.query("SELECT COUNT(*) as cnt FROM announcement_recipients WHERE announcement_id = ?", [userAnnId]);
    assert(rCount1[0].cnt === rCount2[0].cnt, "Recipient generation is idempotent (no duplicates created on multiple runs)");

    // 5. Scheduler Lifecycle Test: Scheduled -> Published
    const [schedAnn] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by, scheduled_at)
       VALUES ('Scheduler Auto Test', 'General', 'Testing auto publish', 'NORMAL', 'SCHEDULED', 1, NOW() - INTERVAL 1 MINUTE)`
    );
    const schedAnnId = schedAnn.insertId;
    await db.query("INSERT INTO announcement_targets (announcement_id, target_type) VALUES (?, 'ALL')", [schedAnnId]);

    // Run scheduler cycle
    await checkAndProcessLifecycle();

    const [updatedSched] = await db.query("SELECT status, published_at FROM announcements WHERE id = ?", [schedAnnId]);
    assert(updatedSched[0].status === 'PUBLISHED', "Scheduler automatically transitions SCHEDULED -> PUBLISHED when server time passes scheduled_at");
    assert(updatedSched[0].published_at !== null, "Scheduler records server-side published_at timestamp");

    // 6. Scheduler Lifecycle Test: Published -> Expired
    const [expAnn] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by, published_at, expires_at)
       VALUES ('Scheduler Expire Test', 'General', 'Testing auto expiry', 'NORMAL', 'PUBLISHED', 1, NOW() - INTERVAL 10 MINUTE, NOW() - INTERVAL 1 MINUTE)`
    );
    const expAnnId = expAnn.insertId;

    await checkAndProcessLifecycle();
    const [updatedExp] = await db.query("SELECT status FROM announcements WHERE id = ?", [expAnnId]);
    assert(updatedExp[0].status === 'EXPIRED', "Scheduler automatically transitions PUBLISHED -> EXPIRED when server time passes expires_at");

    // 7. Independent Read Tracking Test
    const [readTestAnn] = await db.query(
      `INSERT INTO announcements (title, category, description, priority, status, created_by, published_at)
       VALUES ('Read Tracking Test', 'General', 'Testing read isolation', 'NORMAL', 'PUBLISHED', 1, NOW())`
    );
    const readTestId = readTestAnn.insertId;
    await generateRecipientsAndNotifications(readTestId, "Read Tracking Test");

    // Mark read for emp1Id
    await db.query(
      "UPDATE announcement_recipients SET read_status = 'READ', read_at = NOW() WHERE announcement_id = ? AND user_id = ?",
      [readTestId, emp1Id]
    );

    const [u1Rec] = await db.query(
      "SELECT read_status, read_at FROM announcement_recipients WHERE announcement_id = ? AND user_id = ?",
      [readTestId, emp1Id]
    );
    const [u2Rec] = await db.query(
      "SELECT read_status, read_at FROM announcement_recipients WHERE announcement_id = ? AND user_id = ?",
      [readTestId, emp2Id]
    );

    assert(u1Rec[0].read_status === 'READ' && u1Rec[0].read_at !== null, "User 1 has independent READ state with server timestamp");
    assert(u2Rec[0].read_status === 'UNREAD' && u2Rec[0].read_at === null, "User 2 remains UNREAD (read state is strictly per-recipient, not per-announcement)");

    // 8. Clean up test records
    await db.query("DELETE FROM announcements WHERE id IN (?, ?, ?, ?, ?)", [
      deptAnnId,
      userAnnId,
      schedAnnId,
      expAnnId,
      readTestId,
    ]);
    await db.query("DELETE FROM users WHERE id IN (?, ?, ?)", [emp1Id, emp2Id, emp3Id]);

    console.log("==================================================");
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runTests();
