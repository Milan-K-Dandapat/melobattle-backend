const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const { ipKeyGenerator } = require("express-rate-limit");

/* =========================================
   GLOBAL LIMIT
========================================= */
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  message: "Too many requests. Please try again later."
});
/* =========================================
   AUTH LIMIT (Login / Create User)
========================================= */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // 🔥 CRITICAL FIX
  message: {
    success: false,
    message: "Too many login attempts. Try again later."
  }
});

/* =========================================
   WITHDRAWAL LIMIT
   🔥 FIXED: Increased max from 5 to 50 for testing.
   🔥 FIXED: Changed message to JSON object for frontend sync.
========================================= */
exports.withdrawLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many withdrawal attempts. Please try again after an hour."
  }
});

/* =========================================
   SLOW DOWN HEAVY USERS
========================================= */
exports.speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500
});