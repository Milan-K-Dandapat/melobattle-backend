const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const { protect } = require("../../middleware/auth.middleware");
const { authLimiter } = require("../../middleware/rateLimit.middleware");

/* =========================================
   1. AUTHENTICATION (Public with Limiter)
========================================= */

// @route   POST /api/user/create
// @desc    Create or Login user via Firebase ID Token
router.post(
  "/create",
  authLimiter, // Applied rate limiting for security
  userController.createUser
);

/* =========================================
   2. PROFILE MANAGEMENT (Protected)
========================================= */

// @route   GET /api/user/profile
// @desc    Get the currently logged-in user's profile
router.get(
  "/profile", 
  protect, 
  userController.getProfile
);

/**
 * 🔥 NEW: Fetch specific profile by ID
 * Linked to the new getProfileById function to show participant names
 */
router.get(
  "/profile/:id", 
  protect, 
  userController.getProfileById
);

// @route   PUT /api/user/profile
// @desc    Update unique username and cartoon avatar
router.put(
  "/profile", 
  protect, 
  userController.updateProfile
);

// @route   GET /api/user/:id
// @desc    View another player's profile (Fallback Public view)
router.get(
  "/:id", 
  protect,
  userController.getProfileById
);

module.exports = router;