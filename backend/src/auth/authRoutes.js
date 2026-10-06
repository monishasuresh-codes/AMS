const express = require("express");
const { login, getMe, logout, updateProfile } = require("./authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);

module.exports = router;