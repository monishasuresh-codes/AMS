const db = require("./src/config/database");
const { hashPassword } = require("./src/auth/authService");

async function createAdmin() {
  try {
    const passwordHash = await hashPassword("Admin@123");

    const [result] = await db.execute(
      `INSERT INTO users
      (employee_code, first_name, last_name, email, password_hash, department_id, role, role_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "ADM001",
        "System",
        "Admin",
        "admin@ams.com",
        passwordHash,
        1,
        "ADMIN",
        1,
      ]
    );

    console.log("Admin created successfully. ID:", result.insertId);

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    process.exit(1);
  }
}

createAdmin();