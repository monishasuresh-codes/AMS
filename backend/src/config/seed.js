const db = require("./database");
const bcrypt = require("bcryptjs");

async function seed() {
  console.log("Starting database seeding...");

  try {
    // 1. Roles
    await db.query(`
      INSERT INTO roles (id, name, description) VALUES
      (1, 'ADMIN', 'Full system access and management privileges'),
      (2, 'EMPLOYEE', 'Standard employee view and interaction privileges')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)
    `);
    console.log("Roles verified.");

    // 2. Departments (Custom organizational units)
    const departments = [
      [1, "Administration", "Core organizational leadership and administration", 1],
      [2, "3D Asset Creator", "3D modeling, texturing, and asset production", 1],
      [3, "3D Generalist", "General 3D pipeline, lighting, and rendering", 1],
      [4, "AI Developer", "Artificial intelligence and machine learning engineering", 1],
      [5, "Computer Vision Developer", "Computer vision models, image processing, and spatial computing", 1],
      [6, "Developer", "Core software and applications development", 1],
      [7, "Embedded Developer", "Firmware, microcontrollers, and hardware integration", 1],
      [8, "Fullstack Developer", "Web, API services, and cloud architecture", 1],
      [9, "Junior Compositor", "Visual effects, layering, and post-production compositing", 1],
      [10, "Manager", "Team management, operations, and leadership", 1],
      [11, "Project Coordinator", "Project scheduling, sprint tracking, and deliverables", 1],
      [12, "Python Developer", "Python automation, data pipelines, and backend services", 1],
      [13, "UI/UX Designer", "Product design, user research, and interface design", 1],
      [14, "Unity Developer", "Unity real-time engine and interactive experiences", 1],
      [15, "Unreal Developer", "Unreal Engine graphics, simulation, and game mechanics", 1],
      [16, "XR Developer", "Extended reality, VR/AR spatial applications", 1]
    ];

    for (const [id, name, desc, active] of departments) {
      await db.query(`
        INSERT INTO departments (id, name, description, is_active)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), is_active=VALUES(is_active)
      `, [id, name, desc, active]);
    }
    console.log("Departments verified.");

    // 3. Permissions
    const permissions = [
      [1, 'ANNOUNCEMENT_VIEW', 'View announcements'],
      [2, 'ANNOUNCEMENT_CREATE', 'Create announcements'],
      [3, 'ANNOUNCEMENT_EDIT', 'Edit announcements'],
      [4, 'ANNOUNCEMENT_DELETE', 'Delete announcements'],
      [5, 'ANNOUNCEMENT_SCHEDULE', 'Schedule announcements'],
      [6, 'ANNOUNCEMENT_PUBLISH', 'Publish announcements'],
      [7, 'ANNOUNCEMENT_CANCEL', 'Cancel announcements'],
      [8, 'ANNOUNCEMENT_ARCHIVE', 'Archive announcements'],
      [9, 'ANNOUNCEMENT_TARGET', 'Manage announcement targeting'],
      [10, 'ANNOUNCEMENT_ATTACHMENT_UPLOAD', 'Upload announcement attachments'],
      [11, 'EMPLOYEE_VIEW', 'View employees'],
      [12, 'EMPLOYEE_CREATE', 'Create employees'],
      [13, 'EMPLOYEE_EDIT', 'Edit employees'],
      [14, 'EMPLOYEE_DEACTIVATE', 'Deactivate employees'],
      [15, 'DEPARTMENT_VIEW', 'View departments'],
      [16, 'DEPARTMENT_CREATE', 'Create departments'],
      [17, 'DEPARTMENT_EDIT', 'Edit departments'],
      [18, 'DEPARTMENT_DEACTIVATE', 'Deactivate departments'],
      [19, 'TRACKING_VIEW', 'View announcement read tracking'],
      [20, 'RECIPIENT_VIEW', 'View announcement recipients'],
      [21, 'QUERY_VIEW_OWN', 'View own announcement queries'],
      [22, 'QUERY_CREATE', 'Create announcement queries'],
      [23, 'QUERY_REPLY_OWN', 'Reply to own queries'],
      [24, 'QUERY_MANAGE', 'Manage employee queries'],
      [25, 'QUERY_REPLY', 'Reply to employee queries'],
      [26, 'QUERY_CLOSE', 'Close employee queries'],
      [27, 'REPORT_VIEW', 'View reports'],
      [28, 'AUDIT_VIEW', 'View audit logs']
    ];

    for (const [id, name, desc] of permissions) {
      await db.query(`
        INSERT INTO permissions (id, name, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)
      `, [id, name, desc]);
    }

    // Role permissions mapping
    await db.query("DELETE FROM role_permissions");
    for (let pId = 1; pId <= 28; pId++) {
      await db.query("INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [pId]);
    }
    const empPermissions = [1, 19, 20, 21, 22, 23];
    for (const pId of empPermissions) {
      await db.query("INSERT INTO role_permissions (role_id, permission_id) VALUES (2, ?)", [pId]);
    }
    console.log("Permissions and mappings seeded.");

    // 4. Single System Admin User
    const adminPass = await bcrypt.hash("123456", 10);

    await db.query(`
      INSERT INTO users (id, employee_code, first_name, last_name, email, password_hash, department_id, role, role_id, is_active)
      VALUES (1, 'ADM001', 'System', 'Admin', 'admin@gmail.com', ?, 1, 'ADMIN', 1, 1)
      ON DUPLICATE KEY UPDATE
        employee_code=VALUES(employee_code),
        first_name=VALUES(first_name),
        last_name=VALUES(last_name),
        password_hash=VALUES(password_hash),
        department_id=VALUES(department_id),
        role=VALUES(role),
        role_id=VALUES(role_id),
        is_active=VALUES(is_active)
    `, [adminPass]);
    console.log("Single Admin user seeded (admin@gmail.com).");

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
