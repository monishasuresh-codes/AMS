const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "ams-development-secret";

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Verify user exists and is active
    const [users] = await db.execute(
      `SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email,
              u.role, u.role_id, u.department_id, u.is_active,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ message: "User account has been deactivated" });
    }

    // Fetch user permissions
    const [perms] = await db.query(
      `SELECT p.name
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [user.role_id || (user.role === 'ADMIN' ? 1 : 2)]
    );

    user.permissions = perms.map((p) => p.name);
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication failure" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: requires one of roles [${roles.join(", ")}]`,
      });
    }
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // Admin has superuser bypass
    if (req.user.role === "ADMIN") {
      return next();
    }
    const hasPerm = permissions.some((p) => req.user.permissions?.includes(p));
    if (!hasPerm) {
      return res.status(403).json({
        message: `Forbidden: requires permission [${permissions.join(", ")}]`,
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
};
