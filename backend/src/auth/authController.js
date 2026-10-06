const db = require("../config/database");
const {
  comparePassword,
  generateToken,
  hashPassword,
} = require("./authService");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [users] = await db.execute(
      `SELECT u.id, u.employee_code, u.first_name, u.last_name,
              u.email, u.password_hash, u.role, u.role_id, u.department_id, u.is_active,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact an Administrator.",
      });
    }

    const passwordMatch = await comparePassword(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Fetch permissions
    const [perms] = await db.query(
      `SELECT p.name
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [user.role_id || (user.role === 'ADMIN' ? 1 : 2)]
    );

    const permissions = perms.map((p) => p.name);
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        employee_code: user.employee_code,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        permissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error during authentication",
    });
  }
}

async function getMe(req, res) {
  try {
    res.json({
      user: {
        id: req.user.id,
        employee_code: req.user.employee_code,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email,
        role: req.user.role,
        department_id: req.user.department_id,
        department_name: req.user.department_name,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
}

async function logout(req, res) {
  // Stateless JWT logout ack
  res.json({ message: "Logout successful" });
}

async function updateProfile(req, res) {
  try {
    const { first_name, last_name, current_password, new_password } = req.body;
    const userId = req.user.id;

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: "Current password required to set new password" });
      }
      const [u] = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
      const match = await comparePassword(current_password, u[0].password_hash);
      if (!match) {
        return res.status(400).json({ message: "Current password does not match" });
      }
      const newHash = await hashPassword(new_password);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
    }

    if (first_name || last_name) {
      await db.query(
        "UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name) WHERE id = ?",
        [first_name || null, last_name || null, userId]
      );
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
}

module.exports = {
  login,
  getMe,
  logout,
  updateProfile,
};