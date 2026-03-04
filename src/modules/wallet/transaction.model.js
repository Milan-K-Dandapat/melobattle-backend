const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true // 🔥 Optimized for fast history retrieval
    },

    type: {
      type: String,
      enum: [
        "DEPOSIT",
        "WITHDRAW",
        "ENTRY_FEE",
        "WIN",
        "REFUND"
      ],
      required: true,
      index: true // 🔥 Optimized for filtering by transaction category
    },

    amount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      // 🔥 UPDATED: Added RESERVED for entry fees currently locked in active battles
      enum: ["PENDING", "SUCCESS", "FAILED", "RESERVED"],
      default: "PENDING",
      index: true // 🔥 Optimized for Admin monitoring of failed/pending payments
    },

    balanceAfter: {
      type: Number,
      default: 0
    },

    referenceId: {
      type: String,
      default: "",
      index: true // 🔥 Fast lookup for battle-specific payouts
    },

    // 🔥 UPDATED: Switched from Razorpay to Cashfree for Melo Battle integration
    cfOrderId: {
      type: String,
      index: true // 🔥 Optimized for payment reconciliation
    },
    
    cfPaymentId: {
      type: String,
      index: true
    },

    failureReason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true // ✅ Auto-manages createdAt and updatedAt
  }
);

/**
 * 🔥 PERFORMANCE MATRIX: COMPOUND INDEX
 * Speeds up the "getUserTransactions" call in wallet.service.js
 */
transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);