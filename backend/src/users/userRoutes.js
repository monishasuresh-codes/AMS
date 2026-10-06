const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} = require("./userController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// All user management routes require ADMIN
router.use(authenticate, requireRole("ADMIN"));

router.get("/", getUsers);
router.post("/", createUser);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.patch("/:id/status", toggleUserStatus);
router.delete("/:id", deleteUser);

module.exports = router;
