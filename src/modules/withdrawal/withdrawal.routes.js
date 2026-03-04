const express = require("express");
const router = express.Router();

// 🔥 CRITICAL SYNC: Import walletController where the deduction logic lives
const walletController = require("../wallet/wallet.controller");
const withdrawalService = require("./withdrawal.service");

// 🔥 FIXED: Destructure 'protect' from the middleware file
const { protect } = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

// Handle the case where rate limiter might not be exported correctly
const rateLimit = require("../../middleware/rateLimit.middleware");
const withdrawLimiter = rateLimit.withdrawLimiter || ((req, res, next) => next());

/* =========================================
    USER REQUEST WITHDRAWAL
    🔥 FIXED: Pointed to walletController.withdraw 
    This ensures winningBalance is deducted and fresh user data is returned.
========================================= */
router.post(
  "/request",
  protect, // 🔥 FIXED: Changed from authMiddleware to protect
  withdrawLimiter,
  walletController.withdraw // 🔥 Use the fixed controller to deduct money and sync UI
);

/* =========================================
    ADMIN PROCESS WITHDRAWAL
========================================= */
router.post(
  "/process",
  protect, // 🔥 FIXED
  roleMiddleware("ADMIN"),
  async (req, res) => {
    try {
      const { withdrawalId, approve } = req.body;
      const result = await withdrawalService.processWithdrawal(withdrawalId, approve);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/* =========================================
    GET ALL PENDING (ADMIN)
========================================= */
router.get(
  "/pending",
  protect, // 🔥 FIXED
  roleMiddleware("ADMIN"),
  async (req, res) => {
    try {
      const result = await withdrawalService.getPendingWithdrawals();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/* =========================================
    USER WITHDRAWAL HISTORY
========================================= */
router.get("/history", protect, async (req, res) => { // 🔥 FIXED
  try {
    const result = await withdrawalService.getUserWithdrawals(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;