const express = require("express");
const router = express.Router();

const walletController = require("./wallet.controller");
// 🔥 Destructure 'protect' to match your auth.middleware.js export
const { protect } = require("../../middleware/auth.middleware");
// 🔥 If roleMiddleware uses module.exports = ..., import it like this:
const roleMiddleware = require("../../middleware/role.middleware");

/* =========================================
    USER TRANSACTIONS (Public/User)
========================================= */

// @route   POST /api/wallet/deposit
router.post("/deposit", protect, walletController.deposit);

// @route   POST /api/wallet/deduct
router.post("/deduct", protect, walletController.deduct);

/**
 * 🔥 CRITICAL SYNC: WITHDRAWAL ROUTE
 * This connects the frontend "Proceed Payout" button to the deduction logic.
 * Without this, your balance will stay at ₹272.
 * @route   POST /api/wallet/withdraw
 */
router.post("/withdraw", protect, walletController.withdraw);

// @route   GET /api/wallet/my-transactions
router.get("/my-transactions", protect, walletController.getMyTransactions);

/* =========================================
    ADMIN TRANSACTIONS
========================================= */

// @route   GET /api/wallet/all-transactions
router.get(
  "/all-transactions",
  protect,
  roleMiddleware("ADMIN"),
  walletController.getAllTransactions
);

module.exports = router;