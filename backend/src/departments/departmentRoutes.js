const express = require("express");
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} = require("./departmentController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Viewing departments is accessible to all authenticated users; creating/editing requires ADMIN
router.use(authenticate);

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", requireRole("ADMIN"), createDepartment);
router.put("/:id", requireRole("ADMIN"), updateDepartment);

module.exports = router;
