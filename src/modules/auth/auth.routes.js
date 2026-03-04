const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { authLimiter } = require("../../middleware/rateLimit.middleware");

// Using your rate limiter to prevent brute-force token spam
router.post("/google", authLimiter, authController.googleLogin);

module.exports = router;