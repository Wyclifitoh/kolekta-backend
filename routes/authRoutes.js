const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  updateUserPassword,
  updateUser,
} = require("../controllers/authController");

// Register route
router.post("/register", register);

// Login route
router.post("/login", login);

// Forgot Password route
router.post("/forgot-password", forgotPassword);

// Reset Password route
router.post("/reset-password", resetPassword);

// Refresh Token route
router.post("/refresh-token", refreshToken);

// Logout route
router.post("/logout", authenticateToken, logout);

router.put("/update-password", authenticateToken, updateUserPassword);

router.put("/update-user", authenticateToken, updateUser);

module.exports = router;
