const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ams-development-secret";

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, passwordHash) {
  return await bcrypt.compare(password, passwordHash);
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
};