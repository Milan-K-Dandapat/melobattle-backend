const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

/* =========================================
   GLOBAL LIMIT
========================================= */
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Please try again later."
});

/* =========================================
   AUTH LIMIT
========================================= */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later."
  }
});

/* =========================================
   WITHDRAWAL LIMIT
========================================= */
exports.withdrawLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many withdrawal attempts. Please try again after an hour."
  }
});

/* =========================================
   SLOW DOWN
========================================= */
exports.speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500
});